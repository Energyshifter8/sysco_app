/**
 * Migrates tasks from the pre-review model to the per-assignee status + review
 * model.
 *
 *   assigneeCompleted[uid] === true  →  assigneeStatus[uid] = "done"
 *                                    +  assigneeReview[uid] = { score: task.points, … }
 *   assigneeProgress[uid]  >  0      →  assigneeStatus[uid] = "in_progress"
 *
 * A legacy completion already credited the member under the old flow, so this
 * back-fills the review that records it and never touches `totalPoints`.
 *
 * Usage:
 *   npx tsx scripts/migrate-task-status.ts                 # dry run (default)
 *   npx tsx scripts/migrate-task-status.ts --apply         # write the migration
 *   npx tsx scripts/migrate-task-status.ts --apply --cleanup  # also drop legacy fields
 *
 * Against the emulator, set FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 first.
 * Against production, point GOOGLE_APPLICATION_CREDENTIALS at a service account.
 */
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const APPLY = process.argv.includes("--apply");
const CLEANUP = process.argv.includes("--cleanup");

const LEGACY_REVIEWER = "legacy";
const LEGACY_COMMENT = "Хуучин урсгалаар автоматаар баталгаажсан";

const projectId =
  process.env.FIREBASE_PROJECT_ID ??
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
  (process.env.FIRESTORE_EMULATOR_HOST ? "demo-test" : undefined);

if (!projectId) {
  console.error(
    "Project ID алга. FIREBASE_PROJECT_ID эсвэл NEXT_PUBLIC_FIREBASE_PROJECT_ID тохируулна уу.",
  );
  process.exit(1);
}

initializeApp(
  process.env.FIRESTORE_EMULATOR_HOST
    ? { projectId }
    : { projectId, credential: applicationDefault() },
);

const db = getFirestore();

interface Plan {
  taskId: string;
  title: string;
  status: Record<string, string>;
  reviews: Record<string, unknown>;
  setCreatedByRole: boolean;
}

async function main() {
  console.log(`=== Task status migration (${APPLY ? "APPLY" : "DRY RUN"}) ===`);
  console.log(`project: ${projectId}`);
  if (CLEANUP && !APPLY) {
    console.log("--cleanup нь --apply-гүйгээр ажиллахгүй. Зөвхөн төлөвлөгөө харуулна.\n");
  }
  console.log("");

  const snap = await db.collection("tasks").get();
  const plans: Plan[] = [];
  const orphaned: string[] = [];

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const completed: Record<string, boolean> = data.assigneeCompleted ?? {};
    const progress: Record<string, number> = data.assigneeProgress ?? {};
    const existingStatus: Record<string, string> = data.assigneeStatus ?? {};
    const existingReview: Record<string, unknown> = data.assigneeReview ?? {};
    const points: number = typeof data.points === "number" ? data.points : 0;

    const status: Record<string, string> = {};
    const reviews: Record<string, unknown> = {};

    for (const [uid, isDone] of Object.entries(completed)) {
      if (!isDone) continue;
      if (!existingStatus[uid]) status[uid] = "done";
      if (!existingReview[uid]) {
        reviews[uid] = {
          score: points,
          reviewedBy: LEGACY_REVIEWER,
          reviewedAt: data.createdAt ?? FieldValue.serverTimestamp(),
          comment: LEGACY_COMMENT,
        };
      }
    }

    for (const [uid, value] of Object.entries(progress)) {
      if (completed[uid] === true) continue;
      if (existingStatus[uid] || status[uid]) continue;
      if (typeof value === "number" && value > 0) status[uid] = "in_progress";
    }

    const setCreatedByRole = data.createdByRole === undefined;

    // The old admin "approve" removed the uid from assignedTo, so those awards
    // cannot be reconstructed — there is no ledger entry for them either.
    if (
      (data.status === "completed" || data.status === "approved") &&
      Array.isArray(data.assignedTo) &&
      data.assignedTo.length === 0
    ) {
      orphaned.push(docSnap.id);
    }

    if (Object.keys(status).length || Object.keys(reviews).length || setCreatedByRole) {
      plans.push({
        taskId: docSnap.id,
        title: typeof data.title === "string" ? data.title : "(гарчиггүй)",
        status,
        reviews,
        setCreatedByRole,
      });
    }
  }

  console.log(`Нийт task: ${snap.size}, өөрчлөгдөх: ${plans.length}\n`);

  for (const plan of plans) {
    const doneUids = Object.keys(plan.reviews);
    const progressUids = Object.entries(plan.status)
      .filter(([, value]) => value === "in_progress")
      .map(([uid]) => uid);
    console.log(`· ${plan.taskId} — ${plan.title}`);
    if (doneUids.length) console.log(`    done + legacy review: ${doneUids.join(", ")}`);
    if (progressUids.length) console.log(`    in_progress: ${progressUids.join(", ")}`);
    if (plan.setCreatedByRole) console.log("    createdByRole: admin");
  }

  if (!APPLY) {
    console.log("\nDRY RUN — юу ч бичээгүй. Бичихийн тулд --apply нэмнэ үү.");
    reportOrphans(orphaned);
    return;
  }

  let written = 0;
  for (const plan of plans) {
    const payload: Record<string, unknown> = {};
    if (Object.keys(plan.status).length) payload.assigneeStatus = plan.status;
    if (Object.keys(plan.reviews).length) payload.assigneeReview = plan.reviews;
    if (plan.setCreatedByRole) payload.createdByRole = "admin";
    await db.collection("tasks").doc(plan.taskId).set(payload, { merge: true });
    written += 1;
  }
  console.log(`\n✓ ${written} task шинэчлэгдлээ (оноо өөрчлөгдөөгүй).`);

  if (CLEANUP) {
    let cleaned = 0;
    for (const docSnap of snap.docs) {
      await docSnap.ref.update({
        status: FieldValue.delete(),
        assigneeProgress: FieldValue.delete(),
        assigneeCompleted: FieldValue.delete(),
      });
      cleaned += 1;
    }
    console.log(`✓ ${cleaned} task-аас хуучин талбарууд устлаа.`);
  }

  reportOrphans(orphaned);
}

function reportOrphans(orphaned: string[]) {
  if (orphaned.length === 0) return;
  console.log(
    `\n⚠ ${orphaned.length} task-ийн assignedTo хоосон байна — хуучин "approve" нь uid-г` +
      " устгадаг байсан тул хэн оноо авсныг сэргээх боломжгүй:",
  );
  for (const id of orphaned) console.log(`    ${id}`);
}

main().catch((err) => {
  console.error("\n=== MIGRATION FAILED ===");
  console.error(err);
  process.exit(1);
});

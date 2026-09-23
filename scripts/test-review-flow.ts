/**
 * End-to-end test for the status → review → point-crediting flow.
 * Uses the Firebase Admin SDK (rules bypassed) to verify the transaction logic
 * itself; `scripts/test-rules.ts` covers who is allowed to run it.
 *
 * Usage:  npx tsx scripts/test-review-flow.ts
 */
import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
initializeApp({ projectId: "demo-test" });
const db = getFirestore();

const MEMBER_UID = "test-member-001";
const LEAD_UID = "test-lead-001";
const TASK_ID = "test-task-001";
const TASK_POINTS = 5;

async function seed() {
  await db.collection("users").doc(MEMBER_UID).set({
    uid: MEMBER_UID,
    name: "Test Member",
    email: "member@example.com",
    role: "member",
    team: "dev",
    course: "2",
    major: "computer_science",
    totalPoints: 0,
    createdAt: FieldValue.serverTimestamp(),
  });

  await db.collection("users").doc(LEAD_UID).set({
    uid: LEAD_UID,
    name: "Test Lead",
    email: "lead@example.com",
    role: "lead",
    team: "dev",
    course: "3",
    major: "software_engineering",
    totalPoints: 0,
    createdAt: FieldValue.serverTimestamp(),
  });

  await db
    .collection("tasks")
    .doc(TASK_ID)
    .set({
      title: "Test Task",
      description: "E2E test task",
      points: TASK_POINTS,
      assignedTo: [MEMBER_UID],
      createdBy: LEAD_UID,
      createdByRole: "lead",
      team: "dev",
      createdAt: FieldValue.serverTimestamp(),
      dueDate: new Date(Date.now() + 7 * 24 * 3600 * 1000),
    });

  console.log(`✓ Seeded member (totalPoints=0) and task (points=${TASK_POINTS})`);
}

/** Mirrors setStatus in src/hooks/useTaskActions.ts. */
async function setStatus(next: string) {
  await db.runTransaction(async (tx) => {
    const taskRef = db.collection("tasks").doc(TASK_ID);
    const snap = await tx.get(taskRef);
    if (!snap.exists) throw new Error("Task олдсонгүй");

    const data = snap.data()!;
    if (data.assigneeReview?.[MEMBER_UID]) {
      throw new Error("Үнэлгээ хийгдсэн тул статус солих боломжгүй");
    }
    const from = data.assigneeStatus?.[MEMBER_UID] ?? "pending";
    tx.set(taskRef, { assigneeStatus: { [MEMBER_UID]: next } }, { merge: true });
    tx.set(db.collection("tasks").doc(TASK_ID).collection("activity").doc(), {
      uid: MEMBER_UID,
      actorUid: MEMBER_UID,
      type: "status",
      from,
      to: next,
      at: FieldValue.serverTimestamp(),
    });
  });
}

/** Mirrors reviewAssignee in src/hooks/useTaskActions.ts. */
async function review(score: number) {
  await db.runTransaction(async (tx) => {
    const taskRef = db.collection("tasks").doc(TASK_ID);
    const snap = await tx.get(taskRef);
    if (!snap.exists) throw new Error("Task олдсонгүй");

    const data = snap.data()!;
    if (data.assigneeReview?.[MEMBER_UID]) throw new Error("Аль хэдийн баталгаажсан");
    if ((data.assigneeStatus?.[MEMBER_UID] ?? "pending") !== "done") {
      throw new Error("Гишүүн даалгаврыг дуусгаагүй байна");
    }
    if (!Number.isInteger(score) || score < 0 || score > data.points) {
      throw new Error(`Оноо 0-ээс ${data.points} хооронд бүхэл тоо байх ёстой`);
    }

    tx.set(
      taskRef,
      {
        assigneeReview: {
          [MEMBER_UID]: { score, reviewedBy: LEAD_UID, reviewedAt: new Date() },
        },
        lastReviewedUid: MEMBER_UID,
      },
      { merge: true },
    );
    tx.update(db.collection("users").doc(MEMBER_UID), {
      totalPoints: FieldValue.increment(score),
    });
    tx.set(db.collection("pointsHistory").doc(), {
      uid: MEMBER_UID,
      taskId: TASK_ID,
      points: score,
      reason: "Test Task",
      reviewedBy: LEAD_UID,
      createdAt: FieldValue.serverTimestamp(),
    });
    tx.set(db.collection("tasks").doc(TASK_ID).collection("activity").doc(), {
      uid: MEMBER_UID,
      actorUid: LEAD_UID,
      type: "review",
      score,
      at: FieldValue.serverTimestamp(),
    });
  });
}

async function expectThrows(label: string, fn: () => Promise<unknown>, contains: string) {
  try {
    await fn();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes(contains)) throw new Error(`FAIL: ${label} — unexpected error "${msg}"`);
    console.log(`✓ ${label}`);
    return;
  }
  throw new Error(`FAIL: ${label} — expected a rejection`);
}

async function points(): Promise<number> {
  const snap = await db.collection("users").doc(MEMBER_UID).get();
  return snap.data()!.totalPoints;
}

async function activity() {
  const snap = await db.collection("tasks").doc(TASK_ID).collection("activity").orderBy("at").get();
  return snap.docs.map((d) => d.data());
}

async function cleanup() {
  await db.collection("users").doc(MEMBER_UID).delete();
  await db.collection("users").doc(LEAD_UID).delete();
  const acts = await db.collection("tasks").doc(TASK_ID).collection("activity").get();
  for (const d of acts.docs) await d.ref.delete();
  await db.collection("tasks").doc(TASK_ID).delete();
  const history = await db.collection("pointsHistory").where("uid", "==", MEMBER_UID).get();
  for (const d of history.docs) await d.ref.delete();
  console.log("✓ Cleaned up test data");
}

async function main() {
  console.log("=== Review flow E2E test ===\n");
  await seed();

  await expectThrows(
    "Reviewing before the member is done is rejected",
    () => review(TASK_POINTS),
    "дуусгаагүй",
  );
  if ((await points()) !== 0) throw new Error("FAIL: points moved on a rejected review");

  await setStatus("in_progress");
  await setStatus("done");
  console.log("✓ Member moved pending → in_progress → done (no points yet)");
  if ((await points()) !== 0) throw new Error("FAIL: status changes must not award points");

  const statusLog = await activity();
  console.log(`✓ activity entries after status changes: ${statusLog.length} (expected 2)`);
  if (statusLog.length !== 2) throw new Error(`FAIL: expected 2 activity docs, got ${statusLog.length}`);
  if (statusLog[0].from !== "pending" || statusLog[0].to !== "in_progress") {
    throw new Error(`FAIL: first entry is ${statusLog[0].from} → ${statusLog[0].to}`);
  }
  if (statusLog[1].from !== "in_progress" || statusLog[1].to !== "done") {
    throw new Error(`FAIL: second entry is ${statusLog[1].from} → ${statusLog[1].to}`);
  }
  if (statusLog.some((a) => a.actorUid !== MEMBER_UID || a.type !== "status")) {
    throw new Error("FAIL: status entries have the wrong actor or type");
  }

  await expectThrows("Score above task.points is rejected", () => review(TASK_POINTS + 1), "хооронд");
  await expectThrows("Negative score is rejected", () => review(-1), "хооронд");
  await expectThrows("Fractional score is rejected", () => review(2.5), "хооронд");
  if ((await points()) !== 0) throw new Error("FAIL: points moved on an invalid score");

  await review(4);
  const awarded = await points();
  console.log(`✓ Review awarded points — totalPoints: ${awarded} (expected 4)`);
  if (awarded !== 4) throw new Error(`FAIL: totalPoints is ${awarded}, expected 4`);

  const history = await db.collection("pointsHistory").where("uid", "==", MEMBER_UID).get();
  console.log(`✓ pointsHistory entries: ${history.size} (expected 1)`);
  if (history.size !== 1) throw new Error(`FAIL: expected 1 ledger entry, got ${history.size}`);
  if (history.docs[0].data().reviewedBy !== LEAD_UID) {
    throw new Error("FAIL: ledger entry does not record the reviewer");
  }

  const afterReview = await activity();
  const reviewEntry = afterReview.at(-1);
  console.log(`✓ activity entries after review: ${afterReview.length} (expected 3)`);
  if (afterReview.length !== 3) throw new Error(`FAIL: expected 3 activity docs, got ${afterReview.length}`);
  if (reviewEntry?.type !== "review" || reviewEntry.score !== 4) {
    throw new Error("FAIL: review entry missing or has the wrong score");
  }
  if (reviewEntry.actorUid !== LEAD_UID || reviewEntry.uid !== MEMBER_UID) {
    throw new Error("FAIL: review entry records the wrong people");
  }
  if ("comment" in reviewEntry) {
    throw new Error("FAIL: the review comment must not reach the world-readable log");
  }

  await expectThrows("Second review is rejected", () => review(5), "Аль хэдийн баталгаажсан");
  if ((await points()) !== 4) throw new Error("FAIL: double review changed the total");

  await expectThrows(
    "Status change after review is rejected",
    () => setStatus("in_progress"),
    "Үнэлгээ хийгдсэн",
  );

  await cleanup();
  console.log("\n=== ALL TESTS PASSED ===");
  process.exit(0);
}

main().catch((err) => {
  console.error("\n=== TEST FAILED ===");
  console.error(err);
  process.exit(1);
});

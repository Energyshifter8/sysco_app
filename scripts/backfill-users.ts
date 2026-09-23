/**
 * Creates the missing `users/{uid}` profile for every Firebase Auth account
 * that does not have one.
 *
 * Accounts got into this state because the `users` create rule used to be
 * `allow create: if false`, so sign-up made the Auth user and then had its
 * profile write rejected.
 *
 * The script never touches an existing document — it writes with `create()`,
 * which fails if the document is already there, so a profile can never be
 * overwritten even if the pre-flight check races.
 *
 * Usage:
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
 *   export FIREBASE_PROJECT_ID=your-project-id
 *
 *   pnpm backfill:users              # dry run — lists who would be created
 *   pnpm backfill:users -- --apply   # actually create the profiles
 *
 * Against the emulator, set FIRESTORE_EMULATOR_HOST and FIREBASE_AUTH_EMULATOR_HOST
 * instead of the credentials file.
 */
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import type { UserRecord } from "firebase-admin/auth";
import { Timestamp, getFirestore } from "firebase-admin/firestore";

const APPLY = process.argv.includes("--apply");
const USING_EMULATOR = Boolean(
  process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST,
);

const projectId =
  process.env.FIREBASE_PROJECT_ID ??
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
  (USING_EMULATOR ? "demo-test" : undefined);

if (!projectId) {
  console.error(
    "Project ID алга. FIREBASE_PROJECT_ID эсвэл NEXT_PUBLIC_FIREBASE_PROJECT_ID тохируулна уу.",
  );
  process.exit(1);
}

if (!USING_EMULATOR && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error(
    "GOOGLE_APPLICATION_CREDENTIALS алга. Service account түлхүүрийн замыг зааж өгнө үү.\n" +
      "Түлхүүрийг repo дотор БҮҮ хадгал — .gitignore-д *-service-account.json нэмэгдсэн.",
  );
  process.exit(1);
}

initializeApp(USING_EMULATOR ? { projectId } : { projectId, credential: applicationDefault() });

const auth = getAuth();
const db = getFirestore();

/** Mirrors defaultProfile() in src/context/AuthContext.tsx. */
function defaultName(user: UserRecord): string {
  const displayName = user.displayName?.trim();
  if (displayName) return displayName;
  const local = user.email?.split("@")[0]?.trim();
  return local || "Хэрэглэгч";
}

function createdAtFor(user: UserRecord): Timestamp {
  const raw = user.metadata.creationTime;
  const date = raw ? new Date(raw) : new Date();
  return Timestamp.fromDate(Number.isNaN(date.getTime()) ? new Date() : date);
}

async function listAllAuthUsers(): Promise<UserRecord[]> {
  const users: UserRecord[] = [];
  let pageToken: string | undefined;
  do {
    const page = await auth.listUsers(1000, pageToken);
    users.push(...page.users);
    pageToken = page.pageToken;
  } while (pageToken);
  return users;
}

async function main() {
  console.log(`=== Backfill users (${APPLY ? "APPLY" : "DRY RUN"}) ===`);
  console.log(`project: ${projectId}${USING_EMULATOR ? " (emulator)" : ""}\n`);

  const authUsers = await listAllAuthUsers();
  const profiles = await db.collection("users").get();
  const existing = new Set(profiles.docs.map((d) => d.id));

  const missing = authUsers.filter((u) => !existing.has(u.uid));

  console.log(`Auth хэрэглэгч: ${authUsers.length}`);
  console.log(`Firestore профайл: ${existing.size}`);
  console.log(`Дутуу: ${missing.length}\n`);

  if (missing.length === 0) {
    console.log("Бүх Auth хэрэглэгч профайлтай байна — хийх зүйл алга.");
    return;
  }

  for (const user of missing) {
    console.log(
      `· ${user.uid}  ${user.email ?? "(имэйлгүй)"}  →  name="${defaultName(user)}"` +
        `  createdAt=${user.metadata.creationTime ?? "(одоо)"}`,
    );
  }

  if (!APPLY) {
    console.log("\nDRY RUN — юу ч бичээгүй. Үүсгэхийн тулд --apply нэмнэ үү.");
    return;
  }

  let created = 0;
  let skipped = 0;
  for (const user of missing) {
    try {
      // create() rejects if the document already exists, so an existing profile
      // can never be clobbered — not even if one appeared since the read above.
      await db.collection("users").doc(user.uid).create({
        uid: user.uid,
        name: defaultName(user),
        email: user.email ?? "",
        role: "member",
        course: "",
        major: "",
        totalPoints: 0,
        createdAt: createdAtFor(user),
      });
      created += 1;
    } catch (err) {
      skipped += 1;
      console.error(`  ✗ ${user.uid} — ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log(`\n✓ ${created} профайл үүслээ.${skipped ? `  ✗ ${skipped} алдаа.` : ""}`);
  console.log("Эдгээр хэрэглэгч баг, чиглэлээ профайл хуудсаараа бөглөнө.");
}

main().catch((err) => {
  console.error("\n=== BACKFILL FAILED ===");
  console.error(err);
  process.exit(1);
});

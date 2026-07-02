/**
 * End-to-end test for the self-reported progress → point-crediting flow.
 * Uses Firebase Admin SDK (rules bypassed) to verify transaction logic.
 *
 * Usage:  npx tsx scripts/test-progress-transaction.ts
 */
import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

// Initialize Admin SDK pointing at the emulator
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
initializeApp({ projectId: "demo-test" });
const db = getFirestore();

const TEST_UID = "test-user-001";
const TEST_TASK_ID = "test-task-001";

async function seed() {
  await db.collection("users").doc(TEST_UID).set({
    uid: TEST_UID,
    name: "Test User",
    email: "test@example.com",
    role: "member",
    course: "2",
    major: "computer_science",
    totalPoints: 0,
    createdAt: FieldValue.serverTimestamp(),
  });

  await db
    .collection("tasks")
    .doc(TEST_TASK_ID)
    .set({
      title: "Test Task",
      description: "E2E test task",
      points: 50,
      assignedTo: [TEST_UID],
      status: "active",
      createdBy: "admin-uid",
      createdAt: FieldValue.serverTimestamp(),
      dueDate: FieldValue.serverTimestamp(),
    });

  console.log("✓ Seeded user (totalPoints=0) and task (points=50)");
}

async function runCompletion() {
  await db.runTransaction(async (tx) => {
    const taskRef = db.collection("tasks").doc(TEST_TASK_ID);
    const taskSnap = await tx.get(taskRef);
    if (!taskSnap.exists) throw new Error("Task not found");

    const data = taskSnap.data()!;
    const completed = data.assigneeCompleted?.[TEST_UID] === true;
    if (completed) throw new Error("Already completed");

    tx.set(
      taskRef,
      {
        assigneeProgress: { [TEST_UID]: 100 },
        assigneeCompleted: { [TEST_UID]: true },
      },
      { merge: true },
    );

    const userRef = db.collection("users").doc(TEST_UID);
    tx.update(userRef, {
      totalPoints: FieldValue.increment(50),
    });

    const historyRef = db.collection("pointsHistory").doc();
    tx.set(historyRef, {
      uid: TEST_UID,
      taskId: TEST_TASK_ID,
      points: 50,
      reason: "Test Task",
      createdAt: FieldValue.serverTimestamp(),
    });
  });
}

async function verify() {
  const userSnap = await db.collection("users").doc(TEST_UID).get();
  const pts = userSnap.data()!.totalPoints;

  const historySnap = await db.collection("pointsHistory").where("uid", "==", TEST_UID).get();

  console.log(`  totalPoints: ${pts} (expected 50)`);
  console.log(`  pointsHistory docs: ${historySnap.size} (expected 1)`);
  if (pts !== 50) throw new Error(`FAIL: totalPoints is ${pts}, expected 50`);
  if (historySnap.size !== 1)
    throw new Error(`FAIL: expected 1 history doc, got ${historySnap.size}`);

  const taskSnap = await db.collection("tasks").doc(TEST_TASK_ID).get();
  const taskData = taskSnap.data()!;
  const progress = taskData.assigneeProgress?.[TEST_UID];
  const completed = taskData.assigneeCompleted?.[TEST_UID];
  console.log(`  task assigneeProgress[uid]: ${progress} (expected 100)`);
  console.log(`  task assigneeCompleted[uid]: ${completed} (expected true)`);
  if (progress !== 100) throw new Error(`FAIL: progress is ${progress}`);
  if (completed !== true) throw new Error(`FAIL: completed is ${completed}`);

  console.log("✓ First completion: points awarded correctly");
}

async function verifyIdempotency() {
  try {
    await runCompletion();
    throw new Error("FAIL: transaction should have been aborted");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Already completed")) {
      console.log("✓ Idempotency guard: double-credit blocked");
    } else {
      throw err;
    }
  }

  const userSnap = await db.collection("users").doc(TEST_UID).get();
  const pts = userSnap.data()!.totalPoints;
  console.log(`  totalPoints after retry: ${pts} (still 50)`);
  if (pts !== 50) throw new Error(`FAIL: totalPoints drifted to ${pts}`);
}

async function cleanup() {
  await db.collection("users").doc(TEST_UID).delete();
  await db.collection("tasks").doc(TEST_TASK_ID).delete();
  const snap = await db.collection("pointsHistory").where("uid", "==", TEST_UID).get();
  for (const d of snap.docs) await d.ref.delete();
  console.log("✓ Cleaned up test data");
}

async function main() {
  console.log("=== Progress Transaction E2E Test ===\n");
  await seed();
  await runCompletion();
  await verify();
  console.log("");
  await verifyIdempotency();
  await cleanup();
  console.log("\n=== ALL TESTS PASSED ===");
  process.exit(0);
}

main().catch((err) => {
  console.error("\n=== TEST FAILED ===");
  console.error(err);
  process.exit(1);
});

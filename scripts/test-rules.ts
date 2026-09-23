/**
 * Security-rules tests for the role / status / review model.
 *
 * Usage:
 *   firebase emulators:start --only firestore     # in another terminal
 *   npx tsx scripts/test-rules.ts
 */
import {
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, setDoc, setLogLevel, updateDoc } from "firebase/firestore";
import { readFileSync } from "node:fs";

const HOST = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";
const [host, port] = HOST.split(":");

const ADMIN = "uid-admin";
const LEAD_DEV = "uid-lead-dev";
const LEAD_OPS = "uid-lead-ops";
const MEMBER_DEV = "uid-member-dev";
const MEMBER_DEV_2 = "uid-member-dev-2";
const MEMBER_OPS = "uid-member-ops";

let testEnv: RulesTestEnvironment;
let passed = 0;
let failed = 0;

async function it(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed += 1;
    console.log(`  ✗ ${name}`);
    console.log(`      ${err instanceof Error ? err.message : String(err)}`);
  }
}

function describe(name: string) {
  console.log(`\n${name}`);
}

/** Baseline data, re-seeded before each test so cases cannot leak into each other. */
async function seed() {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users", ADMIN), {
      uid: ADMIN,
      name: "Admin",
      email: "admin@test.mn",
      role: "admin",
      course: "4",
      major: "computer_science",
      totalPoints: 0,
    });
    await setDoc(doc(db, "users", LEAD_DEV), {
      uid: LEAD_DEV,
      name: "Dev Lead",
      email: "devlead@test.mn",
      role: "lead",
      team: "dev",
      course: "3",
      major: "software_engineering",
      totalPoints: 0,
    });
    await setDoc(doc(db, "users", LEAD_OPS), {
      uid: LEAD_OPS,
      name: "Ops Lead",
      email: "opslead@test.mn",
      role: "lead",
      team: "ops",
      course: "3",
      major: "information_systems",
      totalPoints: 0,
    });
    for (const [uid, team, name] of [
      [MEMBER_DEV, "dev", "Dev Member"],
      [MEMBER_DEV_2, "dev", "Dev Member 2"],
      [MEMBER_OPS, "ops", "Ops Member"],
    ] as const) {
      await setDoc(doc(db, "users", uid), {
        uid,
        name,
        email: `${uid}@test.mn`,
        role: "member",
        team,
        course: "2",
        major: "computer_science",
        totalPoints: 0,
      });
    }

    const base = {
      title: "Test task",
      description: "",
      points: 5,
      createdBy: ADMIN,
      createdByRole: "admin",
      createdAt: new Date(),
      dueDate: new Date(Date.now() + 7 * 24 * 3600 * 1000),
    };
    await setDoc(doc(db, "tasks", "task-uid"), { ...base, assignedTo: [MEMBER_DEV, MEMBER_DEV_2] });
    await setDoc(doc(db, "tasks", "task-all"), { ...base, assignedTo: ["all"] });
    await setDoc(doc(db, "tasks", "task-team"), { ...base, assignedTo: ["team:dev"] });
    await setDoc(doc(db, "tasks", "task-done"), {
      ...base,
      assignedTo: [MEMBER_DEV, MEMBER_OPS],
      assigneeStatus: { [MEMBER_DEV]: "done", [MEMBER_OPS]: "done" },
    });
    await setDoc(doc(db, "tasks", "task-lead-done"), {
      ...base,
      assignedTo: [LEAD_DEV],
      assigneeStatus: { [LEAD_DEV]: "done" },
    });
  });
}

function db(uid: string) {
  // The users create rule compares the written email against the token, so the
  // test contexts carry the same email the seeded profiles use.
  return testEnv.authenticatedContext(uid, { email: `${uid}@test.mn` }).firestore();
}

/** Exactly the document useAuthActions.signup() writes. */
function signupDoc(uid: string, overrides: Record<string, unknown> = {}) {
  return {
    uid,
    name: "Шинэ хэрэглэгч",
    email: `${uid}@test.mn`,
    role: "member",
    course: "",
    major: "",
    totalPoints: 0,
    createdAt: new Date(),
    ...overrides,
  };
}

/** The write a reviewer makes: the review map entry plus the declared target. */
function reviewWrite(uid: string, reviewer: string, score: number) {
  return {
    assigneeReview: { [uid]: { score, reviewedBy: reviewer, reviewedAt: new Date() } },
    lastReviewedUid: uid,
  };
}

async function main() {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-rules-test",
    firestore: {
      host,
      port: Number(port),
      rules: readFileSync("firestore.rules", "utf8"),
    },
  });

  // The SDK logs every expected PERMISSION_DENIED at error level otherwise.
  setLogLevel("silent");

  console.log("=== Firestore rules tests ===");

  describe("Member status");

  await seed();
  await it("гишүүн өөрийн статусаа сольж чадна", async () => {
    await assertSucceeds(
      setDoc(
        doc(db(MEMBER_DEV), "tasks", "task-uid"),
        { assigneeStatus: { [MEMBER_DEV]: "in_progress" } },
        { merge: true },
      ),
    );
  });

  await seed();
  await it("гишүүн бусдын статусыг сольж чадахгүй", async () => {
    await assertFails(
      setDoc(
        doc(db(MEMBER_DEV), "tasks", "task-uid"),
        { assigneeStatus: { [MEMBER_DEV_2]: "done" } },
        { merge: true },
      ),
    );
  });

  await seed();
  await it('"all" оноолттой task дээр статусаа сольж чадна', async () => {
    await assertSucceeds(
      setDoc(
        doc(db(MEMBER_OPS), "tasks", "task-all"),
        { assigneeStatus: { [MEMBER_OPS]: "done" } },
        { merge: true },
      ),
    );
  });

  await seed();
  await it('"team:dev" оноолттой task дээр dev гишүүн статусаа сольж чадна', async () => {
    await assertSucceeds(
      setDoc(
        doc(db(MEMBER_DEV), "tasks", "task-team"),
        { assigneeStatus: { [MEMBER_DEV]: "done" } },
        { merge: true },
      ),
    );
  });

  await seed();
  await it('"team:dev" task дээр ops гишүүн статус бичиж чадахгүй', async () => {
    await assertFails(
      setDoc(
        doc(db(MEMBER_OPS), "tasks", "task-team"),
        { assigneeStatus: { [MEMBER_OPS]: "done" } },
        { merge: true },
      ),
    );
  });

  await seed();
  await it("буруу статусын утга унана", async () => {
    await assertFails(
      setDoc(
        doc(db(MEMBER_DEV), "tasks", "task-uid"),
        { assigneeStatus: { [MEMBER_DEV]: "approved" } },
        { merge: true },
      ),
    );
  });

  describe("Member cannot award points");

  await seed();
  await it("гишүүн assigneeReview бичиж чадахгүй", async () => {
    await assertFails(
      setDoc(
        doc(db(MEMBER_DEV), "tasks", "task-done"),
        reviewWrite(MEMBER_DEV, MEMBER_DEV, 5),
        { merge: true },
      ),
    );
  });

  await seed();
  await it("гишүүн өөрийн totalPoints-ийг өөрчилж чадахгүй", async () => {
    await assertFails(updateDoc(doc(db(MEMBER_DEV), "users", MEMBER_DEV), { totalPoints: 999 }));
  });

  await seed();
  await it("гишүүн өөрийн role-оо өөрчилж чадахгүй", async () => {
    await assertFails(updateDoc(doc(db(MEMBER_DEV), "users", MEMBER_DEV), { role: "admin" }));
  });

  await seed();
  await it("гишүүн профайлаа засаж чадна", async () => {
    await assertSucceeds(
      updateDoc(doc(db(MEMBER_DEV), "users", MEMBER_DEV), { major: "data_science" }),
    );
  });

  await seed();
  await it("гишүүн pointsHistory-д өөрөө бичиж чадахгүй", async () => {
    await assertFails(
      setDoc(doc(db(MEMBER_DEV), "pointsHistory", "h1"), {
        uid: MEMBER_DEV,
        taskId: "task-done",
        points: 5,
        reason: "x",
        reviewedBy: MEMBER_DEV,
        createdAt: new Date(),
      }),
    );
  });

  describe("Review");

  await seed();
  await it("lead өөрийн багийн гишүүнийг үнэлж чадна", async () => {
    await assertSucceeds(
      setDoc(doc(db(LEAD_DEV), "tasks", "task-done"), reviewWrite(MEMBER_DEV, LEAD_DEV, 4), {
        merge: true,
      }),
    );
  });

  await seed();
  await it("lead өөр багийн гишүүнийг үнэлж чадахгүй", async () => {
    await assertFails(
      setDoc(doc(db(LEAD_DEV), "tasks", "task-done"), reviewWrite(MEMBER_OPS, LEAD_DEV, 4), {
        merge: true,
      }),
    );
  });

  await seed();
  await it("lead өөрийгөө үнэлж чадахгүй", async () => {
    await assertFails(
      setDoc(doc(db(LEAD_DEV), "tasks", "task-lead-done"), reviewWrite(LEAD_DEV, LEAD_DEV, 5), {
        merge: true,
      }),
    );
  });

  await seed();
  await it("admin lead-ийг үнэлж чадна", async () => {
    await assertSucceeds(
      setDoc(doc(db(ADMIN), "tasks", "task-lead-done"), reviewWrite(LEAD_DEV, ADMIN, 5), {
        merge: true,
      }),
    );
  });

  await seed();
  await it("хоёр дахь үнэлгээ унана", async () => {
    await assertSucceeds(
      setDoc(doc(db(LEAD_DEV), "tasks", "task-done"), reviewWrite(MEMBER_DEV, LEAD_DEV, 4), {
        merge: true,
      }),
    );
    await assertFails(
      setDoc(doc(db(LEAD_DEV), "tasks", "task-done"), reviewWrite(MEMBER_DEV, LEAD_DEV, 5), {
        merge: true,
      }),
    );
  });

  await seed();
  await it("score > task.points бол унана", async () => {
    await assertFails(
      setDoc(doc(db(LEAD_DEV), "tasks", "task-done"), reviewWrite(MEMBER_DEV, LEAD_DEV, 6), {
        merge: true,
      }),
    );
  });

  await seed();
  await it("сөрөг score унана", async () => {
    await assertFails(
      setDoc(doc(db(LEAD_DEV), "tasks", "task-done"), reviewWrite(MEMBER_DEV, LEAD_DEV, -1), {
        merge: true,
      }),
    );
  });

  await seed();
  await it("бутархай score унана", async () => {
    await assertFails(
      setDoc(doc(db(LEAD_DEV), "tasks", "task-done"), reviewWrite(MEMBER_DEV, LEAD_DEV, 2.5), {
        merge: true,
      }),
    );
  });

  await seed();
  await it('статус "done" биш бол үнэлгээ унана', async () => {
    await assertFails(
      setDoc(doc(db(LEAD_DEV), "tasks", "task-uid"), reviewWrite(MEMBER_DEV, LEAD_DEV, 3), {
        merge: true,
      }),
    );
  });

  await seed();
  await it("lastReviewedUid нь бодит diff-тэй таарахгүй бол унана", async () => {
    await assertFails(
      setDoc(
        doc(db(LEAD_DEV), "tasks", "task-done"),
        {
          assigneeReview: {
            [MEMBER_OPS]: { score: 5, reviewedBy: LEAD_DEV, reviewedAt: new Date() },
          },
          lastReviewedUid: MEMBER_DEV,
        },
        { merge: true },
      ),
    );
  });

  await seed();
  await it("reviewedBy нь бичиж буй хүн биш бол унана", async () => {
    await assertFails(
      setDoc(doc(db(LEAD_DEV), "tasks", "task-done"), reviewWrite(MEMBER_DEV, ADMIN, 4), {
        merge: true,
      }),
    );
  });

  await seed();
  await it("үнэлгээний дараа гишүүн статусаа сольж чадахгүй", async () => {
    await assertSucceeds(
      setDoc(doc(db(LEAD_DEV), "tasks", "task-done"), reviewWrite(MEMBER_DEV, LEAD_DEV, 4), {
        merge: true,
      }),
    );
    await assertFails(
      setDoc(
        doc(db(MEMBER_DEV), "tasks", "task-done"),
        { assigneeStatus: { [MEMBER_DEV]: "in_progress" } },
        { merge: true },
      ),
    );
  });

  describe("Points ledger");

  await seed();
  await it("lead багийнхаа гишүүний totalPoints-ийг нэмж чадна", async () => {
    await assertSucceeds(updateDoc(doc(db(LEAD_DEV), "users", MEMBER_DEV), { totalPoints: 4 }));
  });

  await seed();
  await it("lead өөр багийн totalPoints-ийг өөрчилж чадахгүй", async () => {
    await assertFails(updateDoc(doc(db(LEAD_DEV), "users", MEMBER_OPS), { totalPoints: 4 }));
  });

  await seed();
  await it("lead өөрийн totalPoints-ийг өөрчилж чадахгүй", async () => {
    await assertFails(updateDoc(doc(db(LEAD_DEV), "users", LEAD_DEV), { totalPoints: 99 }));
  });

  await seed();
  await it("lead багийнхаа гишүүнд pointsHistory бичиж чадна", async () => {
    await assertSucceeds(
      setDoc(doc(db(LEAD_DEV), "pointsHistory", "h1"), {
        uid: MEMBER_DEV,
        taskId: "task-done",
        points: 4,
        reason: "Test task",
        reviewedBy: LEAD_DEV,
        createdAt: new Date(),
      }),
    );
  });

  await seed();
  await it("pointsHistory устгах боломжгүй", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "pointsHistory", "h1"), {
        uid: MEMBER_DEV,
        taskId: "task-done",
        points: 4,
        reason: "Test task",
        reviewedBy: LEAD_DEV,
        createdAt: new Date(),
      });
    });
    await assertFails(updateDoc(doc(db(ADMIN), "pointsHistory", "h1"), { points: 0 }));
  });

  describe("Task creation");

  const newTask = (overrides: Record<string, unknown>) => ({
    title: "New",
    description: "",
    points: 3,
    createdAt: new Date(),
    dueDate: new Date(Date.now() + 86_400_000),
    ...overrides,
  });

  await seed();
  await it("lead өөрийн багт task үүсгэж чадна", async () => {
    await assertSucceeds(
      setDoc(
        doc(db(LEAD_DEV), "tasks", "new-1"),
        newTask({
          assignedTo: [MEMBER_DEV],
          team: "dev",
          createdBy: LEAD_DEV,
          createdByRole: "lead",
        }),
      ),
    );
  });

  await seed();
  await it('lead "all" оноолттой task үүсгэж чадахгүй', async () => {
    await assertFails(
      setDoc(
        doc(db(LEAD_DEV), "tasks", "new-2"),
        newTask({ assignedTo: ["all"], team: "dev", createdBy: LEAD_DEV, createdByRole: "lead" }),
      ),
    );
  });

  await seed();
  await it("lead өөр багийн team токен ашиглаж чадахгүй", async () => {
    await assertFails(
      setDoc(
        doc(db(LEAD_DEV), "tasks", "new-3"),
        newTask({
          assignedTo: ["team:ops"],
          team: "dev",
          createdBy: LEAD_DEV,
          createdByRole: "lead",
        }),
      ),
    );
  });

  await seed();
  await it("lead өөр багийн нэрээр task үүсгэж чадахгүй", async () => {
    await assertFails(
      setDoc(
        doc(db(LEAD_DEV), "tasks", "new-4"),
        newTask({
          assignedTo: [MEMBER_OPS],
          team: "ops",
          createdBy: LEAD_DEV,
          createdByRole: "lead",
        }),
      ),
    );
  });

  await seed();
  await it("гишүүн task үүсгэж чадахгүй", async () => {
    await assertFails(
      setDoc(
        doc(db(MEMBER_DEV), "tasks", "new-5"),
        newTask({ assignedTo: [MEMBER_DEV], createdBy: MEMBER_DEV, createdByRole: "member" }),
      ),
    );
  });

  await seed();
  await it("lead өөрийн үүсгээгүй task-ийг устгаж чадахгүй", async () => {
    await assertFails(deleteDoc(doc(db(LEAD_DEV), "tasks", "task-uid")));
  });

  await seed();
  await it("lead өөрийн үүсгэсэн task-ийг устгаж чадна", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "tasks", "lead-owned"), {
        title: "Lead owned",
        description: "",
        points: 3,
        assignedTo: [MEMBER_DEV],
        team: "dev",
        createdBy: LEAD_DEV,
        createdByRole: "lead",
        createdAt: new Date(),
      });
    });
    await assertSucceeds(deleteDoc(doc(db(LEAD_DEV), "tasks", "lead-owned")));
  });

  describe("Sign-up");

  await seed();
  await it("шинэ хэрэглэгч member-ээр бүртгүүлж чадна", async () => {
    await assertSucceeds(setDoc(doc(db("uid-new"), "users", "uid-new"), signupDoc("uid-new")));
  });

  await seed();
  await it("шинэ хэрэглэгч admin-аар бүртгүүлж чадахгүй", async () => {
    await assertFails(
      setDoc(doc(db("uid-new"), "users", "uid-new"), signupDoc("uid-new", { role: "admin" })),
    );
  });

  await seed();
  await it("шинэ хэрэглэгч lead-ээр бүртгүүлж чадахгүй", async () => {
    await assertFails(
      setDoc(
        doc(db("uid-new"), "users", "uid-new"),
        signupDoc("uid-new", { role: "lead", team: "dev" }),
      ),
    );
  });

  await seed();
  await it("шинэ хэрэглэгч оноотой бүртгүүлж чадахгүй", async () => {
    await assertFails(
      setDoc(doc(db("uid-new"), "users", "uid-new"), signupDoc("uid-new", { totalPoints: 500 })),
    );
  });

  await seed();
  await it("хэрэглэгч өөр хүний баримт үүсгэж чадахгүй", async () => {
    await assertFails(
      setDoc(doc(db("uid-new"), "users", "uid-other"), signupDoc("uid-other")),
    );
  });

  await seed();
  await it("өөр имэйлээр бүртгүүлж чадахгүй", async () => {
    await assertFails(
      setDoc(
        doc(db("uid-new"), "users", "uid-new"),
        signupDoc("uid-new", { email: "someone-else@test.mn" }),
      ),
    );
  });

  await seed();
  await it("зөвшөөрөгдөөгүй талбартай бол унана", async () => {
    await assertFails(
      setDoc(
        doc(db("uid-new"), "users", "uid-new"),
        signupDoc("uid-new", { isSuperUser: true }),
      ),
    );
  });

  await seed();
  await it("team-гүйгээр бүртгүүлж чадна", async () => {
    const { team, ...withoutTeam } = signupDoc("uid-new") as Record<string, unknown>;
    void team;
    await assertSucceeds(setDoc(doc(db("uid-new"), "users", "uid-new"), withoutTeam));
  });

  await seed();
  await it("баримтгүй Auth хэрэглэгч нэвтрэхэд профайлаа үүсгэж чадна (self-heal)", async () => {
    // AuthContext writes the same shape when getDoc comes back empty.
    await assertSucceeds(
      setDoc(doc(db("uid-orphan"), "users", "uid-orphan"), signupDoc("uid-orphan")),
    );
  });

  await seed();
  await it("бүртгүүлсний дараа role-оо өөрчилж чадахгүй", async () => {
    await assertSucceeds(setDoc(doc(db("uid-new"), "users", "uid-new"), signupDoc("uid-new")));
    await assertFails(updateDoc(doc(db("uid-new"), "users", "uid-new"), { role: "admin" }));
  });

  describe("Attendance");

  await seed();
  await it("admin ирц бүртгэж чадна", async () => {
    await assertSucceeds(
      setDoc(doc(db(ADMIN), "attendance", "2026-01-01_x"), {
        id: "2026-01-01_x",
        uid: MEMBER_DEV,
        date: "2026-01-01",
        status: "present",
        markedBy: ADMIN,
        note: "",
      }),
    );
  });

  await seed();
  await it("lead ирц бүртгэж чадахгүй", async () => {
    await assertFails(
      setDoc(doc(db(LEAD_DEV), "attendance", "2026-01-01_y"), {
        id: "2026-01-01_y",
        uid: MEMBER_DEV,
        date: "2026-01-01",
        status: "present",
        markedBy: LEAD_DEV,
        note: "",
      }),
    );
  });

  await seed();
  await it("гишүүн ирцийг уншиж чадна", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "attendance", "2026-01-01_z"), {
        id: "2026-01-01_z",
        uid: MEMBER_DEV,
        date: "2026-01-01",
        status: "present",
        markedBy: ADMIN,
        note: "",
      });
    });
    await assertSucceeds(getDoc(doc(db(MEMBER_DEV), "attendance", "2026-01-01_z")));
  });

  await testEnv.cleanup();

  console.log(`\n=== ${passed} passed, ${failed} failed ===`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("\n=== TEST RUN FAILED ===");
  console.error(err);
  process.exit(1);
});

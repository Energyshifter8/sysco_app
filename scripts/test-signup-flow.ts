/**
 * End-to-end test for sign-up, rollback and the AuthContext self-heal, run with
 * the real client SDK against the Auth + Firestore emulators so the security
 * rules are actually enforced.
 *
 * The write bodies mirror `signup()` in src/hooks/useAuthActions.ts and
 * `defaultProfile()` in src/context/AuthContext.tsx.
 *
 * Usage:
 *   firebase emulators:start --only firestore,auth    # in another terminal
 *   npx tsx scripts/test-signup-flow.ts
 */
import { initializeApp } from "firebase/app";
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  connectFirestoreEmulator,
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
  setLogLevel,
} from "firebase/firestore";

const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099";
const [FS_HOST, FS_PORT] = (process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080").split(":");

const app = initializeApp({ projectId: "demo-signup-test", apiKey: "fake-api-key" });
const auth = getAuth(app);
connectAuthEmulator(auth, `http://${AUTH_HOST}`, { disableWarnings: true });
const db = getFirestore(app);
connectFirestoreEmulator(db, FS_HOST, Number(FS_PORT));
setLogLevel("silent");

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

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

/** The profile body written by signup() and by the AuthContext self-heal. */
function profileFor(uid: string, email: string, name: string, overrides = {}) {
  return {
    uid,
    name,
    email,
    role: "member",
    course: "",
    major: "",
    totalPoints: 0,
    createdAt: serverTimestamp(),
    ...overrides,
  };
}

let counter = 0;
function freshEmail() {
  counter += 1;
  return `signup-${Date.now()}-${counter}@test.mn`;
}

async function main() {
  console.log("=== Sign-up flow E2E test ===\n");

  await it("signup creates the Auth account and its Firestore profile", async () => {
    const email = freshEmail();
    const cred = await createUserWithEmailAndPassword(auth, email, "password123");
    await setDoc(doc(db, "users", cred.user.uid), profileFor(cred.user.uid, email, "Тест Хэрэглэгч"));

    const snap = await getDoc(doc(db, "users", cred.user.uid));
    assert(snap.exists(), "users document was not created");
    assert(snap.data()?.role === "member", "role is not member");
    assert(snap.data()?.totalPoints === 0, "totalPoints is not 0");
    assert(snap.data()?.team === undefined, "team should be omitted, not blank");

    await deleteUser(cred.user);
  });

  await it("signup as admin is rejected and the Auth account is rolled back", async () => {
    const email = freshEmail();
    const cred = await createUserWithEmailAndPassword(auth, email, "password123");
    const uid = cred.user.uid;

    let denied = false;
    try {
      await setDoc(
        doc(db, "users", uid),
        profileFor(uid, email, "Сэжигтэй", { role: "admin" }),
      );
    } catch {
      denied = true;
      // This is the rollback in useAuthActions.signup().
      await deleteUser(cred.user);
    }

    assert(denied, "writing role: admin should have been denied");
    await signOut(auth);

    // The rolled-back address is free again, which is the point of the rollback.
    const retry = await createUserWithEmailAndPassword(auth, email, "password123");
    assert(retry.user.uid !== "", "the email was left locked by a half-registration");
    await deleteUser(retry.user);
  });

  await it("signup with pre-loaded points is rejected", async () => {
    const email = freshEmail();
    const cred = await createUserWithEmailAndPassword(auth, email, "password123");
    let denied = false;
    try {
      await setDoc(doc(db, "users", cred.user.uid), profileFor(cred.user.uid, email, "X", { totalPoints: 999 }));
    } catch {
      denied = true;
    }
    assert(denied, "writing totalPoints: 999 should have been denied");
    await deleteUser(cred.user);
  });

  await it("signup under someone else's uid is rejected", async () => {
    const email = freshEmail();
    const cred = await createUserWithEmailAndPassword(auth, email, "password123");
    let denied = false;
    try {
      await setDoc(doc(db, "users", "not-my-uid"), profileFor("not-my-uid", email, "X"));
    } catch {
      denied = true;
    }
    assert(denied, "writing another uid's document should have been denied");
    await deleteUser(cred.user);
  });

  await it("an Auth user with no profile self-heals on the next sign-in", async () => {
    // Reproduce the reported state: the account exists, the profile does not.
    const email = freshEmail();
    const cred = await createUserWithEmailAndPassword(auth, email, "password123");
    const uid = cred.user.uid;
    await signOut(auth);

    const signedIn = await signInWithEmailAndPassword(auth, email, "password123");
    const before = await getDoc(doc(db, "users", uid));
    assert(!before.exists(), "precondition failed: the profile already existed");

    // This is what AuthContext does when getDoc comes back empty.
    const fallbackName = signedIn.user.displayName?.trim() || email.split("@")[0];
    await setDoc(doc(db, "users", uid), profileFor(uid, email, fallbackName));

    const after = await getDoc(doc(db, "users", uid));
    assert(after.exists(), "self-heal did not create the profile");
    assert(after.data()?.name === fallbackName, "self-heal used the wrong default name");
    assert(after.data()?.role === "member", "self-heal did not default to member");

    await deleteUser(signedIn.user);
  });

  await signOut(auth).catch(() => {});

  console.log(`\n=== ${passed} passed, ${failed} failed ===`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("\n=== TEST RUN FAILED ===");
  console.error(err);
  process.exit(1);
});

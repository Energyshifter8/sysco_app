"use client";

import { auth, db } from "@/lib/firebase";
import { User } from "@/types";
import { User as FirebaseUser, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

interface AuthContextValue {
  user: FirebaseUser | null;
  userData: User | null;
  loading: boolean;
  /** Set when the profile could not be read or created — never left loading. */
  error: string | null;
  /** True once the profile is loaded but still missing a team or a major. */
  profileIncomplete: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  userData: null,
  loading: true,
  error: null,
  profileIncomplete: false,
});

export function useAuth() {
  return useContext(AuthContext);
}

/** Falls back to the local part of the email when the account has no display name. */
function defaultName(firebaseUser: FirebaseUser): string {
  const displayName = firebaseUser.displayName?.trim();
  if (displayName) return displayName;
  const local = firebaseUser.email?.split("@")[0]?.trim();
  return local || "Хэрэглэгч";
}

/**
 * The profile a signed-in account gets when Firestore has none for it.
 *
 * Shape and values must satisfy the `users` create rule: own uid, own verified
 * email, role `member`, zero points, and no keys outside the allowlist. `team`
 * is omitted rather than blanked, since "" is not a valid team.
 */
function defaultProfile(firebaseUser: FirebaseUser): User {
  return {
    uid: firebaseUser.uid,
    name: defaultName(firebaseUser),
    email: firebaseUser.email ?? "",
    role: "member",
    course: "",
    major: "",
    totalPoints: 0,
    createdAt: new Date(),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setError(null);

      if (!firebaseUser) {
        setUserData(null);
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, "users", firebaseUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setUserData(docSnap.data() as User);
        } else {
          // Self-heal: accounts that predate the fixed create rule exist in
          // Auth with no Firestore profile. Rather than stranding them, give
          // them the default profile on their next sign-in.
          console.warn(`users/${firebaseUser.uid} алга байна — анхдагч профайл үүсгэж байна`);
          const profile = defaultProfile(firebaseUser);
          await setDoc(docRef, { ...profile, createdAt: serverTimestamp() });
          setUserData(profile);
        }
      } catch (err) {
        console.error("Профайлыг ачаалахад алдаа гарлаа", err);
        setUserData(null);
        setError("Профайлыг ачаалж чадсангүй. Хуудсыг дахин ачаална уу");
      } finally {
        // Always released, so a failure surfaces as a message rather than a
        // spinner that never stops.
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const profileIncomplete = userData !== null && (!userData.team || !userData.major);

  // Every screen reads this context, so a fresh object each render would push a
  // re-render through the whole tree for nothing.
  const value = useMemo(
    () => ({ user, userData, loading, error, profileIncomplete }),
    [user, userData, loading, error, profileIncomplete],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

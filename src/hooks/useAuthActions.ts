"use client";

import { auth, db } from "@/lib/firebase";
import {
  type User as FirebaseUser,
  createUserWithEmailAndPassword,
  deleteUser,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useState } from "react";

export function useAuthActions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function login(email: string, password: string) {
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? mapFirebaseError(err.message) : "Нэвтрэхэд алдаа гарлаа";
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Creates the Auth account and its Firestore profile as one unit.
   *
   * These are two separate systems, and the profile write is the one that can
   * be rejected (by the security rules) after the account already exists. When
   * that happens the Auth user is deleted again, because an account with no
   * profile is worse than no account: the person can sign in, sees an empty
   * app, and cannot sign up again with the same address.
   */
  async function signup(email: string, password: string, name: string) {
    setLoading(true);
    setError(null);

    let createdUser: FirebaseUser | null = null;
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      createdUser = cred.user;

      // Every value is concrete — Firestore rejects `undefined`, and the rules
      // only accept keys from this allowlist. `team` is left out entirely
      // rather than written as a placeholder that is not a valid Team.
      await setDoc(doc(db, "users", cred.user.uid), {
        uid: cred.user.uid,
        name,
        email: cred.user.email ?? email,
        role: "member",
        course: "",
        major: "",
        totalPoints: 0,
        createdAt: serverTimestamp(),
      });
    } catch (err: unknown) {
      console.error("Бүртгүүлэхэд алдаа гарлаа", err);

      if (createdUser) {
        try {
          await deleteUser(createdUser);
        } catch (rollbackErr) {
          // Non-fatal: the account survives without a profile, but AuthContext
          // re-creates the missing profile on the next sign-in.
          console.error("Хагас үүссэн бүртгэлийг буцаахад алдаа гарлаа", rollbackErr);
        }
      }

      const message =
        err instanceof Error ? mapFirebaseError(err.message) : "Бүртгүүлэхэд алдаа гарлаа";
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    setLoading(true);
    setError(null);
    try {
      await signOut(auth);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Гарахад алдаа гарлаа";
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }

  return { login, signup, logout, loading, error };
}

function mapFirebaseError(message: string): string {
  if (
    message.includes("invalid-credential") ||
    message.includes("wrong-password") ||
    message.includes("user-not-found")
  ) {
    return "Имэйл эсвэл нууц үг буруу байна";
  }
  if (message.includes("email-already-in-use")) {
    return "Имэйл аль хэдийн бүртгэгдсэн байна";
  }
  if (message.includes("weak-password")) {
    return "Нууц үг хамгийн багадаа 6 тэмдэгт байх ёстой";
  }
  if (message.includes("invalid-email")) {
    return "Имэйл хаяг буруу байна";
  }
  if (message.includes("permission-denied") || message.includes("insufficient permissions")) {
    return "Профайл үүсгэх эрх алга байна. Админд хандана уу";
  }
  if (message.includes("unavailable") || message.includes("network-request-failed")) {
    return "Сүлжээний алдаа. Дахин оролдоно уу";
  }
  if (message.includes("deadline-exceeded")) {
    return "Хүсэлт хэт удлаа. Дахин оролдоно уу";
  }
  if (message.includes("too-many-requests")) {
    return "Хэт олон оролдлого хийлээ. Түр хүлээгээд дахин оролдоно уу";
  }
  if (message.includes("unauthenticated")) {
    return "Нэвтрэх эрх дууссан байна. Дахин нэвтэрнэ үү";
  }
  return message;
}

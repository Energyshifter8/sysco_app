"use client";

import { auth, db } from "@/lib/firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
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

  async function signup(email: string, password: string, name: string) {
    setLoading(true);
    setError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users", cred.user.uid), {
        uid: cred.user.uid,
        name,
        email,
        role: "member",
        course: "",
        totalPoints: 0,
        createdAt: serverTimestamp(),
      });
    } catch (err: unknown) {
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
  return message;
}

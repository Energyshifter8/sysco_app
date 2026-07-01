"use client";

import { useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

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
        err instanceof Error ? mapFirebaseError(err.message) : "Login failed";
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
        err instanceof Error
          ? mapFirebaseError(err.message)
          : "Signup failed";
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
      const message =
        err instanceof Error ? err.message : "Logout failed";
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }

  return { login, signup, logout, loading, error };
}

function mapFirebaseError(message: string): string {
  if (message.includes("invalid-credential") || message.includes("wrong-password") || message.includes("user-not-found")) {
    return "Invalid email or password";
  }
  if (message.includes("email-already-in-use")) {
    return "Email already in use";
  }
  if (message.includes("weak-password")) {
    return "Password must be at least 6 characters";
  }
  if (message.includes("invalid-email")) {
    return "Invalid email address";
  }
  return message;
}

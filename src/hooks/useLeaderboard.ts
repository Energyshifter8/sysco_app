"use client";

import { db } from "@/lib/firebase";
import { User } from "@/types";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";

export interface LeaderboardEntry extends User {
  rank: number;
}

export function useLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("totalPoints", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc, index) => ({
        ...doc.data(),
        rank: index + 1,
      })) as LeaderboardEntry[];
      setEntries(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { entries, loading };
}

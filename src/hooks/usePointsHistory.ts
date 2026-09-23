"use client";

import { db } from "@/lib/firebase";
import { asDate } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";

export interface PointsHistoryEntry {
  id: string;
  /** What the points were awarded for — the task title at review time. */
  reason: string;
  points: number;
  createdAt: Date | null;
}

/**
 * The signed-in member's most recent point awards.
 *
 * Deliberately a one-shot `getDocs` behind React Query rather than a snapshot
 * listener: the ledger is append-only and only ever grows when someone reviews
 * this member's work, so a live subscription would buy nothing and add another
 * long-lived connection to the ones the dashboard already holds open.
 *
 * Needs the `pointsHistory (uid ASC, createdAt DESC)` composite index — see
 * firestore.indexes.json.
 */
export function usePointsHistory(uid: string | undefined, count = 10) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["pointsHistory", uid, count],
    enabled: Boolean(uid),
    staleTime: 60 * 1000,
    queryFn: async (): Promise<PointsHistoryEntry[]> => {
      const snap = await getDocs(
        query(
          collection(db, "pointsHistory"),
          where("uid", "==", uid),
          orderBy("createdAt", "desc"),
          limit(count),
        ),
      );

      return snap.docs.map((d) => {
        const row = d.data();
        return {
          id: d.id,
          reason: typeof row.reason === "string" ? row.reason : "Оноо",
          points: typeof row.points === "number" ? row.points : 0,
          createdAt: asDate(row.createdAt),
        };
      });
    },
  });

  return { entries: data ?? [], loading: isLoading, error };
}

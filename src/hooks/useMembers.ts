"use client";

import { db } from "@/lib/firebase";
import { User } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { collection, getDocs } from "firebase/firestore";
import { useMemo } from "react";

async function fetchMembers(): Promise<User[]> {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map((d) => d.data() as User);
}

/**
 * Every user document, fetched once and shared through the React Query cache.
 *
 * Task lists need this to turn `assignedTo` entries — uids, "all", "team:<team>"
 * — into real people. Loading the directory once is what keeps those lists from
 * issuing a `getDoc` per task per assignee.
 */
export function useMembers() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["members"],
    queryFn: fetchMembers,
    staleTime: 60 * 1000,
  });

  const members = useMemo(() => data ?? [], [data]);
  const memberMap = useMemo(() => new Map(members.map((m) => [m.uid, m])), [members]);

  return { members, memberMap, loading: isLoading, error };
}

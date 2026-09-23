"use client";

import { db } from "@/lib/firebase";
import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, query, where } from "firebase/firestore";

export interface AttendanceSummary {
  /** Days marked present or late. */
  attended: number;
  /** Days that count toward the rate — excused absences are left out. */
  counted: number;
  /** Attendance rate as a whole percentage, or null when nothing is recorded. */
  rate: number | null;
}

const EMPTY: AttendanceSummary = { attended: 0, counted: 0, rate: null };

/**
 * The signed-in member's attendance rate, read once.
 *
 * "Present" and "late" both count as having turned up; "excused" is dropped from
 * the denominator rather than counted against the member.
 */
export function useAttendanceSummary(uid: string | undefined) {
  const { data, isLoading } = useQuery({
    queryKey: ["attendanceSummary", uid],
    enabled: Boolean(uid),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<AttendanceSummary> => {
      const snap = await getDocs(query(collection(db, "attendance"), where("uid", "==", uid)));

      let attended = 0;
      let counted = 0;
      for (const doc of snap.docs) {
        const status = doc.data().status as string | undefined;
        if (status === "excused" || !status) continue;
        counted += 1;
        if (status === "present" || status === "late") attended += 1;
      }

      return {
        attended,
        counted,
        rate: counted === 0 ? null : Math.round((attended / counted) * 100),
      };
    },
  });

  return { summary: data ?? EMPTY, loading: isLoading };
}

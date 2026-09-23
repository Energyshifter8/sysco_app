"use client";

import { trackListener } from "@/lib/__probe";
import { db } from "@/lib/firebase";
import { asDate } from "@/lib/utils";
import { TaskActivity } from "@/types";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";

/**
 * The status/review log for one task, newest first.
 *
 * Only subscribes while `taskId` is set — the detail dialog is the only reader,
 * so a list of twenty tasks opens zero listeners until one is actually opened.
 */
export function useTaskActivity(taskId: string | null) {
  const [activity, setActivity] = useState<TaskActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!taskId) {
      setActivity([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const q = query(collection(db, "tasks", taskId, "activity"), orderBy("at", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setActivity(
          snap.docs.map((d) => {
            const data = d.data();
            return { ...data, id: d.id, at: asDate(data.at) ?? new Date() } as TaskActivity;
          }),
        );
        setLoading(false);
      },
      (err) => {
        console.error("Түүхийг ачаалахад алдаа гарлаа", err);
        setError("Түүхийг ачаалж чадсангүй");
        setLoading(false);
      },
    );

    const untrack = trackListener("useTaskActivity");
    return () => {
      untrack();
      unsubscribe();
    };
  }, [taskId]);

  return { activity, loading, error };
}

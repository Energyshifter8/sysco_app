"use client";

import { trackListener } from "@/lib/__probe";
import { db } from "@/lib/firebase";
import { Task } from "@/types";
import { useQueryClient } from "@tanstack/react-query";
import { collection, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { toast } from "sonner";

/**
 * Real-time view of every task, for the admin and lead workspaces.
 *
 * Both scopes need tasks they did not create — a lead reviews their team-mates
 * on admin-created tasks too — so the collection is read whole and narrowed on
 * the client. The listener is unsubscribed on unmount and mirrored into the
 * React Query cache.
 */
export function useAllTasks(enabled = true) {
  const queryClient = useQueryClient();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(
      collection(db, "tasks"),
      (snap) => {
        const next = snap.docs.map((d) => ({ ...d.data(), id: d.id }) as Task);
        setTasks(next);
        setLoading(false);
        queryClient.setQueryData(["allTasks"], next);
      },
      (err) => {
        console.error("Даалгаврыг сонсоход алдаа гарлаа", err);
        toast.error("Даалгаврын жагсаалтыг ачаалахад алдаа гарлаа");
        setLoading(false);
      },
    );

    const untrack = trackListener("useAllTasks");
    return () => {
      untrack();
      unsubscribe();
    };
  }, [enabled, queryClient]);

  return { tasks, loading };
}

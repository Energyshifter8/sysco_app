"use client";

import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { Task } from "@/types";
import { useQueryClient } from "@tanstack/react-query";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { toast } from "sonner";

/**
 * Real-time list of the tasks assigned to the signed-in user. A task can target
 * a member three ways: by uid, by the literal "all", or by "team:<team>".
 *
 * The snapshot listener lives in an effect so its unsubscribe actually runs on
 * unmount, and it mirrors every snapshot into the React Query cache so anything
 * else reading the "userTasks" key stays in sync.
 */
export function useAssignedTasks() {
  const { user, userData } = useAuth();
  const queryClient = useQueryClient();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const uid = user?.uid;
  const team = userData?.team;

  useEffect(() => {
    if (!uid) {
      setTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const targets: string[] = [uid, "all"];
    if (team) targets.push(`team:${team}`);

    const q = query(collection(db, "tasks"), where("assignedTo", "array-contains-any", targets));

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const next = snap.docs.map((d) => ({ ...d.data(), id: d.id }) as Task);
        setTasks(next);
        setLoading(false);
        queryClient.setQueryData(["userTasks", uid, team ?? null], next);
      },
      (err) => {
        console.error("Даалгаврыг сонсоход алдаа гарлаа", err);
        toast.error("Даалгаврын жагсаалтыг ачаалахад алдаа гарлаа");
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [uid, team, queryClient]);

  return { tasks, loading };
}

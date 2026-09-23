"use client";

import { db } from "@/lib/firebase";
import { Task } from "@/types";
import { doc, getDoc } from "firebase/firestore";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

/**
 * The open task detail dialog, backed by the `?task=<id>` search param, so the
 * view survives a refresh and can be shared as a link.
 *
 * Opening pushes a history entry, so the browser Back button closes the dialog
 * the way people expect on mobile. Closing pops that entry — unless the page
 * was loaded with `?task=` already set, in which case there is nothing of ours
 * to pop and the param is stripped in place instead. Other params (`?team=`)
 * are always carried across.
 */
export function useSelectedTask() {
  const searchParams = useSearchParams();
  const taskId = searchParams.get("task");
  const pushedRef = useRef(false);

  const open = useCallback((id: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set("task", id);
    window.history.pushState(null, "", `${window.location.pathname}?${params.toString()}`);
    pushedRef.current = true;
  }, []);

  const close = useCallback(() => {
    if (pushedRef.current) {
      pushedRef.current = false;
      window.history.back();
      return;
    }
    const params = new URLSearchParams(window.location.search);
    params.delete("task");
    const qs = params.toString();
    window.history.replaceState(
      null,
      "",
      qs ? `${window.location.pathname}?${qs}` : window.location.pathname,
    );
  }, []);

  return { taskId, open, close };
}

/**
 * The task behind `?task=`, taken from the list on screen when it is there and
 * fetched directly when it is not.
 *
 * A shared link can point at a task the recipient is not assigned to — the
 * security rules let any signed-in user read a task, and the dialog only offers
 * write controls to people who are actually on it — so the fetch keeps those
 * links working instead of showing a dead end.
 */
export function useResolvedTask(taskId: string | null, tasks: Task[]) {
  const local = taskId ? (tasks.find((t) => t.id === taskId) ?? null) : null;
  const hasLocal = local !== null;

  const [fetched, setFetched] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!taskId || hasLocal) {
      setFetched(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    getDoc(doc(db, "tasks", taskId))
      .then((snap) => {
        if (cancelled) return;
        setFetched(snap.exists() ? ({ ...snap.data(), id: snap.id } as Task) : null);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Даалгаврыг ачаалахад алдаа гарлаа", err);
        toast.error("Даалгаврыг ачаалахад алдаа гарлаа");
        setFetched(null);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [taskId, hasLocal]);

  return { task: local ?? fetched, loading };
}

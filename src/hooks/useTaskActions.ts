"use client";

import { useAuth } from "@/context/AuthContext";
import {
  ASSIGNEE_STATUS_LABELS,
  type AssigneeStatus,
  DEFAULT_ASSIGNEE_STATUS,
} from "@/lib/constants";
import { db } from "@/lib/firebase";
import { canReview } from "@/lib/permissions";
import { asDate } from "@/lib/utils";
import { Task, User } from "@/types";
import { collection, doc, increment, runTransaction, serverTimestamp } from "firebase/firestore";
import { useState } from "react";
import { toast } from "sonner";

/**
 * The two writes that move a task forward, in one place so the task list, the
 * detail dialog and the review button all go through the same transaction.
 *
 * Each one also appends to `tasks/{id}/activity` inside the same transaction:
 * the log is part of the change, not a follow-up write that could be lost.
 */
export function useTaskActions() {
  const { userData } = useAuth();
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /**
   * A member sets their own status. No points are awarded here — that only
   * happens through a review. The transaction re-reads the task so a review
   * landing at the same moment wins over a stale status write.
   */
  async function setStatus(task: Task, next: AssigneeStatus): Promise<boolean> {
    if (!userData) return false;
    const uid = userData.uid;
    setBusyTaskId(task.id);
    try {
      await runTransaction(db, async (transaction) => {
        const taskRef = doc(db, "tasks", task.id);
        const taskSnap = await transaction.get(taskRef);
        if (!taskSnap.exists()) throw new Error("Task олдсонгүй");

        const data = taskSnap.data() as Task;
        if (data.assigneeReview?.[uid]) {
          throw new Error("Үнэлгээ хийгдсэн тул статус солих боломжгүй");
        }

        const deadline = asDate(data.dueDate);
        if (next === "done" && deadline && deadline <= new Date()) {
          throw new Error("Task хүлээн авах хугацаа дууссан байна");
        }

        const from = data.assigneeStatus?.[uid] ?? DEFAULT_ASSIGNEE_STATUS;
        if (from === next) return;

        transaction.set(taskRef, { assigneeStatus: { [uid]: next } }, { merge: true });

        transaction.set(doc(collection(db, "tasks", task.id, "activity")), {
          uid,
          actorUid: uid,
          type: "status",
          from,
          to: next,
          at: serverTimestamp(),
        });
      });

      toast.success(`Статус "${ASSIGNEE_STATUS_LABELS[next]}" боллоо`);
      return true;
    } catch (err) {
      console.error("Статус солиход алдаа гарлаа", err);
      toast.error(err instanceof Error ? err.message : "Статус солиход алдаа гарлаа");
      return false;
    } finally {
      setBusyTaskId(null);
    }
  }

  /**
   * Scoring a member is the one place points are awarded. Everything that must
   * agree — the review map, the member's total, the audit ledger and the
   * activity log — is written in one transaction, and the re-read inside it is
   * what stops the same member being credited twice.
   */
  async function reviewAssignee(
    task: Task,
    assignee: User,
    score: number,
    comment: string,
  ): Promise<boolean> {
    if (!userData) return false;

    if (!canReview(userData, assignee)) {
      toast.error("Танд энэ гишүүнийг үнэлэх эрх байхгүй");
      return false;
    }
    if (!Number.isInteger(score) || score < 0 || score > task.points) {
      toast.error(`Оноо 0-ээс ${task.points} хооронд бүхэл тоо байх ёстой`);
      return false;
    }

    setSubmitting(true);
    try {
      await runTransaction(db, async (transaction) => {
        const taskRef = doc(db, "tasks", task.id);
        const taskSnap = await transaction.get(taskRef);
        if (!taskSnap.exists()) throw new Error("Task олдсонгүй");

        const data = taskSnap.data() as Task;
        if (data.assigneeReview?.[assignee.uid]) {
          throw new Error("Аль хэдийн баталгаажсан");
        }
        if ((data.assigneeStatus?.[assignee.uid] ?? DEFAULT_ASSIGNEE_STATUS) !== "done") {
          throw new Error("Гишүүн даалгаврыг дуусгаагүй байна");
        }
        if (score > data.points) {
          throw new Error(`Оноо ${data.points}-аас их байж болохгүй`);
        }

        transaction.set(
          taskRef,
          {
            assigneeReview: {
              [assignee.uid]: {
                score,
                reviewedBy: userData.uid,
                reviewedAt: new Date(),
                ...(comment ? { comment } : {}),
              },
            },
            lastReviewedUid: assignee.uid,
          },
          { merge: true },
        );

        transaction.update(doc(db, "users", assignee.uid), {
          totalPoints: increment(score),
        });

        transaction.set(doc(collection(db, "pointsHistory")), {
          uid: assignee.uid,
          taskId: task.id,
          points: score,
          reason: task.title,
          reviewedBy: userData.uid,
          createdAt: serverTimestamp(),
        });

        // The comment is deliberately not logged — activity is world-readable.
        transaction.set(doc(collection(db, "tasks", task.id, "activity")), {
          uid: assignee.uid,
          actorUid: userData.uid,
          type: "review",
          score,
          at: serverTimestamp(),
        });
      });

      toast.success(`${assignee.name}-д ${score} оноо олголоо`);
      return true;
    } catch (err) {
      console.error("Үнэлгээ хийхэд алдаа гарлаа", err);
      toast.error(err instanceof Error ? err.message : "Үнэлгээ хийхэд алдаа гарлаа");
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  return { setStatus, reviewAssignee, busyTaskId, submitting };
}

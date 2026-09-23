"use client";

import { ReviewDialog } from "@/components/review-dialog";
import { useTaskActions } from "@/hooks/useTaskActions";
import { canReview } from "@/lib/permissions";
import { getAssigneeReview, getAssigneeStatus } from "@/lib/tasks";
import { Task, User } from "@/types";
import { Star } from "lucide-react";
import { useState } from "react";

export interface ReviewButtonProps {
  task: Task;
  assignee: User;
  viewer?: User | null;
}

/**
 * "Үнэлэх" — the whole review interaction in one place: the eligibility gate,
 * the dialog, and the transaction.
 *
 * Both the task list and the detail dialog drop this in, so neither owns any
 * review state of its own. It renders nothing at all when the viewer may not
 * review this person, or when there is nothing to review yet.
 */
export function ReviewButton({ task, assignee, viewer }: ReviewButtonProps) {
  const { reviewAssignee, submitting } = useTaskActions();
  const [open, setOpen] = useState(false);

  const alreadyReviewed = getAssigneeReview(task, assignee.uid) !== undefined;
  const isDone = getAssigneeStatus(task, assignee.uid) === "done";
  if (alreadyReviewed || !isDone || !canReview(viewer, assignee)) return null;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          // The surrounding card opens the detail dialog on click.
          e.stopPropagation();
          setOpen(true);
        }}
        className="flex shrink-0 items-center gap-1 rounded-sm border border-[#8B5CF6]/30 bg-[#8B5CF6]/12 px-2 py-1 text-[#A78BFA] transition-colors hover:border-[#8B5CF6]/60 hover:bg-[#8B5CF6]/20"
        style={{
          fontFamily: "var(--font-jetbrains)",
          fontSize: "0.75rem",
          fontWeight: 700,
          letterSpacing: "0.04em",
        }}
      >
        <Star size={11} />
        ҮНЭЛЭХ
      </button>

      {/* Mounted only while open: a workspace listing every assignee of every
          task would otherwise hold a thousand idle dialogs in the tree. */}
      {open && (
        <ReviewDialog
          task={task}
          assignee={assignee}
          open={open}
          onOpenChange={(next) => {
            if (!next && submitting) return;
            setOpen(next);
          }}
          submitting={submitting}
          onSubmit={async (score, comment) => {
            const ok = await reviewAssignee(task, assignee, score, comment);
            if (ok) setOpen(false);
          }}
        />
      )}
    </>
  );
}

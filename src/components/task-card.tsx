"use client";

import { AssigneeAvatars } from "@/components/assignee-list";
import { DeadlineBadge } from "@/components/deadline-badge";
import { ASSIGNEE_STATUS_COLORS, ASSIGNEE_STATUS_LABELS } from "@/lib/constants";
import { getAssigneeReview, getAssigneeStatus, isTaskOverdue } from "@/lib/tasks";
import { cn } from "@/lib/utils";
import { Task, User } from "@/types";
import { CheckCircle2, Clock, Users } from "lucide-react";
import { memo } from "react";

/** How the given member's own position on a task should read. */
export function statusMeta(task: Task, uid: string) {
  const review = getAssigneeReview(task, uid);
  if (review) {
    return {
      color: "#22C55E",
      label: `Баталгаажсан · ${review.score}/${task.points}`,
      Icon: CheckCircle2,
    };
  }

  const status = getAssigneeStatus(task, uid);
  if (status !== "done" && isTaskOverdue(task)) {
    return { color: "#EF4444", label: "Хоцорсон", Icon: Clock };
  }

  return {
    color: ASSIGNEE_STATUS_COLORS[status],
    label: status === "done" ? "Үнэлгээ хүлээж буй" : ASSIGNEE_STATUS_LABELS[status],
    Icon: status === "done" ? CheckCircle2 : Clock,
  };
}

export interface TaskCardProps {
  task: Task;
  /** The signed-in member, whose own status the card reports. */
  uid: string;
  assignees: User[];
  onOpen: () => void;
  /** "plain" is the bordered list card, "surface" the softer overview card. */
  variant?: "plain" | "surface";
}

/**
 * One task, as a card in a grid.
 *
 * It used to be a full-width bar: a title on the left, a point badge on the
 * right and a few hundred pixels of nothing in between. As a card it carries
 * the description, the deadline and who else is on it, and `h-full` keeps a
 * row of them level however long each title runs.
 */
function TaskCardImpl({ task, uid, assignees, onOpen, variant = "plain" }: TaskCardProps) {
  const { color, label, Icon } = statusMeta(task, uid);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={cn(
        "group flex h-full cursor-pointer flex-col gap-3 rounded-xl p-5 transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6]/50",
        "hover:border-[#8B5CF6]/60 hover:bg-white/[0.04]",
        variant === "surface" ? "surface-card" : "border border-white/8 bg-[#141414]",
      )}
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="type-card-title line-clamp-2 min-w-0 flex-1">{task.title}</h3>
        <span
          className="shrink-0 rounded-lg border px-2.5 py-1 font-mono text-sm font-bold"
          style={{
            background: "rgba(34, 197, 94, 0.09)",
            borderColor: "rgba(34, 197, 94, 0.25)",
            color: "#22C55E",
          }}
        >
          {task.points} pts
        </span>
      </div>

      {task.description && (
        <p className="type-body line-clamp-2 text-[#8A8F98]">{task.description}</p>
      )}

      {/* Pushed to the bottom so every card in a row lines its footer up. */}
      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
        <span
          className="inline-flex items-center gap-1.5 font-mono text-xs tracking-[0.04em]"
          style={{ color }}
        >
          <Icon size={13} />
          {label}
        </span>
        <DeadlineBadge task={task} />
        {assignees.length > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <Users size={13} className="text-[#4B5563]" />
            <AssigneeAvatars task={task} assignees={assignees} highlightUid={uid} max={4} />
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Memoised: the task lists re-render on every snapshot from the whole tasks
 * collection, and a card only changes when its own task or assignees do.
 */
export const TaskCard = memo(TaskCardImpl);

"use client";

import { AssigneeAvatars } from "@/components/assignee-list";
import { DeadlineBadge } from "@/components/deadline-badge";
import { ASSIGNEE_STATUS_COLORS, ASSIGNEE_STATUS_LABELS } from "@/lib/constants";
import { getAssigneeReview, getAssigneeStatus, isTaskOverdue } from "@/lib/tasks";
import { Task, User } from "@/types";
import { CheckCircle2, Clock } from "lucide-react";
import { memo } from "react";

/** How the given member's own position on a task should read. */
export function statusMeta(task: Task, uid: string) {
  const review = getAssigneeReview(task, uid);
  if (review) {
    return {
      color: "#22C55E",
      label: `Баталгаажсан · ${review.score}/${task.points} оноо`,
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
 * One task, as it appears in a list. The whole card opens the detail dialog —
 * by click, or by Enter/Space for keyboard users.
 */
function TaskCardImpl({ task, uid, assignees, onOpen, variant = "plain" }: TaskCardProps) {
  const { color, label, Icon } = statusMeta(task, uid);
  const isSurface = variant === "surface";

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
      className={
        isSurface
          ? "surface-card cursor-pointer rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6]/50"
          : "cursor-pointer border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6]/50"
      }
      style={{
        padding: "14px 16px",
        borderLeft: `3px solid ${color}`,
        ...(isSurface
          ? {}
          : {
              background: "#141414",
              borderColor: "rgba(255, 255, 255, 0.07)",
              borderRadius: "4px",
            }),
        transition: "background 180ms ease, border-color 180ms ease, transform 180ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "#1A1A1A";
        e.currentTarget.style.borderColor = "#8B5CF6";
        if (isSurface) e.currentTarget.style.transform = "translateX(3px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = isSurface ? "" : "#141414";
        e.currentTarget.style.borderColor = isSurface ? "" : "rgba(255, 255, 255, 0.07)";
        if (isSurface) e.currentTarget.style.transform = "";
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p
            style={{
              fontFamily: "var(--font-barlow)",
              fontWeight: 700,
              fontSize: "0.9rem",
              color: "#E8E8E8",
              marginBottom: "6px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {task.title}
          </p>
          <div className="flex items-center gap-3">
            <span
              className="inline-flex items-center gap-1"
              style={{
                fontFamily: "var(--font-jetbrains)",
                fontSize: "0.65rem",
                color,
                letterSpacing: "0.06em",
              }}
            >
              <Icon size={12} />
              {label}
            </span>
            <DeadlineBadge task={task} compact />
            <AssigneeAvatars task={task} assignees={assignees} highlightUid={uid} />
          </div>
        </div>
        <div
          className="shrink-0"
          style={{
            background: "rgba(34, 197, 94, 0.094)",
            border: "1px solid rgba(34, 197, 94, 0.25)",
            borderRadius: "3px",
            padding: "4px 8px",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-jetbrains)",
              fontSize: "0.75rem",
              fontWeight: 700,
              color: "#22C55E",
            }}
          >
            {task.points} pts
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Memoised: the task lists re-render on every snapshot from the whole tasks
 * collection, and a card only changes when its own task or assignees do.
 */
export const TaskCard = memo(TaskCardImpl);

"use client";

import { deadlineLabel } from "@/lib/tasks";
import { formatDateTime } from "@/lib/utils";
import { Task } from "@/types";
import { AlertTriangle, Clock } from "lucide-react";

export interface DeadlineBadgeProps {
  task: Pick<Task, "dueDate">;
  /** Hides the icon where the row is already tight. */
  compact?: boolean;
}

/**
 * "2 өдөр 3 цаг үлдсэн" / "Хоцорсон", with the exact timestamp on hover.
 *
 * A bare date told a member nothing about urgency — they had to do the sum in
 * their head — so every list and the detail dialog now lead with the countdown.
 */
export function DeadlineBadge({ task, compact = false }: DeadlineBadgeProps) {
  const { text, color, overdue } = deadlineLabel(task);
  const exact = formatDateTime(task.dueDate, "Хугацаагүй");

  return (
    <span
      className="inline-flex items-center gap-1 whitespace-nowrap"
      title={exact}
      style={{
        fontFamily: "var(--font-jetbrains)",
        fontSize: "0.8125rem",
        letterSpacing: "0.04em",
        color,
      }}
    >
      {!compact && (overdue ? <AlertTriangle size={11} /> : <Clock size={11} />)}
      {text}
    </span>
  );
}

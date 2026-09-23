"use client";

import { ASSIGNEE_STATUS_COLORS, ASSIGNEE_STATUS_LABELS, TEAM_SHORT_LABELS } from "@/lib/constants";
import { canReview } from "@/lib/permissions";
import { getAssigneeReview, getAssigneeStatus } from "@/lib/tasks";
import { getInitials } from "@/lib/utils";
import { Task, User } from "@/types";

export interface AssigneeListProps {
  task: Task;
  assignees: User[];
  /** The signed-in user, used to decide who may read review comments. */
  viewer?: User | null;
  /** Rendered to the right of a row — the "Үнэлэх" button, when one applies. */
  renderAction?: (assignee: User) => React.ReactNode;
  emptyLabel?: string;
}

/**
 * Who a task is assigned to, and where each of them has got to.
 *
 * Review comments are private: only the assignee themselves and someone who
 * could have written the review (their lead, or an admin) sees the text. The
 * name, status and score are visible to everyone the task is shared with.
 */
export function AssigneeList({
  task,
  assignees,
  viewer,
  renderAction,
  emptyLabel = "Оноогдсон гишүүн алга",
}: AssigneeListProps) {
  if (assignees.length === 0) {
    return (
      <p
        style={{
          color: "#4B5563",
          fontFamily: "var(--font-jetbrains)",
          fontSize: "0.68rem",
        }}
      >
        {emptyLabel}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {assignees.map((assignee) => {
        const status = getAssigneeStatus(task, assignee.uid);
        const review = getAssigneeReview(task, assignee.uid);
        const canSeeComment =
          viewer !== null &&
          viewer !== undefined &&
          (viewer.uid === assignee.uid || canReview(viewer, assignee));

        return (
          <div
            key={assignee.uid}
            className="flex items-center gap-2.5 rounded-md border border-white/6 bg-white/[0.02] px-2.5 py-2"
          >
            <span
              className="flex size-7 shrink-0 items-center justify-center rounded-md border border-[#A78BFA]/30 bg-[#8B5CF6]/15"
              style={{
                fontFamily: "var(--font-jetbrains)",
                fontSize: "0.55rem",
                fontWeight: 700,
                color: "#A78BFA",
              }}
            >
              {getInitials(assignee.name)}
            </span>

            <div className="min-w-0 flex-1">
              <p
                className="truncate"
                style={{
                  fontFamily: "var(--font-barlow)",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  color: "#E8E8E8",
                }}
              >
                {assignee.name}
              </p>
              <p
                style={{
                  fontFamily: "var(--font-jetbrains)",
                  fontSize: "0.58rem",
                  color: "#4B5563",
                }}
              >
                {assignee.team ? TEAM_SHORT_LABELS[assignee.team] : "Баггүй"}
              </p>
            </div>

            <span
              className="shrink-0 rounded-full px-2 py-0.5"
              style={{
                fontFamily: "var(--font-jetbrains)",
                fontSize: "0.58rem",
                fontWeight: 700,
                letterSpacing: "0.04em",
                color: ASSIGNEE_STATUS_COLORS[status],
                background: `${ASSIGNEE_STATUS_COLORS[status]}1F`,
                border: `1px solid ${ASSIGNEE_STATUS_COLORS[status]}40`,
              }}
            >
              {ASSIGNEE_STATUS_LABELS[status]}
            </span>

            {review && (
              <span
                className="shrink-0 rounded-sm border border-[#22C55E]/25 bg-[#22C55E]/10 px-1.5 py-0.5"
                style={{
                  fontFamily: "var(--font-jetbrains)",
                  fontSize: "0.6rem",
                  fontWeight: 700,
                  color: "#22C55E",
                }}
                title={canSeeComment && review.comment ? review.comment : undefined}
              >
                {review.score}/{task.points}
              </span>
            )}

            {renderAction?.(assignee)}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Compact stand-in for the full list: overlapping initials for the first few
 * assignees and a count for the rest. Used on cards where a full row per person
 * would crowd everything else out.
 */
export function AssigneeAvatars({
  assignees,
  max = 5,
  highlightUid,
}: {
  assignees: User[];
  max?: number;
  highlightUid?: string;
}) {
  if (assignees.length === 0) return null;

  const shown = assignees.slice(0, max);
  const overflow = assignees.length - shown.length;

  return (
    <div className="flex items-center gap-1">
      {shown.map((assignee) => {
        const isViewer = assignee.uid === highlightUid;
        return (
          <span
            key={assignee.uid}
            title={assignee.name}
            className="flex size-5 shrink-0 items-center justify-center rounded-full border"
            style={{
              fontFamily: "var(--font-jetbrains)",
              fontSize: "0.48rem",
              fontWeight: 700,
              color: isViewer ? "#C4B5FD" : "#9CA3AF",
              background: isViewer ? "rgba(139, 92, 246, 0.2)" : "rgba(255, 255, 255, 0.05)",
              borderColor: isViewer ? "rgba(167, 139, 250, 0.4)" : "rgba(255, 255, 255, 0.1)",
            }}
          >
            {getInitials(assignee.name)}
          </span>
        );
      })}
      {overflow > 0 && (
        <span
          style={{
            fontFamily: "var(--font-jetbrains)",
            fontSize: "0.58rem",
            color: "#4B5563",
          }}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}

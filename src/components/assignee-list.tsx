"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { VIEWER_PALETTE, avatarPalette } from "@/lib/avatar";
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
  /** Rows to draw before collapsing the rest into a count. */
  max?: number;
  /** Where the collapsed remainder is shown in full — the detail dialog. */
  onShowAll?: () => void;
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
  max,
  onShowAll,
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

  // A task assigned to "all" resolves to the whole club. Drawing every row of
  // every task is what made the workspace unusable, so the list shows the first
  // few and sends the rest to the dialog.
  const shown = max === undefined ? assignees : assignees.slice(0, max);
  const hidden = assignees.length - shown.length;

  return (
    <div className="flex flex-col gap-1.5">
      {shown.map((assignee) => {
        const palette = avatarPalette(assignee.uid);
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
              className="flex size-7 shrink-0 items-center justify-center rounded-md border"
              style={{
                fontFamily: "var(--font-jetbrains)",
                fontSize: "0.55rem",
                fontWeight: 700,
                ...palette,
                borderColor: palette.border,
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

      {hidden > 0 && (
        <button
          type="button"
          onClick={(event) => {
            // The surrounding card opens the dialog on click as well.
            event.stopPropagation();
            onShowAll?.();
          }}
          className="rounded-md border border-white/6 bg-white/[0.02] px-2.5 py-1.5 text-left transition-colors hover:border-[#8B5CF6]/40 hover:text-[#C4B5FD]"
          style={{
            fontFamily: "var(--font-jetbrains)",
            fontSize: "0.62rem",
            color: "#6B7280",
          }}
        >
          + {hidden} гишүүн — бүгдийг харах
        </button>
      )}
    </div>
  );
}

/**
 * Compact stand-in for the full list: overlapping initials for the first few
 * assignees and a count for the rest. Used on cards where a full row per person
 * would crowd everything else out.
 */
export function AssigneeAvatars({
  task,
  assignees,
  max = 5,
  highlightUid,
}: {
  task?: Task;
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
        // Colour, not initials, is what separates two people who both read
        // as "ТБ"; the viewer keeps a fixed colour so "me" stays obvious.
        const palette = isViewer ? VIEWER_PALETTE : avatarPalette(assignee.uid);
        const status = task ? ASSIGNEE_STATUS_LABELS[getAssigneeStatus(task, assignee.uid)] : null;
        const hint = status ? `${assignee.name} · ${status}` : assignee.name;

        return (
          <Tooltip key={assignee.uid}>
            <TooltipTrigger asChild>
              <span
                title={hint}
                className="flex size-5 shrink-0 items-center justify-center rounded-full border"
                style={{
                  fontFamily: "var(--font-jetbrains)",
                  fontSize: "0.48rem",
                  fontWeight: 700,
                  color: palette.color,
                  background: palette.background,
                  borderColor: palette.border,
                }}
              >
                {getInitials(assignee.name)}
              </span>
            </TooltipTrigger>
            <TooltipContent>{hint}</TooltipContent>
          </Tooltip>
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

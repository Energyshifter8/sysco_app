"use client";

import { DeadlineBadge } from "@/components/deadline-badge";
import { ReviewButton } from "@/components/review-button";
import { StatusPicker } from "@/components/status-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTaskActions } from "@/hooks/useTaskActions";
import { useTaskActivity } from "@/hooks/useTaskActivity";
import { VIEWER_PALETTE, avatarPalette } from "@/lib/avatar";
import {
  ASSIGNEE_STATUS_COLORS,
  ASSIGNEE_STATUS_LABELS,
  ASSIGN_ALL,
  type AssigneeStatus,
  ROLE_LABELS,
  TEAM_LABELS,
  TEAM_SHORT_LABELS,
  parseTeamToken,
} from "@/lib/constants";
import { canReview } from "@/lib/permissions";
import { getAssigneeReview, getAssigneeStatus, isTaskOverdue, resolveAssignees } from "@/lib/tasks";
import { formatDateTime, getInitials } from "@/lib/utils";
import { Task, TaskActivity, User } from "@/types";
import { Loader2 } from "lucide-react";

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-jetbrains)",
  fontSize: "0.75rem",
  color: "#6B7280",
  letterSpacing: "0.08em",
};

const headStyle: React.CSSProperties = {
  ...labelStyle,
  fontSize: "0.75rem",
  textAlign: "left",
  padding: "0 10px 6px 0",
  whiteSpace: "nowrap",
};

const cellStyle: React.CSSProperties = {
  fontFamily: "var(--font-jetbrains)",
  fontSize: "0.75rem",
  color: "#9CA3AF",
  padding: "8px 10px 8px 0",
  whiteSpace: "nowrap",
  verticalAlign: "middle",
};

/** "Бүх гишүүн" / "Баг: Хөгжүүлэлт" / "Тодорхой гишүүд" */
function assignmentLabel(task: Task): string {
  const entries = task.assignedTo ?? [];
  if (entries.includes(ASSIGN_ALL)) return "Бүх гишүүн";

  const teams = entries.map(parseTeamToken).filter((t) => t !== null);
  if (teams.length > 0 && teams.length === entries.length) {
    return `Баг: ${teams.map((t) => TEAM_LABELS[t]).join(", ")}`;
  }
  if (teams.length > 0) return "Баг ба тодорхой гишүүд";
  return "Тодорхой гишүүд";
}

function shortTime(date: Date): string {
  return date.toLocaleString("mn-MN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** When this person first started, and when they last marked themselves done. */
function milestonesFor(activity: TaskActivity[], uid: string) {
  const mine = activity.filter((a) => a.uid === uid && a.type === "status");
  // `activity` arrives newest-first, so the earliest start is the last match.
  const started = mine.filter((a) => a.to === "in_progress").at(-1)?.at ?? null;
  const finished = mine.find((a) => a.to === "done")?.at ?? null;
  return { started, finished };
}

function nameOf(uid: string, members: User[]): string {
  if (uid === "legacy") return "Систем";
  return members.find((m) => m.uid === uid)?.name ?? "Тодорхойгүй";
}

function roleSuffix(uid: string, members: User[]): string {
  const role = members.find((m) => m.uid === uid)?.role;
  return role && role !== "member" ? ` (${ROLE_LABELS[role]})` : "";
}

export interface TaskDetailDialogProps {
  task: Task | null;
  /** Set while the task behind a `?task=` link is still being fetched. */
  loadingTask?: boolean;
  members: User[];
  viewer?: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Everything about one task: who it is for, where each of them has got to, and
 * the log of how it got there. Shared by the member task list, the overview and
 * both the admin and lead workspaces.
 *
 * The activity log is only subscribed to while this is open, so a list of tasks
 * costs no listeners until one of them is actually opened.
 */
export function TaskDetailDialog({
  task,
  loadingTask = false,
  members,
  viewer,
  open,
  onOpenChange,
}: TaskDetailDialogProps) {
  const {
    activity,
    loading: activityLoading,
    error: activityError,
  } = useTaskActivity(open && task ? task.id : null);
  const { setStatus, busyTaskId } = useTaskActions();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl max-sm:h-dvh max-sm:max-h-dvh max-sm:max-w-full max-sm:rounded-none"
        style={{
          background: "#141414",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "6px",
          padding: "24px",
          gap: "18px",
        }}
      >
        {loadingTask && (
          <>
            <DialogHeader>
              <DialogTitle style={{ fontFamily: "var(--font-montserrat)", color: "#E8E8E8" }}>
                Ачаалж байна…
              </DialogTitle>
              <DialogDescription style={labelStyle}>Даалгаврын мэдээлэл</DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-center py-10">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          </>
        )}

        {!loadingTask && !task && (
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "var(--font-montserrat)", color: "#E8E8E8" }}>
              Task олдсонгүй
            </DialogTitle>
            <DialogDescription style={labelStyle}>
              Энэ даалгавар устсан эсвэл хаяг буруу байна.
            </DialogDescription>
          </DialogHeader>
        )}

        {!loadingTask && task && (
          <TaskDetailBody
            task={task}
            members={members}
            viewer={viewer}
            activity={activity}
            activityLoading={activityLoading}
            activityError={activityError}
            busy={busyTaskId === task.id}
            onStatusChange={(next) => setStatus(task, next)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function TaskDetailBody({
  task,
  members,
  viewer,
  activity,
  activityLoading,
  activityError,
  busy,
  onStatusChange,
}: {
  task: Task;
  members: User[];
  viewer?: User | null;
  activity: TaskActivity[];
  activityLoading: boolean;
  activityError: string | null;
  busy: boolean;
  onStatusChange: (next: AssigneeStatus) => void;
}) {
  const assignees = resolveAssignees(task, members);
  const overdue = isTaskOverdue(task);

  const viewerUid = viewer?.uid;
  const viewerIsAssignee = !!viewerUid && assignees.some((a) => a.uid === viewerUid);
  const viewerReview = viewerUid ? getAssigneeReview(task, viewerUid) : undefined;
  const viewerStatus = viewerUid ? getAssigneeStatus(task, viewerUid) : "pending";

  return (
    <>
      {/* ─── Header ─── */}
      <DialogHeader style={{ gap: "10px" }}>
        <div className="flex items-start justify-between gap-3">
          <DialogTitle
            style={{
              fontFamily: "var(--font-montserrat)",
              fontWeight: 700,
              fontSize: "1.1rem",
              color: "#E8E8E8",
              lineHeight: 1.3,
            }}
          >
            {task.title}
          </DialogTitle>
          <span
            className="shrink-0 rounded-sm border border-[#22C55E]/25 bg-[#22C55E]/10 px-2 py-1"
            style={{
              fontFamily: "var(--font-jetbrains)",
              fontSize: "0.8125rem",
              fontWeight: 700,
              color: "#22C55E",
            }}
          >
            {task.points} pts
          </span>
        </div>
        <DialogDescription
          className="flex flex-wrap items-center gap-x-3 gap-y-1"
          style={{
            fontFamily: "var(--font-jetbrains)",
            fontSize: "0.8125rem",
            letterSpacing: "0.04em",
          }}
        >
          <DeadlineBadge task={task} />
          <span style={{ color: "#4B5563" }}>{formatDateTime(task.dueDate)}</span>
        </DialogDescription>
      </DialogHeader>

      {/* ─── Meta ─── */}
      <div>
        <span style={{ ...labelStyle, display: "block", marginBottom: "6px" }}>ТОЙМ</span>
        <p
          style={{
            fontFamily: "var(--font-montserrat)",
            fontSize: "0.875rem",
            color: "#9CA3AF",
            lineHeight: 1.55,
            whiteSpace: "pre-wrap",
          }}
        >
          {task.description || "Тайлбар байхгүй"}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <span style={{ ...labelStyle, display: "block", marginBottom: "4px" }}>ҮҮСГЭСЭН</span>
          <p
            style={{ fontFamily: "var(--font-montserrat)", fontSize: "0.875rem", color: "#E8E8E8" }}
          >
            {nameOf(task.createdBy, members)}
            {task.createdByRole ? ` · ${ROLE_LABELS[task.createdByRole]}` : ""}
          </p>
          <p style={{ ...labelStyle, fontSize: "0.75rem", marginTop: "2px" }}>
            {formatDateTime(task.createdAt, "—")}
          </p>
        </div>
        <div>
          <span style={{ ...labelStyle, display: "block", marginBottom: "4px" }}>ОНООЛТ</span>
          <p
            style={{ fontFamily: "var(--font-montserrat)", fontSize: "0.875rem", color: "#E8E8E8" }}
          >
            {assignmentLabel(task)}
          </p>
          <p style={{ ...labelStyle, fontSize: "0.75rem", marginTop: "2px" }}>
            {assignees.length} гишүүн
          </p>
        </div>
      </div>

      {/* ─── Assignees ─── */}
      <div>
        <span style={{ ...labelStyle, display: "block", marginBottom: "8px" }}>
          ОНООГДСОН ГИШҮҮД
        </span>
        {assignees.length === 0 ? (
          <p style={{ ...labelStyle, fontSize: "0.8125rem", color: "#4B5563" }}>
            Оноогдсон гишүүн алга
          </p>
        ) : (
          <div className="-mx-1 overflow-x-auto px-1">
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "520px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  <th style={headStyle}>ГИШҮҮН</th>
                  <th style={headStyle}>СТАТУС</th>
                  <th style={headStyle}>ЭХЭЛСЭН</th>
                  <th style={headStyle}>ДУУСГАСАН</th>
                  <th style={headStyle}>ҮНЭЛГЭЭ</th>
                  <th style={headStyle} />
                </tr>
              </thead>
              <tbody>
                {assignees.map((assignee) => {
                  const status = getAssigneeStatus(task, assignee.uid);
                  const review = getAssigneeReview(task, assignee.uid);
                  const { started, finished } = milestonesFor(activity, assignee.uid);
                  const isViewer = assignee.uid === viewerUid;
                  const palette = isViewer ? VIEWER_PALETTE : avatarPalette(assignee.uid);
                  const canSeeComment =
                    !!viewer && (viewer.uid === assignee.uid || canReview(viewer, assignee));

                  return (
                    <tr
                      key={assignee.uid}
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                    >
                      <td style={cellStyle}>
                        <div className="flex items-center gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span
                                title={`${assignee.name} · ${ASSIGNEE_STATUS_LABELS[status]}`}
                                className="flex size-7 shrink-0 items-center justify-center rounded-md border"
                                style={{
                                  fontFamily: "var(--font-jetbrains)",
                                  fontSize: "0.75rem",
                                  fontWeight: 700,
                                  color: palette.color,
                                  background: palette.background,
                                  borderColor: palette.border,
                                }}
                              >
                                {getInitials(assignee.name)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              {assignee.name} · {ASSIGNEE_STATUS_LABELS[status]}
                            </TooltipContent>
                          </Tooltip>
                          <div className="min-w-0">
                            <p
                              style={{
                                fontFamily: "var(--font-montserrat)",
                                fontSize: "0.875rem",
                                fontWeight: 600,
                                color: "#E8E8E8",
                              }}
                            >
                              {assignee.name}
                              {isViewer ? " (Та)" : ""}
                            </p>
                            <p style={{ ...labelStyle, fontSize: "0.75rem" }}>
                              {assignee.team ? TEAM_SHORT_LABELS[assignee.team] : "Баггүй"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td style={cellStyle}>
                        <span
                          className="rounded-full px-2 py-0.5"
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            color: ASSIGNEE_STATUS_COLORS[status],
                            background: `${ASSIGNEE_STATUS_COLORS[status]}1F`,
                            border: `1px solid ${ASSIGNEE_STATUS_COLORS[status]}40`,
                          }}
                        >
                          {ASSIGNEE_STATUS_LABELS[status]}
                        </span>
                      </td>

                      <td style={cellStyle}>{started ? shortTime(started) : "—"}</td>
                      <td style={cellStyle}>{finished ? shortTime(finished) : "—"}</td>

                      <td style={cellStyle}>
                        {review ? (
                          <span style={{ color: "#22C55E", fontWeight: 700 }}>
                            {review.score}/{task.points}
                            <span style={{ color: "#4B5563", fontWeight: 400, marginLeft: "6px" }}>
                              {nameOf(review.reviewedBy, members)} ·{" "}
                              {formatDateTime(review.reviewedAt, "—")}
                            </span>
                            {canSeeComment && review.comment && (
                              <span
                                style={{
                                  display: "block",
                                  color: "#9CA3AF",
                                  fontWeight: 400,
                                  fontFamily: "var(--font-montserrat)",
                                  whiteSpace: "normal",
                                  marginTop: "2px",
                                }}
                              >
                                {review.comment}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span style={{ color: "#4B5563" }}>Үнэлээгүй</span>
                        )}
                      </td>

                      <td style={{ ...cellStyle, paddingRight: 0 }}>
                        <ReviewButton task={task} assignee={assignee} viewer={viewer} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Viewer's own status ─── */}
      {viewerIsAssignee && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "16px" }}>
          <span style={{ ...labelStyle, display: "block", marginBottom: "8px" }}>МИНИЙ СТАТУС</span>
          <StatusPicker
            value={viewerStatus}
            onChange={onStatusChange}
            busy={busy}
            disabled={viewerReview !== undefined}
            blocked={overdue ? ["done"] : []}
          />
          {viewerReview ? (
            <p
              style={{
                fontFamily: "var(--font-jetbrains)",
                fontSize: "0.8125rem",
                color: "#22C55E",
                marginTop: "8px",
              }}
            >
              Баталгаажсан · {viewerReview.score}/{task.points} оноо
              {viewerReview.comment ? ` — ${viewerReview.comment}` : ""}
            </p>
          ) : (
            overdue && (
              <p
                style={{
                  fontFamily: "var(--font-jetbrains)",
                  fontSize: "0.8125rem",
                  color: "#EF4444",
                  marginTop: "8px",
                }}
              >
                ХҮЛЭЭН АВАХ ХУГАЦАА ДУУССАН
              </p>
            )
          )}
        </div>
      )}

      {/* ─── History ─── */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "16px" }}>
        <span style={{ ...labelStyle, display: "block", marginBottom: "10px" }}>ТҮҮХ</span>

        {activityLoading ? (
          <div className="flex flex-col gap-2">
            {["a", "b", "c"].map((key) => (
              <div
                key={key}
                className="h-4 animate-pulse rounded"
                style={{ background: "rgba(255,255,255,0.05)", width: `${70 - key.length * 4}%` }}
              />
            ))}
          </div>
        ) : activityError ? (
          <p
            style={{ fontFamily: "var(--font-montserrat)", fontSize: "0.875rem", color: "#FCA5A5" }}
          >
            {activityError}
          </p>
        ) : activity.length === 0 ? (
          <p
            style={{ fontFamily: "var(--font-montserrat)", fontSize: "0.875rem", color: "#4B5563" }}
          >
            Түүх бүртгэгдээгүй (хуучин task)
          </p>
        ) : (
          <ol className="flex flex-col gap-2.5">
            {activity.map((entry) => (
              <li key={entry.id} className="flex items-start gap-2.5">
                <span
                  className="mt-1.5 size-1.5 shrink-0 rounded-full"
                  style={{
                    background:
                      entry.type === "review"
                        ? "#22C55E"
                        : ASSIGNEE_STATUS_COLORS[entry.to ?? "pending"],
                  }}
                />
                <div className="min-w-0">
                  <p
                    style={{
                      fontFamily: "var(--font-montserrat)",
                      fontSize: "0.875rem",
                      color: "#E8E8E8",
                    }}
                  >
                    {entry.type === "review" ? (
                      <>
                        <strong style={{ fontWeight: 600 }}>
                          {nameOf(entry.actorUid, members)}
                          {roleSuffix(entry.actorUid, members)}
                        </strong>{" "}
                        {nameOf(entry.uid, members)}-д {entry.score}/{task.points} оноо өгсөн
                      </>
                    ) : (
                      <>
                        <strong style={{ fontWeight: 600 }}>{nameOf(entry.uid, members)}</strong> ·{" "}
                        {entry.from
                          ? `${ASSIGNEE_STATUS_LABELS[entry.from]} → ${ASSIGNEE_STATUS_LABELS[entry.to ?? "pending"]}`
                          : ASSIGNEE_STATUS_LABELS[entry.to ?? "pending"]}
                      </>
                    )}
                  </p>
                  <p style={{ ...labelStyle, fontSize: "0.75rem", marginTop: "1px" }}>
                    {shortTime(entry.at)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </>
  );
}

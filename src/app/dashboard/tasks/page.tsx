"use client";

import { AssigneeAvatars, AssigneeList } from "@/components/assignee-list";
import { StatusPicker } from "@/components/status-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { useAssignedTasks } from "@/hooks/useAssignedTasks";
import { useMembers } from "@/hooks/useMembers";
import {
  ASSIGNEE_STATUS_COLORS,
  ASSIGNEE_STATUS_LABELS,
  type AssigneeStatus,
} from "@/lib/constants";
import { db } from "@/lib/firebase";
import { getAssigneeReview, getAssigneeStatus, isTaskOverdue, resolveAssignees } from "@/lib/tasks";
import { asDate, formatDateTime } from "@/lib/utils";
import { Task, User } from "@/types";
import { doc, runTransaction } from "firebase/firestore";
import { CheckCircle2, Clock, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type FilterStatus = "all" | AssigneeStatus | "overdue";

interface StatusMeta {
  color: string;
  label: string;
  Icon: typeof Clock;
}

/** How the signed-in member's own position on a task should read. */
function statusMeta(task: Task, uid: string): StatusMeta {
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

/* ─── Compact card (clickable) ─── */
function TaskCard({
  task,
  uid,
  assignees,
  onClick,
}: {
  task: Task;
  uid: string;
  assignees: User[];
  onClick: () => void;
}) {
  const { color, label, Icon } = statusMeta(task, uid);

  return (
    <div
      className="border"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
      style={{
        background: "#141414",
        borderColor: "rgba(255, 255, 255, 0.07)",
        borderRadius: "4px",
        padding: "14px 16px",
        borderLeft: `3px solid ${color}`,
        cursor: "pointer",
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#1A1A1A")}
      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#141414")}
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
            <span
              style={{
                color: "#374151",
                fontSize: "0.65rem",
                fontFamily: "var(--font-jetbrains)",
              }}
            >
              {formatDateTime(task.dueDate, "Хугацаагүй")}
            </span>
            <AssigneeAvatars assignees={assignees} highlightUid={uid} />
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

const metaLabelStyle: React.CSSProperties = {
  fontFamily: "var(--font-jetbrains)",
  fontSize: "0.6rem",
  color: "#6B7280",
  letterSpacing: "0.08em",
};

/* ─── Page ─── */
export default function MemberTasksPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const { tasks, loading: tasksLoading } = useAssignedTasks();
  const { members } = useMembers();

  const [tab, setTab] = useState<"current" | "history">("current");
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const uid = user?.uid ?? "";

  /**
   * Members set their own status and nothing else — points are awarded later by
   * a lead or admin through the review flow. The transaction re-reads the task
   * so a review landing at the same moment wins over a stale status write.
   */
  async function handleStatusChange(task: Task, next: AssigneeStatus) {
    if (!user) return;
    setSavingTaskId(task.id);
    try {
      await runTransaction(db, async (transaction) => {
        const taskRef = doc(db, "tasks", task.id);
        const taskSnap = await transaction.get(taskRef);
        if (!taskSnap.exists()) throw new Error("Task олдсонгүй");

        const data = taskSnap.data() as Task;
        if (data.assigneeReview?.[user.uid]) {
          throw new Error("Үнэлгээ хийгдсэн тул статус солих боломжгүй");
        }

        const deadline = asDate(data.dueDate);
        if (next === "done" && deadline && deadline <= new Date()) {
          throw new Error("Task хүлээн авах хугацаа дууссан байна");
        }

        transaction.set(taskRef, { assigneeStatus: { [user.uid]: next } }, { merge: true });
      });

      toast.success(`Статус "${ASSIGNEE_STATUS_LABELS[next]}" боллоо`);
    } catch (err) {
      console.error("Статус солиход алдаа гарлаа", err);
      toast.error(err instanceof Error ? err.message : "Статус солиход алдаа гарлаа");
    } finally {
      setSavingTaskId(null);
    }
  }

  if (authLoading || tasksLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Work moves to history once it has been scored — that is what closes it out.
  const reviewed = tasks.filter((t) => getAssigneeReview(t, uid) !== undefined);
  const active = tasks.filter((t) => getAssigneeReview(t, uid) === undefined);

  const currentTasks = tab === "current" ? active : reviewed;
  const filtered =
    filter === "all" || tab === "history"
      ? currentTasks
      : currentTasks.filter((t) => {
          const status = getAssigneeStatus(t, uid);
          const overdue = status !== "done" && isTaskOverdue(t);
          if (filter === "overdue") return overdue;
          return status === filter && !overdue;
        });

  const selectedTask = selectedTaskId ? (tasks.find((t) => t.id === selectedTaskId) ?? null) : null;

  return (
    <div style={{ width: "100%" }}>
      <div className="mb-8 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
        <div>
          <h1
            style={{
              fontFamily: "var(--font-jetbrains)",
              fontSize: "1.3rem",
              fontWeight: 800,
              color: "#E8E8E8",
              letterSpacing: "-0.02em",
            }}
          >
            ДААЛГАВРЫН ЖАГСААЛТ
          </h1>
          <p
            style={{
              color: "#6B7280",
              fontSize: "0.75rem",
              fontFamily: "var(--font-jetbrains)",
              marginTop: "4px",
            }}
          >
            {filtered.length} ДААЛГАВАР
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="mb-6 flex overflow-x-auto"
        style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.07)" }}
      >
        {[
          { key: "current", label: "Одоогийн" },
          { key: "history", label: "Түүх" },
        ].map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setTab(key as "current" | "history");
              setFilter("all");
            }}
            style={{
              fontFamily: "var(--font-jetbrains)",
              fontSize: "0.8rem",
              fontWeight: 700,
              letterSpacing: "0.04em",
              padding: "10px 20px",
              background: "none",
              border: "none",
              borderBottom: tab === key ? "2px solid #8B5CF6" : "2px solid transparent",
              color: tab === key ? "#8B5CF6" : "#6B7280",
              cursor: "pointer",
              marginBottom: "-1px",
              transition: "all 0.15s",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filters */}
      {tab === "current" && (
        <div className="mb-5 flex flex-wrap gap-2">
          {(
            [
              { key: "all", label: "Бүгд", color: "#6B7280" },
              { key: "pending", label: ASSIGNEE_STATUS_LABELS.pending, color: "#FBBF24" },
              { key: "in_progress", label: ASSIGNEE_STATUS_LABELS.in_progress, color: "#3B82F6" },
              { key: "done", label: "Үнэлгээ хүлээж буй", color: "#22C55E" },
              { key: "overdue", label: "Хоцорсон", color: "#EF4444" },
            ] as { key: FilterStatus; label: string; color: string }[]
          ).map(({ key, label, color }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              style={{
                fontFamily: "var(--font-jetbrains)",
                fontSize: "0.65rem",
                letterSpacing: "0.06em",
                padding: "5px 12px",
                borderRadius: "3px",
                border: `1px solid ${filter === key ? color : "rgba(255,255,255,0.1)"}`,
                background: filter === key ? `${color}18` : "transparent",
                color: filter === key ? color : "#6B7280",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Task list */}
      <div className="flex flex-col gap-2">
        {filtered.map((t) => (
          <TaskCard
            key={t.id}
            task={t}
            uid={uid}
            assignees={resolveAssignees(t, members)}
            onClick={() => setSelectedTaskId(t.id)}
          />
        ))}
        {filtered.length === 0 && (
          <div
            className="py-12 text-center"
            style={{
              color: "#374151",
              fontFamily: "var(--font-jetbrains)",
              fontSize: "0.8rem",
            }}
          >
            ДААЛГАВАР ОЛДСОНГҮЙ
          </div>
        )}
      </div>

      {/* Detail dialog */}
      <Dialog
        open={selectedTaskId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedTaskId(null);
        }}
      >
        <DialogContent
          className="sm:max-w-md"
          style={{
            background: "#141414",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "6px",
            padding: "24px",
            gap: "20px",
          }}
        >
          {selectedTask &&
            (() => {
              const meta = statusMeta(selectedTask, uid);
              const review = getAssigneeReview(selectedTask, uid);
              const status = getAssigneeStatus(selectedTask, uid);
              const overdue = isTaskOverdue(selectedTask);
              const assignees = resolveAssignees(selectedTask, members);

              return (
                <>
                  <DialogHeader style={{ gap: "8px" }}>
                    <DialogTitle
                      style={{
                        fontFamily: "var(--font-barlow)",
                        fontWeight: 700,
                        fontSize: "1.1rem",
                        color: "#E8E8E8",
                        lineHeight: 1.3,
                      }}
                    >
                      {selectedTask.title}
                    </DialogTitle>
                    <DialogDescription
                      className="flex items-center gap-1.5"
                      style={{
                        fontFamily: "var(--font-jetbrains)",
                        fontSize: "0.7rem",
                        color: meta.color,
                        letterSpacing: "0.06em",
                      }}
                    >
                      <meta.Icon size={13} />
                      {meta.label}
                    </DialogDescription>
                  </DialogHeader>

                  <div
                    className="flex flex-wrap items-center gap-4"
                    style={{ fontSize: "0.75rem" }}
                  >
                    <div className="flex flex-col gap-1">
                      <span style={metaLabelStyle}>ДЭЭД ОНОО</span>
                      <span
                        style={{
                          fontFamily: "var(--font-jetbrains)",
                          fontSize: "0.85rem",
                          fontWeight: 700,
                          color: "#22C55E",
                        }}
                      >
                        {selectedTask.points}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span style={metaLabelStyle}>ХҮЛЭЭН АВАХ ХУГАЦАА</span>
                      <span
                        style={{
                          fontFamily: "var(--font-jetbrains)",
                          fontSize: "0.85rem",
                          fontWeight: 700,
                          color: "#E8E8E8",
                        }}
                      >
                        {formatDateTime(selectedTask.dueDate)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span style={{ ...metaLabelStyle, display: "block", marginBottom: "6px" }}>
                      ТОЙМ
                    </span>
                    <p
                      style={{
                        fontFamily: "var(--font-barlow)",
                        fontSize: "0.85rem",
                        color: "#9CA3AF",
                        lineHeight: 1.55,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {selectedTask.description || "Тайлбар байхгүй"}
                    </p>
                  </div>

                  <div>
                    <span style={{ ...metaLabelStyle, display: "block", marginBottom: "6px" }}>
                      ОНООГДСОН ГИШҮҮД ({assignees.length})
                    </span>
                    <AssigneeList task={selectedTask} assignees={assignees} viewer={userData} />
                  </div>

                  <div
                    style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "16px" }}
                  >
                    <span style={{ ...metaLabelStyle, display: "block", marginBottom: "8px" }}>
                      МИНИЙ СТАТУС
                    </span>
                    <StatusPicker
                      value={status}
                      onChange={(next) => handleStatusChange(selectedTask, next)}
                      busy={savingTaskId === selectedTask.id}
                      disabled={review !== undefined}
                      blocked={overdue ? ["done"] : []}
                    />
                    {review ? (
                      <p
                        style={{
                          fontFamily: "var(--font-jetbrains)",
                          fontSize: "0.65rem",
                          color: "#22C55E",
                          marginTop: "8px",
                        }}
                      >
                        Баталгаажсан · {review.score}/{selectedTask.points} оноо
                        {review.comment ? ` — ${review.comment}` : ""}
                      </p>
                    ) : (
                      overdue && (
                        <p
                          style={{
                            fontFamily: "var(--font-jetbrains)",
                            fontSize: "0.65rem",
                            color: "#EF4444",
                            marginTop: "8px",
                          }}
                        >
                          ХҮЛЭЭН АВАХ ХУГАЦАА ДУУССАН
                        </p>
                      )
                    )}
                  </div>
                </>
              );
            })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

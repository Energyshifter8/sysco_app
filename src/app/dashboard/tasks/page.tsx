"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { Task } from "@/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isPast } from "date-fns";
import {
  collection,
  doc,
  increment,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { Check, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type FilterStatus = "all" | "pending" | "done" | "overdue";

function statusMeta(task: Task, uid: string) {
  const isOverdue = task.dueDate ? isPast(new Date(task.dueDate)) : false;
  const isTaskCompleted = task.status === "completed" || task.status === "approved";
  const alreadyCompleted = task.assigneeCompleted?.[uid] === true;

  const color = isTaskCompleted
    ? "#22C55E"
    : isOverdue
      ? "#EF4444"
      : alreadyCompleted
        ? "#22C55E"
        : "#FBBF24";
  const label = isTaskCompleted
    ? "Дууссан"
    : alreadyCompleted
      ? "Дууссан ✓"
      : isOverdue
        ? "Хоцорсон"
        : "Хүлээгдэж буй";
  const Icon = isTaskCompleted || alreadyCompleted ? CheckCircle2 : Clock;

  return { color, label, Icon };
}

/* ─── Compact card (clickable, no progress controls) ─── */
function TaskCard({
  task,
  uid,
  onClick,
}: {
  task: Task;
  uid: string;
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
        <div className="flex-1 min-w-0">
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
              {task.dueDate ? new Date(task.dueDate).toLocaleDateString("mn-MN") : "-"}
            </span>
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
            +{task.points}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Detail dialog ─── */
function TaskDetailDialog({
  task,
  uid,
  open,
  onOpenChange,
  progress,
  onProgressChange,
  onComplete,
  completing,
}: {
  task: Task | null;
  uid: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  progress: number;
  onProgressChange: (taskId: string, value: number) => void;
  onComplete: (task: Task) => void;
  completing: string | null;
}) {
  if (!task) return null;

  const { color, label, Icon } = statusMeta(task, uid);
  const isTaskCompleted = task.status === "completed" || task.status === "approved";
  const alreadyCompleted = task.assigneeCompleted?.[uid] === true;
  const isCompleting = completing === task.id;
  const showProgress = !isTaskCompleted && task.assignedTo.includes(uid);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
        {/* Header */}
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
            {task.title}
          </DialogTitle>
          <DialogDescription
            style={{
              fontFamily: "var(--font-jetbrains)",
              fontSize: "0.7rem",
              color,
              letterSpacing: "0.06em",
            }}
            className="flex items-center gap-1.5"
          >
            <Icon size={13} />
            {label}
          </DialogDescription>
        </DialogHeader>

        {/* Meta row */}
        <div className="flex items-center gap-4 flex-wrap" style={{ fontSize: "0.75rem" }}>
          <div className="flex flex-col gap-1">
            <span
              style={{
                fontFamily: "var(--font-jetbrains)",
                fontSize: "0.6rem",
                color: "#6B7280",
                letterSpacing: "0.08em",
              }}
            >
              ОНОО
            </span>
            <span
              style={{
                fontFamily: "var(--font-jetbrains)",
                fontSize: "0.85rem",
                fontWeight: 700,
                color: "#22C55E",
              }}
            >
              +{task.points}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span
              style={{
                fontFamily: "var(--font-jetbrains)",
                fontSize: "0.6rem",
                color: "#6B7280",
                letterSpacing: "0.08em",
              }}
            >
              Хугацаа
            </span>
            <span
              style={{
                fontFamily: "var(--font-jetbrains)",
                fontSize: "0.85rem",
                fontWeight: 700,
                color: "#E8E8E8",
              }}
            >
              {task.dueDate ? new Date(task.dueDate).toLocaleDateString("mn-MN") : "Хугацаагүй"}
            </span>
          </div>
        </div>

        {/* Description */}
        <div>
          <span
            style={{
              fontFamily: "var(--font-jetbrains)",
              fontSize: "0.6rem",
              color: "#6B7280",
              letterSpacing: "0.08em",
              display: "block",
              marginBottom: "6px",
            }}
          >
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
            {task.description || "Тайлбар байхгүй"}
          </p>
        </div>

        {/* Assigned users */}
        {task.assignedTo.length > 0 && (
          <div>
            <span
              style={{
                fontFamily: "var(--font-jetbrains)",
                fontSize: "0.6rem",
                color: "#6B7280",
                letterSpacing: "0.08em",
                display: "block",
                marginBottom: "6px",
              }}
            >
              ХАРААГДСАН ({task.assignedTo.length})
            </span>
            <div className="flex flex-wrap gap-1.5">
              {task.assignedTo.map((a) => (
                <span
                  key={a}
                  style={{
                    fontFamily: "var(--font-jetbrains)",
                    fontSize: "0.65rem",
                    color: a === uid ? "#8B5CF6" : "#9CA3AF",
                    background: a === uid ? "rgba(139,92,246,0.12)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${a === uid ? "rgba(139,92,246,0.25)" : "rgba(255,255,255,0.07)"}`,
                    borderRadius: "3px",
                    padding: "2px 8px",
                  }}
                >
                  {a === uid ? "Та" : a.slice(0, 8)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Progress section — only for non-completed tasks assigned to current user */}
        {showProgress && (
          <div
            style={{
              borderTop: "1px solid rgba(255,255,255,0.06)",
              paddingTop: "16px",
            }}
          >
            {alreadyCompleted ? (
              <div className="flex items-center gap-2">
                <span
                  style={{
                    fontFamily: "var(--font-jetbrains)",
                    fontSize: "0.7rem",
                    color: "#22C55E",
                    letterSpacing: "0.04em",
                  }}
                >
                  Дууссан ✓ — +{task.points} оноо
                </span>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span
                    style={{
                      fontFamily: "var(--font-jetbrains)",
                      fontSize: "0.6rem",
                      color: "#6B7280",
                      letterSpacing: "0.08em",
                    }}
                  >
                    АХИЦЛАЛ
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-jetbrains)",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      color: progress === 100 ? "#22C55E" : "#8B5CF6",
                    }}
                  >
                    {progress}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={progress}
                  onChange={(e) => onProgressChange(task.id, Number(e.target.value))}
                  disabled={isCompleting}
                  style={{
                    width: "100%",
                    height: "4px",
                    appearance: "none",
                    WebkitAppearance: "none",
                    background: `linear-gradient(to right, #8B5CF6 ${progress}%, #1F2937 ${progress}%)`,
                    borderRadius: "2px",
                    outline: "none",
                    cursor: isCompleting ? "not-allowed" : "pointer",
                    accentColor: "#8B5CF6",
                  }}
                />
                <div className="flex items-center justify-between mt-3">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={progress}
                    onChange={(e) => {
                      const v = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                      onProgressChange(task.id, v);
                    }}
                    disabled={isCompleting}
                    style={{
                      width: "56px",
                      background: "#1A1A1A",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "3px",
                      padding: "4px 6px",
                      color: "#E8E8E8",
                      fontFamily: "var(--font-jetbrains)",
                      fontSize: "0.7rem",
                      textAlign: "center",
                      outline: "none",
                    }}
                  />
                  <button
                    onClick={() => onComplete(task)}
                    disabled={progress < 100 || isCompleting}
                    style={{
                      background: progress === 100 && !isCompleting ? "#22C55E" : "#1F2937",
                      color: progress === 100 && !isCompleting ? "#fff" : "#4B5563",
                      border: "none",
                      borderRadius: "3px",
                      padding: "6px 16px",
                      fontFamily: "var(--font-jetbrains)",
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      cursor: progress === 100 && !isCompleting ? "pointer" : "not-allowed",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      transition: "all 0.15s",
                    }}
                  >
                    {isCompleting ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Check size={12} />
                    )}
                    Дуусгах
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ─── Page ─── */
export default function MemberTasksPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"current" | "history">("current");
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [completing, setCompleting] = useState<string | null>(null);
  const [localProgress, setLocalProgress] = useState<Record<string, number>>({});
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["userTasks", user?.uid, userData?.team],
    queryFn: () =>
      new Promise<Task[]>((resolve) => {
        if (!user || !userData) {
          resolve([]);
          return;
        }
        const targets: string[] = [user.uid, "all"];
        if (userData.team) targets.push(`team:${userData.team}`);
        const q = query(
          collection(db, "tasks"),
          where("assignedTo", "array-contains-any", targets),
        );
        const unsub = onSnapshot(q, (snap) => {
          resolve(snap.docs.map((d) => ({ ...d.data(), id: d.id })) as Task[]);
        });
        return unsub;
      }),
    enabled: !!user?.uid,
  });

  const handleProgressChange = (taskId: string, value: number) => {
    setLocalProgress((prev) => ({ ...prev, [taskId]: value }));
  };

  const handleComplete = async (task: Task) => {
    if (!user) return;
    setCompleting(task.id);
    try {
      await runTransaction(db, async (transaction) => {
        const taskRef = doc(db, "tasks", task.id);
        const taskSnap = await transaction.get(taskRef);
        if (!taskSnap.exists()) throw new Error("Task олдсонгүй");

        const data = taskSnap.data() as Task;
        const completed = data.assigneeCompleted?.[user.uid] === true;
        if (completed) throw new Error("Аль хэдийн дууссан байна");

        transaction.set(
          taskRef,
          {
            assigneeProgress: { [user.uid]: 100 },
            assigneeCompleted: { [user.uid]: true },
          },
          { merge: true },
        );

        const userRef = doc(db, "users", user.uid);
        transaction.update(userRef, {
          totalPoints: increment(task.points),
        });

        const historyRef = doc(collection(db, "pointsHistory"));
        transaction.set(historyRef, {
          uid: user.uid,
          taskId: task.id,
          points: task.points,
          reason: task.title,
          createdAt: serverTimestamp(),
        });
      });

      toast.success(`Task дууслаа! +${task.points} оноо нэмэгдлээ`);
      setLocalProgress((prev) => {
        const next = { ...prev };
        delete next[task.id];
        return next;
      });
      setSelectedTaskId(null);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["userTasks"] }),
        queryClient.invalidateQueries({ queryKey: ["userData"] }),
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Алдаа гарлаа";
      if (msg !== "Аль хэдийн дууссан байна") {
        toast.error(msg);
      }
    } finally {
      setCompleting(null);
    }
  };

  if (authLoading || tasksLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeTasks = tasks.filter((t) => t.status !== "completed" && t.status !== "approved");
  const historyTasks = tasks.filter((t) => t.status === "completed" || t.status === "approved");

  const currentTasks = tab === "current" ? activeTasks : historyTasks;
  const filtered =
    filter === "all"
      ? currentTasks
      : currentTasks.filter((t) => {
          if (filter === "done") return t.status === "completed" || t.status === "approved";
          if (filter === "pending")
            return (
              t.status !== "completed" &&
              t.status !== "approved" &&
              !(t.dueDate && isPast(new Date(t.dueDate)))
            );
          if (filter === "overdue")
            return (
              t.status !== "completed" &&
              t.status !== "approved" &&
              t.dueDate &&
              isPast(new Date(t.dueDate))
            );
          return true;
        });

  const selectedTask = selectedTaskId ? (tasks.find((t) => t.id === selectedTaskId) ?? null) : null;

  return (
    <div style={{ maxWidth: "800px" }}>
      <div className="flex items-center justify-between mb-8">
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
      <div className="flex mb-6" style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.07)" }}>
        {[
          { key: "current", label: "Одоогийн" },
          { key: "history", label: "Түүх" },
        ].map(({ key, label }) => (
          <button
            key={key}
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
        <div className="flex gap-2 mb-5 flex-wrap">
          {(
            [
              { key: "all", label: "Бүгд", color: "#6B7280" },
              { key: "pending", label: "Хүлээгдэж буй", color: "#FBBF24" },
              { key: "done", label: "Дууссан", color: "#22C55E" },
              { key: "overdue", label: "Хоцорсон", color: "#EF4444" },
            ] as { key: FilterStatus; label: string; color: string }[]
          ).map(({ key, label, color }) => (
            <button
              key={key}
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
            uid={user?.uid ?? ""}
            onClick={() => setSelectedTaskId(t.id)}
          />
        ))}
        {filtered.length === 0 && (
          <div
            className="text-center py-12"
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
      <TaskDetailDialog
        task={selectedTask}
        uid={user?.uid ?? ""}
        open={selectedTaskId !== null}
        onOpenChange={(o) => {
          if (!o) setSelectedTaskId(null);
        }}
        progress={
          selectedTask
            ? (localProgress[selectedTask.id] ??
              selectedTask.assigneeProgress?.[user?.uid ?? ""] ??
              0)
            : 0
        }
        onProgressChange={handleProgressChange}
        onComplete={handleComplete}
        completing={completing}
      />
    </div>
  );
}

"use client";

import { AssigneeList } from "@/components/assignee-list";
import { DeadlineBadge } from "@/components/deadline-badge";
import { PageContainer, PageHeader } from "@/components/page-container";
import { PageSpinner } from "@/components/page-spinner";
import { ReviewButton } from "@/components/review-button";
import { TaskDetailDialog } from "@/components/task-detail-dialog";
import { TaskEditDialog } from "@/components/task-edit-dialog";
import { TeamFilter } from "@/components/team-filter";
import { useAuth } from "@/context/AuthContext";
import { useAllTasks } from "@/hooks/useAllTasks";
import { useMembers } from "@/hooks/useMembers";
import { useResolvedTask, useSelectedTask } from "@/hooks/useSelectedTask";
import { ALL_TEAMS, useTeamFilter } from "@/hooks/useTeamFilter";
import { ASSIGN_ALL, MAX_TASK_POINTS, TEAM_LABELS, type Team, teamToken } from "@/lib/constants";
import { db } from "@/lib/firebase";
import { canEditTask } from "@/lib/permissions";
import { deriveTaskSummary, resolveAssignees } from "@/lib/tasks";
import { getInitials } from "@/lib/utils";
import { Task, User } from "@/types";
import { addDoc, collection } from "firebase/firestore";
import { Check, Loader2, Pencil, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export type WorkspaceScope = "admin" | "lead";

/** Assignee rows drawn per task card before the rest collapse into a count. */
const ROWS_PER_CARD = 5;

function toDateTimeLocalValue(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function defaultDeadlineValue(): string {
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 7);
  deadline.setSeconds(0, 0);
  return toDateTimeLocalValue(deadline);
}

function resolveAssignedLabel(entry: string, members: User[]): string {
  if (entry === ASSIGN_ALL) return "Бүх гишүүд";
  if (entry.startsWith("team:")) {
    const key = entry.slice(5) as Team;
    return TEAM_LABELS[key] ?? entry;
  }
  return members.find((m) => m.uid === entry)?.name ?? entry;
}

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-jetbrains)",
  fontSize: "0.8125rem",
  color: "#6B7280",
  letterSpacing: "0.1em",
  display: "block",
  marginBottom: "8px",
};

const fieldStyle: React.CSSProperties = {
  width: "100%",
  background: "#1A1A1A",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  borderRadius: "3px",
  padding: "10px 12px",
  color: "#E8E8E8",
  fontFamily: "var(--font-montserrat)",
  fontSize: "1.0rem",
  outline: "none",
  boxSizing: "border-box",
};

export interface TaskWorkspaceProps {
  scope: WorkspaceScope;
}

/**
 * Task creation and oversight, shared by the admin panel and the lead workspace.
 *
 * The two scopes differ only in reach: an admin assigns to anyone and sees every
 * task, while a lead assigns within their own team and sees the tasks that at
 * least one of their team-mates is on — including tasks an admin created.
 */
export function TaskWorkspace({ scope }: TaskWorkspaceProps) {
  const { userData, loading: authLoading } = useAuth();
  const { members, loading: membersLoading } = useMembers();
  const { tasks, loading: tasksLoading } = useAllTasks();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [points, setPoints] = useState("100");
  const [deadline, setDeadline] = useState(defaultDeadlineValue);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  const myTeam = userData?.team;
  // A lead lands on their own team; an admin on everyone.
  const [team, setTeam] = useTeamFilter(scope === "lead" ? (myTeam ?? ALL_TEAMS) : ALL_TEAMS);
  const { taskId, open, close } = useSelectedTask();
  const { task: selectedTask, loading: selectedLoading } = useResolvedTask(taskId, tasks);

  const assignable = useMemo(
    () =>
      members.filter(
        (m) => m.role !== "admin" && (scope === "admin" || (!!myTeam && m.team === myTeam)),
      ),
    [members, scope, myTeam],
  );

  /**
   * The tasks on screen, each paired with the people it resolves to.
   *
   * `resolveAssignees` walks the whole directory per task, so it runs exactly
   * once here and the result is carried through to the rows — it used to be
   * recomputed a second time inside the render loop.
   */
  const visibleTasks = useMemo(() => {
    const withAssignees = tasks.map((task) => ({
      task,
      assignees: resolveAssignees(task, members),
    }));

    // A lead only sees tasks one of their team-mates is on, including tasks an
    // admin created. The team filter then narrows that further.
    const base =
      scope === "admin"
        ? withAssignees
        : myTeam
          ? withAssignees.filter((t) => t.assignees.some((a) => a.team === myTeam))
          : [];

    if (team === ALL_TEAMS) return base;
    return base.filter((t) => t.assignees.some((a) => a.team === team));
  }, [tasks, members, scope, myTeam, team]);

  function toggleMember(uid: string) {
    setSelectedMembers((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid],
    );
  }

  function resetForm() {
    setTitle("");
    setDescription("");
    setPoints("100");
    setDeadline(defaultDeadlineValue());
    setSelectedMembers([]);
  }

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!userData || !title.trim()) return;

    if (scope === "lead" && !myTeam) {
      toast.error("Танд баг оноогдоогүй тул даалгавар үүсгэх боломжгүй");
      return;
    }
    if (selectedMembers.length === 0) {
      toast.error("Нэг эсвэл түүнээс олон гишүүн сонгоно уу");
      return;
    }

    const deadlineDate = new Date(deadline);
    if (Number.isNaN(deadlineDate.getTime()) || deadlineDate <= new Date()) {
      toast.error("Хүлээн авах эцсийн хугацааг ирээдүйд сонгоно уу");
      return;
    }

    const pointValue = Number(points);
    if (!Number.isInteger(pointValue) || pointValue < 0 || pointValue > MAX_TASK_POINTS) {
      toast.error(`Оноог 0–${MAX_TASK_POINTS} хооронд бүхэл тоогоор оруулна уу`);
      return;
    }

    // A lead may only ever target their own team. The security rules block the
    // "all" token and other teams' tokens, but they cannot check individual
    // uids, so this is the only place that check happens.
    if (scope === "lead" && selectedMembers.some((uid) => !assignable.some((m) => m.uid === uid))) {
      toast.error("Зөвхөн өөрийн багийн гишүүдэд даалгавар өгөх боломжтой");
      return;
    }

    const everyoneSelected = selectedMembers.length === assignable.length;
    const assignedTo = everyoneSelected
      ? [scope === "admin" ? ASSIGN_ALL : teamToken(myTeam as Team)]
      : [...selectedMembers];

    setSaving(true);
    try {
      await addDoc(collection(db, "tasks"), {
        title: title.trim(),
        description: description.trim(),
        points: pointValue,
        dueDate: deadlineDate,
        createdAt: new Date(),
        createdBy: userData.uid,
        createdByRole: userData.role,
        assignedTo,
        ...(scope === "lead" ? { team: myTeam } : {}),
      });
      resetForm();
      toast.success("Task амжилттай үүсгэгдлээ");
    } catch (err) {
      console.error("Task үүсгэхэд алдаа гарлаа", err);
      toast.error("Task үүсгэхэд алдаа гарлаа");
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || membersLoading || tasksLoading) {
    return <PageSpinner />;
  }

  if (scope === "lead" && !myTeam) {
    return (
      <div
        className="border"
        style={{
          background: "#141414",
          borderColor: "rgba(255, 255, 255, 0.07)",
          borderRadius: "4px",
          padding: "28px",
          maxWidth: "640px",
        }}
      >
        <p style={{ fontFamily: "var(--font-montserrat)", fontSize: "1.0rem", color: "#E8E8E8" }}>
          Танд баг оноогдоогүй байна.
        </p>
        <p
          style={{
            fontFamily: "var(--font-montserrat)",
            fontSize: "0.875rem",
            color: "#6B7280",
            marginTop: "6px",
          }}
        >
          Багийн ажлын талбар нь тодорхой нэг багт зориулагдсан. Админ бол "Task үүсгэх" хуудсыг
          ашиглана уу.
        </p>
      </div>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="ДААЛГАВАР ҮҮСГЭХ"
        description={
          scope === "admin" ? "ADMIN PANEL" : `БАГИЙН АЖЛЫН ТАЛБАР · ${TEAM_LABELS[myTeam as Team]}`
        }
      />

      <div
        className="border"
        style={{
          background: "#141414",
          borderColor: "rgba(255, 255, 255, 0.07)",
          borderRadius: "4px",
          padding: "28px",
          marginBottom: "32px",
        }}
      >
        <form onSubmit={handleCreateTask} className="flex flex-col gap-5">
          <div>
            <label htmlFor="task-title" style={labelStyle}>
              ГАРЧИГ *
            </label>
            <input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Даалгаврын гарчиг..."
              required
              style={fieldStyle}
            />
          </div>

          <div>
            <label htmlFor="task-description" style={labelStyle}>
              ТАЙЛБАР
            </label>
            <textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Даалгаврын дэлгэрэнгүй тайлбар..."
              style={{ ...fieldStyle, resize: "vertical" }}
            />
          </div>

          <div style={{ maxWidth: "200px" }}>
            <label htmlFor="task-points" style={labelStyle}>
              ДЭЭД ОНОО *
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="task-points"
                type="number"
                min={0}
                max={MAX_TASK_POINTS}
                step={1}
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                style={{
                  ...fieldStyle,
                  padding: "10px 36px 10px 12px",
                  color: "#22C55E",
                  fontFamily: "var(--font-jetbrains)",
                  fontSize: "1.0rem",
                  fontWeight: 700,
                }}
              />
              <span
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#22C55E",
                  fontFamily: "var(--font-jetbrains)",
                  fontSize: "0.8125rem",
                }}
              >
                pts
              </span>
            </div>
            <p
              style={{
                color: "#4B5563",
                fontFamily: "var(--font-montserrat)",
                fontSize: "0.875rem",
                marginTop: "6px",
              }}
            >
              Үнэлэхдээ 0-ээс энэ хүртэлх оноо өгнө.
            </p>
          </div>

          <div style={{ maxWidth: "320px" }}>
            <label htmlFor="task-deadline" style={labelStyle}>
              ХҮЛЭЭН АВАХ ЭЦСИЙН ХУГАЦАА *
            </label>
            <input
              id="task-deadline"
              type="datetime-local"
              value={deadline}
              min={toDateTimeLocalValue(new Date())}
              onChange={(e) => setDeadline(e.target.value)}
              required
              style={{
                ...fieldStyle,
                fontFamily: "var(--font-jetbrains)",
                fontSize: "0.875rem",
              }}
            />
            <p
              style={{
                color: "#4B5563",
                fontFamily: "var(--font-montserrat)",
                fontSize: "0.875rem",
                marginTop: "6px",
              }}
            >
              Энэ цагаас хойш task хүлээн авах боломжгүй болно.
            </p>
          </div>

          <div>
            <span style={labelStyle}>ГИШҮҮД СОНГОХ ({selectedMembers.length} СОНГОГДСОН)</span>
            {assignable.length === 0 ? (
              <p
                style={{
                  color: "#4B5563",
                  fontFamily: "var(--font-montserrat)",
                  fontSize: "0.875rem",
                }}
              >
                {scope === "lead" ? "Таны багт гишүүн алга байна." : "Гишүүн бүртгэгдээгүй байна."}
              </p>
            ) : (
              <>
                <div className="mb-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedMembers(assignable.map((m) => m.uid))}
                    style={{
                      background: "transparent",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "3px",
                      padding: "4px 10px",
                      color: "#9CA3AF",
                      fontFamily: "var(--font-jetbrains)",
                      fontSize: "0.75rem",
                      cursor: "pointer",
                    }}
                  >
                    {scope === "admin" ? "БҮХ ГИШҮҮД" : "БҮХ БАГИЙНХАН"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedMembers([])}
                    style={{
                      background: "transparent",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "3px",
                      padding: "4px 10px",
                      color: "#9CA3AF",
                      fontFamily: "var(--font-jetbrains)",
                      fontSize: "0.75rem",
                      cursor: "pointer",
                    }}
                  >
                    ЦЭВЭРЛЭХ
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {assignable.map((m) => {
                    const sel = selectedMembers.includes(m.uid);
                    return (
                      <button
                        key={m.uid}
                        type="button"
                        onClick={() => toggleMember(m.uid)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "5px 12px",
                          borderRadius: "20px",
                          border: `1px solid ${sel ? "#8B5CF6" : "rgba(255, 255, 255, 0.1)"}`,
                          background: sel ? "rgba(139, 92, 246, 0.125)" : "transparent",
                          color: sel ? "#8B5CF6" : "#9CA3AF",
                          cursor: "pointer",
                          fontFamily: "var(--font-montserrat)",
                          fontSize: "0.875rem",
                          fontWeight: 600,
                          transition: "all 0.15s",
                        }}
                      >
                        <span style={{ fontFamily: "var(--font-jetbrains)", fontSize: "0.75rem" }}>
                          {getInitials(m.name)}
                        </span>
                        {m.name}
                        {sel && <X size={10} />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              style={{
                background: saving ? "#22C55E" : "#8B5CF6",
                color: "#fff",
                border: "none",
                borderRadius: "3px",
                padding: "11px 24px",
                fontFamily: "var(--font-jetbrains)",
                fontWeight: 700,
                fontSize: "0.875rem",
                letterSpacing: "0.08em",
                cursor: saving ? "not-allowed" : "pointer",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {saving ? "ҮҮСГЭЖ БАЙНА..." : "ДААЛГАВАР ҮҮСГЭХ →"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              style={{
                background: "transparent",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "3px",
                padding: "11px 16px",
                color: "#6B7280",
                fontFamily: "var(--font-jetbrains)",
                fontSize: "0.875rem",
                cursor: "pointer",
              }}
            >
              ЦЭВЭРЛЭХ
            </button>
          </div>
        </form>
      </div>

      <h2
        style={{
          fontFamily: "var(--font-jetbrains)",
          fontSize: "0.875rem",
          fontWeight: 700,
          color: "#6B7280",
          letterSpacing: "0.1em",
          marginBottom: "16px",
        }}
      >
        БАЙГАА ДААЛГАВРУУД ({visibleTasks.length})
      </h2>

      <div style={{ marginBottom: "16px", maxWidth: "520px" }}>
        <TeamFilter value={team} onChange={setTeam} />
      </div>

      <div className="flex flex-col gap-2">
        {visibleTasks.length === 0 && (
          <p
            style={{
              color: "#4B5563",
              fontFamily: "var(--font-montserrat)",
              fontSize: "0.875rem",
            }}
          >
            Одоогоор даалгавар алга байна.
          </p>
        )}

        {visibleTasks.map(({ task, assignees }) => {
          // The headline counts every assignee; the rows show the filtered team.
          const rows = team === ALL_TEAMS ? assignees : assignees.filter((a) => a.team === team);
          const summary = deriveTaskSummary(task, assignees);

          return (
            <div
              key={task.id}
              role="button"
              tabIndex={0}
              onClick={() => open(task.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  open(task.id);
                }
              }}
              className="cursor-pointer border transition-colors hover:border-[#8B5CF6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6]/50"
              style={{
                background: "#141414",
                borderColor: "rgba(255, 255, 255, 0.07)",
                borderRadius: "4px",
                padding: "14px 16px",
                borderLeft: `3px solid ${summary.color}`,
              }}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="type-card-title mb-1.5 line-clamp-2">{task.title}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span
                      style={{
                        fontFamily: "var(--font-jetbrains)",
                        fontSize: "0.8125rem",
                        color: summary.color,
                        letterSpacing: "0.06em",
                      }}
                    >
                      {summary.label} · {summary.reviewed}/{summary.total} үнэлэгдсэн
                    </span>
                    <DeadlineBadge task={task} />
                  </div>
                  <p
                    style={{
                      color: "#4B5563",
                      fontSize: "0.8125rem",
                      fontFamily: "var(--font-jetbrains)",
                      marginTop: "4px",
                    }}
                  >
                    {task.assignedTo.map((a) => resolveAssignedLabel(a, members)).join(", ")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {canEditTask(userData, task) && (
                    <button
                      type="button"
                      onClick={(event) => {
                        // The card itself opens the detail dialog on click.
                        event.stopPropagation();
                        setEditing(task);
                      }}
                      aria-label="Даалгавар засах"
                      className="flex items-center gap-1 rounded-sm border border-white/10 px-2 py-1 text-[#9CA3AF] transition-colors hover:border-[#8B5CF6]/60 hover:text-[#C4B5FD]"
                      style={{
                        fontFamily: "var(--font-jetbrains)",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        letterSpacing: "0.04em",
                      }}
                    >
                      <Pencil size={11} />
                      ЗАСАХ
                    </button>
                  )}
                  <div
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
                        fontSize: "0.875rem",
                        fontWeight: 700,
                        color: "#22C55E",
                      }}
                    >
                      {task.points} pts
                    </span>
                  </div>
                </div>
              </div>

              <AssigneeList
                task={task}
                assignees={rows}
                viewer={userData}
                max={ROWS_PER_CARD}
                onShowAll={() => open(task.id)}
                renderAction={(assignee) => (
                  <ReviewButton task={task} assignee={assignee} viewer={userData} />
                )}
              />
            </div>
          );
        })}
      </div>

      <TaskEditDialog
        task={editing}
        assignable={assignable}
        scope={scope}
        team={myTeam}
        open={editing !== null}
        onOpenChange={(next) => {
          if (!next) setEditing(null);
        }}
      />

      <TaskDetailDialog
        task={selectedTask}
        loadingTask={selectedLoading}
        members={members}
        viewer={userData}
        open={taskId !== null}
        onOpenChange={(next) => {
          if (!next) close();
        }}
      />
    </PageContainer>
  );
}

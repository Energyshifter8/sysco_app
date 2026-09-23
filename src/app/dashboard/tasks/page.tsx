"use client";

import { PageContainer, PageHeader } from "@/components/page-container";
import { PageSpinner } from "@/components/page-spinner";
import { TaskCard } from "@/components/task-card";
import { TaskDetailDialog } from "@/components/task-detail-dialog";
import { useAuth } from "@/context/AuthContext";
import { useAssignedTasks } from "@/hooks/useAssignedTasks";
import { useMembers } from "@/hooks/useMembers";
import { useResolvedTask, useSelectedTask } from "@/hooks/useSelectedTask";
import { ASSIGNEE_STATUS_LABELS, type AssigneeStatus } from "@/lib/constants";
import { getAssigneeReview, getAssigneeStatus, isTaskOverdue, resolveAssignees } from "@/lib/tasks";
import { Suspense } from "react";
import { useState } from "react";

type FilterStatus = "all" | AssigneeStatus | "overdue";

/* ─── Page ─── */
function MemberTasksContent() {
  const { user, userData, loading: authLoading } = useAuth();
  const { tasks, loading: tasksLoading } = useAssignedTasks();
  const { members } = useMembers();
  const { taskId, open, close } = useSelectedTask();
  const { task: selectedTask, loading: selectedLoading } = useResolvedTask(taskId, tasks);

  const [tab, setTab] = useState<"current" | "history">("current");
  const [filter, setFilter] = useState<FilterStatus>("all");

  const uid = user?.uid ?? "";

  if (authLoading || tasksLoading) {
    return <PageSpinner />;
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

  return (
    <PageContainer>
      <PageHeader title="ДААЛГАВРЫН ЖАГСААЛТ" description={`${filtered.length} ДААЛГАВАР`} />

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
            onOpen={() => open(t.id)}
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

export default function MemberTasksPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <MemberTasksContent />
    </Suspense>
  );
}

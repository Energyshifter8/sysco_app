"use client";

import { EmptyState, PageContainer, PageHeader } from "@/components/page-container";
import { PageSpinner } from "@/components/page-spinner";
import { TaskCard } from "@/components/task-card";
import { TaskDetailDialog } from "@/components/task-detail-dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useAssignedTasks } from "@/hooks/useAssignedTasks";
import { useMembers } from "@/hooks/useMembers";
import { useResolvedTask, useSelectedTask } from "@/hooks/useSelectedTask";
import { ASSIGNEE_STATUS_LABELS, type AssigneeStatus } from "@/lib/constants";
import { getAssigneeReview, getAssigneeStatus, isTaskOverdue, resolveAssignees } from "@/lib/tasks";
import { cn } from "@/lib/utils";
import { ClipboardList } from "lucide-react";
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
      <div className="mb-6 flex overflow-x-auto border-b border-white/8">
        {[
          { key: "current", label: "Одоогийн", count: active.length },
          { key: "history", label: "Түүх", count: reviewed.length },
        ].map(({ key, label, count }) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setTab(key as "current" | "history");
              setFilter("all");
            }}
            className={cn(
              "-mb-px shrink-0 border-b-2 px-5 py-3 font-mono text-sm font-bold tracking-[0.04em] transition-colors",
              tab === key
                ? "border-[#8B5CF6] text-[#8B5CF6]"
                : "border-transparent text-[#6B7280] hover:text-[#9CA3AF]",
            )}
          >
            {label}
            <span className="ml-2 text-xs opacity-70">{count}</span>
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
              className="h-9 rounded-lg border px-3.5 font-mono text-xs tracking-[0.06em] transition-colors"
              style={{
                borderColor: filter === key ? color : "rgba(255,255,255,0.1)",
                background: filter === key ? `${color}1A` : "transparent",
                color: filter === key ? color : "#9CA3AF",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Task list */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-white/8 bg-[#141414]">
          <EmptyState
            icon={<ClipboardList size={18} />}
            message={
              tab === "history"
                ? "Баталгаажсан даалгавар хараахан алга."
                : "Энэ шүүлтүүрт тохирох даалгавар алга."
            }
            action={
              filter !== "all" ? (
                <Button variant="outline" size="sm" onClick={() => setFilter("all")}>
                  Бүгдийг харах
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(320px,1fr))]">
          {filtered.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              uid={uid}
              assignees={resolveAssignees(t, members)}
              onOpen={() => open(t.id)}
            />
          ))}
        </div>
      )}

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

"use client";

import { EmptyState, PageContainer } from "@/components/page-container";
import { PageSpinner } from "@/components/page-spinner";
import { TaskCard } from "@/components/task-card";
import { TaskDetailDialog } from "@/components/task-detail-dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useAssignedTasks } from "@/hooks/useAssignedTasks";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useMembers } from "@/hooks/useMembers";
import { useResolvedTask, useSelectedTask } from "@/hooks/useSelectedTask";
import { getAssigneeReview, resolveAssignees } from "@/lib/tasks";
import { getInitials } from "@/lib/utils";
import { CheckCircle2, ClipboardList, Clock, Loader2, Sparkles, Star, Trophy } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

function StatCard({
  label,
  value,
  accent,
  icon,
  hint,
}: {
  label: string;
  value: string | number;
  accent: string;
  icon: React.ReactNode;
  hint?: string;
}) {
  return (
    <div
      className="surface-card dashboard-stat-card flex h-full flex-col justify-between gap-4 rounded-xl p-5"
      style={
        {
          "--stat-accent": accent,
          "--stat-glow": `${accent}42`,
          "--stat-shadow": `${accent}20`,
        } as React.CSSProperties
      }
    >
      <div className="flex items-center gap-2.5">
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-lg"
          style={{ color: accent, background: `${accent}16`, border: `1px solid ${accent}25` }}
        >
          {icon}
        </span>
        <span className="type-label">{label}</span>
      </div>
      <div>
        <div className="type-stat leading-none" style={{ color: accent }}>
          {value}
        </div>
        {hint && <p className="type-meta mt-1.5">{hint}</p>}
      </div>
    </div>
  );
}

function rankMedal(i: number) {
  if (i === 0) return { color: "#FBBF24", label: "#1" };
  if (i === 1) return { color: "#9CA3AF", label: "#2" };
  if (i === 2) return { color: "#CD7F32", label: "#3" };
  return { color: "#4B5563", label: `#${i + 1}` };
}

function getMajorLabel(major?: string | null): string {
  if (!major) return "";
  const map: Record<string, string> = {
    computer_science: "Компьютерын ухаан",
    software_engineering: "Програм хангамж",
    data_science: "Өгөгдлийн ухаан",
    information_systems: "Мэдээллийн систем",
  };
  return map[major] || major;
}

function DashboardContent() {
  const { user, userData, loading: authLoading } = useAuth();
  const { entries, loading: leaderboardLoading } = useLeaderboard();

  const { tasks, loading: tasksLoading } = useAssignedTasks();
  const { members } = useMembers();
  const { taskId, open, close } = useSelectedTask();
  const { task: selectedTask, loading: selectedLoading } = useResolvedTask(taskId, tasks);

  if (authLoading || !user || !userData) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const userRank = entries.find((e) => e.uid === user.uid)?.rank ?? "-";
  const activeTasks = tasks.filter((t) => getAssigneeReview(t, user.uid) === undefined);
  const completedTasks = tasks.filter((t) => getAssigneeReview(t, user.uid) !== undefined);
  const recentTasks = tasks.slice(0, 4);
  const topThree = entries.slice(0, 3);

  return (
    <PageContainer>
      {/* Header */}
      <div className="surface-card relative mb-6 overflow-hidden rounded-2xl px-5 py-6 sm:px-7">
        <div
          className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(139, 92, 246, 0.24), transparent 68%)",
          }}
        />
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#8B5CF6]/20 bg-[#8B5CF6]/10 px-2.5 py-1 text-[#C4B5FD]">
              <Sparkles size={12} />
              <span className="font-mono text-xs font-bold tracking-[0.09em]">ӨНӨӨДӨР</span>
            </div>
            <h1 className="type-page-title mb-1.5">
              Сайн байна уу, {(userData.name ?? "Хэрэглэгч").split(" ")[0]}
            </h1>
            <p className="type-page-subtitle">
              {new Date().toLocaleDateString("mn-MN", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div
              className="rounded-xl border border-white/8 bg-black/15 px-4 py-2.5 text-right"
              style={{ backdropFilter: "blur(8px)" }}
            >
              <p className="type-label">НИЙТ ОНОО</p>
              <p className="type-stat-sm leading-tight text-[#C4B5FD]">
                {userData.totalPoints.toLocaleString()}
              </p>
            </div>
            {userData.role === "admin" && (
              <div className="flex h-11 items-center rounded-lg border border-[#8B5CF6]/25 bg-[#8B5CF6]/12 px-3 font-mono text-xs font-bold tracking-[0.08em] text-[#C4B5FD]">
                ADMIN
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stat Row */}
      <div className="mb-8 grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
        <StatCard
          label="НИЙТ ОНОО"
          value={userData.totalPoints.toLocaleString()}
          accent="#8B5CF6"
          icon={<Star size={16} />}
        />
        <StatCard
          label="ДУУССАН"
          value={completedTasks.length}
          accent="#22C55E"
          icon={<CheckCircle2 size={16} />}
          hint={`${tasks.length} даалгавраас`}
        />
        <StatCard
          label="ХҮЛЭЭГДЭЖ БУЙ"
          value={activeTasks.length}
          accent="#FBBF24"
          icon={<Clock size={16} />}
        />
        <StatCard
          label="ЭРЭМБЭ"
          value={typeof userRank === "number" ? `#${userRank}` : userRank}
          accent="#FBBF24"
          icon={<Trophy size={16} />}
          hint={entries.length > 0 ? `${entries.length} гишүүнээс` : undefined}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* Recent Tasks */}
        <div className="min-w-0">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="type-section-title mb-0">СҮҮЛИЙН ДААЛГАВРУУД</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/tasks" className="font-mono text-xs tracking-[0.06em]">
                БҮГДИЙГ ХАРАХ →
              </Link>
            </Button>
          </div>
          {tasksLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : recentTasks.length === 0 ? (
            <div className="surface-card rounded-xl">
              <EmptyState
                icon={<ClipboardList size={18} />}
                message="Танд одоогоор даалгавар оноогдоогүй байна."
                action={
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/dashboard/tasks">Жагсаалт руу</Link>
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(300px,1fr))]">
              {recentTasks.map((t) => (
                <TaskCard
                  key={t.id}
                  task={t}
                  uid={user.uid}
                  assignees={resolveAssignees(t, members)}
                  variant="surface"
                  onOpen={() => open(t.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Leaderboard preview */}
        <div className="min-w-0">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="type-section-title mb-0">ТОП ГИШҮҮД</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/leaderboard" className="font-mono text-xs tracking-[0.06em]">
                ДЭЛГЭРЭНГҮЙ →
              </Link>
            </Button>
          </div>
          <div className="border surface-card overflow-hidden rounded-xl">
            {leaderboardLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : topThree.length === 0 ? (
              <EmptyState icon={<Trophy size={18} />} message="Оноо авсан гишүүн хараахан алга." />
            ) : (
              topThree.map((m, i) => {
                const medal = rankMedal(i);
                return (
                  <div
                    key={m.uid}
                    className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.035]"
                    style={{
                      borderBottom: i < 2 ? "1px solid rgba(255, 255, 255, 0.06)" : "none",
                    }}
                  >
                    <span
                      className="w-8 shrink-0 font-mono text-base font-extrabold"
                      style={{ color: medal.color }}
                    >
                      {medal.label}
                    </span>
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#8B5CF6]/12 font-mono text-xs font-bold text-[#8B5CF6]">
                      {getInitials(m.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-sans text-sm font-semibold text-[#E8E8E8]">
                        {m.name}
                      </p>
                      <p className="type-meta truncate">
                        {getMajorLabel(m.major).split(" ")[0] || "—"}
                      </p>
                    </div>
                    <span className="type-stat-sm" style={{ color: medal.color }}>
                      {m.totalPoints}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
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

export default function DashboardPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <DashboardContent />
    </Suspense>
  );
}

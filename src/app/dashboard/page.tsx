"use client";

import { useAuth } from "@/context/AuthContext";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { db } from "@/lib/firebase";
import { asDate, formatDateTime, getInitials } from "@/lib/utils";
import { Task } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { isPast } from "date-fns";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { CheckCircle2, Clock, Loader2, Sparkles, Star, Trophy } from "lucide-react";
import Link from "next/link";

function StatCard({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: string | number;
  accent: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      className="surface-card dashboard-stat-card flex-1 rounded-xl"
      style={
        {
          "--stat-accent": accent,
          "--stat-glow": `${accent}42`,
          "--stat-shadow": `${accent}20`,
        padding: "18px 20px",
        } as React.CSSProperties
      }
    >
      <div className="flex items-center gap-2 mb-3">
        <span
          className="flex size-7 items-center justify-center rounded-lg"
          style={{ color: accent, background: `${accent}16`, border: `1px solid ${accent}25` }}
        >
          {icon}
        </span>
        <span
          style={{
            fontFamily: "var(--font-jetbrains)",
            fontSize: "0.65rem",
            color: "#6B7280",
            letterSpacing: "0.1em",
          }}
        >
          {label}
        </span>
      </div>
      <div
        style={{
          fontFamily: "var(--font-barlow-condensed)",
          fontSize: "2rem",
          fontWeight: 800,
          color: accent,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function TaskCard({ task }: { task: Task }) {
  const deadline = asDate(task.dueDate);
  const isOverdue = deadline ? isPast(deadline) : false;
  const statusColor =
    task.status === "completed" || task.status === "approved"
      ? "#22C55E"
      : isOverdue
        ? "#EF4444"
        : "#FBBF24";
  const statusLabel =
    task.status === "completed" || task.status === "approved"
      ? "Дууссан"
      : isOverdue
        ? "Хоцорсон"
        : "Хүлээгдэж буй";
  const StatusIcon =
    task.status === "completed" || task.status === "approved"
      ? CheckCircle2
      : isOverdue
        ? Clock
        : Clock;

  return (
    <div
      className="surface-card rounded-xl"
      style={{
        padding: "14px 16px",
        borderLeft: `3px solid ${statusColor}`,
        transition: "background 180ms ease, border-color 180ms ease, transform 180ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "#1A1A1A";
        e.currentTarget.style.borderColor = `${statusColor}55`;
        e.currentTarget.style.transform = "translateX(3px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "";
        e.currentTarget.style.borderColor = "";
        e.currentTarget.style.transform = "";
      }}
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
                color: statusColor,
                letterSpacing: "0.06em",
              }}
            >
              <StatusIcon size={12} />
              {statusLabel}
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

export default function DashboardPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const { entries, loading: leaderboardLoading } = useLeaderboard();

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["userTasks", user?.uid],
    queryFn: () =>
      new Promise<Task[]>((resolve) => {
        const targets = [user!.uid, "all"];
        if (userData?.team) targets.push(`team:${userData.team}`);
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

  if (authLoading || !user || !userData) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const userRank = entries.find((e) => e.uid === user.uid)?.rank ?? "-";
  const activeTasks = tasks.filter((t) => t.status !== "completed" && t.status !== "approved");
  const completedTasks = tasks.filter((t) => t.status === "completed" || t.status === "approved");
  const recentTasks = tasks.slice(0, 4);
  const topThree = entries.slice(0, 3);

  return (
    <div>
      {/* Header */}
      <div className="surface-card relative mb-6 overflow-hidden rounded-2xl px-5 py-6 sm:px-7">
        <div
          className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(139, 92, 246, 0.24), transparent 68%)" }}
        />
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#8B5CF6]/20 bg-[#8B5CF6]/10 px-2.5 py-1 text-[#C4B5FD]">
              <Sparkles size={12} />
              <span
                style={{
                  fontFamily: "var(--font-jetbrains)",
                  fontSize: "0.6rem",
                  fontWeight: 700,
                  letterSpacing: "0.09em",
                }}
              >
                ӨНӨӨДӨР
              </span>
            </div>
          <h1
            style={{
              fontFamily: "var(--font-jetbrains)",
              fontSize: "1.4rem",
              fontWeight: 800,
              color: "#E8E8E8",
              letterSpacing: "-0.02em",
              marginBottom: "6px",
            }}
          >
            Сайн байна уу, {(userData.name ?? "Хэрэглэгч").split(" ")[0]} 
          </h1>
            <p
            style={{
              color: "#6B7280",
              fontSize: "0.8rem",
              fontFamily: "var(--font-jetbrains)",
            }}
          >
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
              <p
                style={{
                  color: "#6B7280",
                  fontSize: "0.55rem",
                  fontFamily: "var(--font-jetbrains)",
                  letterSpacing: "0.1em",
                }}
              >
                НИЙТ ОНОО
              </p>
              <p
                style={{
                  color: "#C4B5FD",
                  fontSize: "1.25rem",
                  fontWeight: 800,
                  fontFamily: "var(--font-barlow-condensed)",
                  lineHeight: 1.1,
                }}
              >
                {userData.totalPoints.toLocaleString()}
              </p>
            </div>
            {userData.role === "admin" && (
              <div
                className="rounded-lg border border-[#8B5CF6]/25 bg-[#8B5CF6]/12 px-2.5 py-2"
                style={{
                  fontFamily: "var(--font-jetbrains)",
                  fontSize: "0.6rem",
                  fontWeight: 700,
                  color: "#C4B5FD",
                  letterSpacing: "0.08em",
                }}
              >
                ADMIN
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stat Row */}
      <div className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="НИЙТ ОНОО"
          value={userData.totalPoints.toLocaleString()}
          accent="#8B5CF6"
          icon={<Star size={14} />}
        />
        <StatCard
          label="ДУУССАН"
          value={completedTasks.length}
          accent="#22C55E"
          icon={<CheckCircle2 size={14} />}
        />
        <StatCard
          label="ХҮЛЭЭГДЭЖ БУЙ"
          value={activeTasks.length}
          accent="#FBBF24"
          icon={<Clock size={14} />}
        />
        <StatCard
          label="Rank"
          value={userRank}
          accent="#FBBF24"
          icon={<Trophy size={14} />}
        />
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Recent Tasks */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <h2
              className="transition-colors hover:text-[#C4B5FD]"
              style={{
                fontFamily: "var(--font-jetbrains)",
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "#6B7280",
                letterSpacing: "0.1em",
              }}
            >
              СҮҮЛИЙН ДААЛГАВРУУД
            </h2>
            <Link
              href="/dashboard/tasks"
              style={{
                fontFamily: "var(--font-jetbrains)",
                fontSize: "0.65rem",
                color: "#8B5CF6",
                letterSpacing: "0.06em",
              }}
            >
              БҮГДИЙГ ХАРАХ →
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {tasksLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : recentTasks.length === 0 ? (
              <div
                className="surface-card rounded-xl py-12 text-center"
                style={{
                  color: "#374151",
                  fontFamily: "var(--font-jetbrains)",
                  fontSize: "0.8rem",
                }}
              >
                ДААЛГАВАР ОЛДСОНГҮЙ
              </div>
            ) : (
              recentTasks.map((t) => <TaskCard key={t.id} task={t} />)
            )}
          </div>
        </div>

        {/* Leaderboard preview */}
        <div style={{ width: "280px", flexShrink: 0 }}>
          <div className="flex items-center justify-between mb-4">
            <h2
              style={{
                fontFamily: "var(--font-jetbrains)",
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "#6B7280",
                letterSpacing: "0.1em",
              }}
            >
              ТОП ГИШҮҮД
            </h2>
            <Link
              href="/dashboard/leaderboard"
              style={{
                fontFamily: "var(--font-jetbrains)",
                fontSize: "0.65rem",
                color: "#8B5CF6",
                letterSpacing: "0.06em",
              }}
            >
              ДЭЛГЭРЭНГҮЙ →
            </Link>
          </div>
          <div
            className="border surface-card overflow-hidden rounded-xl"
          >
            {leaderboardLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              topThree.map((m, i) => {
                const medal = rankMedal(i);
                return (
                  <div
                    key={m.uid}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.035]"
                    style={{
                      borderBottom: i < 2 ? "1px solid rgba(255, 255, 255, 0.06)" : "none",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-jetbrains)",
                        fontWeight: 800,
                        fontSize: "0.85rem",
                        color: medal.color,
                        width: "24px",
                      }}
                    >
                      {medal.label}
                    </span>
                    <div
                      className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold shrink-0"
                      style={{
                        background: "rgba(139, 92, 246, 0.125)",
                        color: "#8B5CF6",
                        fontFamily: "var(--font-jetbrains)",
                        fontSize: "0.6rem",
                      }}
                    >
                      {getInitials(m.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        style={{
                          color: "#E8E8E8",
                          fontSize: "0.82rem",
                          fontWeight: 600,
                          fontFamily: "var(--font-barlow)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {m.name}
                      </p>
                      <p
                        style={{
                          color: "#6B7280",
                          fontSize: "0.65rem",
                          fontFamily: "var(--font-jetbrains)",
                        }}
                      >
                        {getMajorLabel(m.major).split(" ")[0]}
                      </p>
                    </div>
                    <span
                      style={{
                        fontFamily: "var(--font-barlow-condensed)",
                        fontWeight: 800,
                        fontSize: "1rem",
                        color: medal.color,
                      }}
                    >
                      {m.totalPoints}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

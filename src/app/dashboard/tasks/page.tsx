"use client";

import { useState } from "react";
import { Loader2, Clock, CheckCircle2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { isPast } from "date-fns";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Task } from "@/types";

type FilterStatus = "all" | "pending" | "done" | "overdue";

function TaskCard({ task }: { task: Task }) {
  const isOverdue = task.dueDate ? isPast(new Date(task.dueDate)) : false;
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
      : Clock;

  return (
    <div
      className="border"
      style={{
        background: "#141414",
        borderColor: "rgba(255, 255, 255, 0.07)",
        borderRadius: "4px",
        padding: "14px 16px",
        borderLeft: `3px solid ${statusColor}`,
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
              {task.dueDate
                ? new Date(task.dueDate).toLocaleDateString("mn-MN")
                : "-"}
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

export default function MemberTasksPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<"current" | "history">("current");
  const [filter, setFilter] = useState<FilterStatus>("all");

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
          where("assignedTo", "array-contains-any", targets)
        );
        const unsub = onSnapshot(q, (snap) => {
          resolve(
            snap.docs.map((d) => ({ ...d.data(), id: d.id })) as Task[]
          );
        });
        return unsub;
      }),
    enabled: !!user?.uid,
  });

  if (authLoading || tasksLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeTasks = tasks.filter(
    (t) => t.status !== "completed" && t.status !== "approved"
  );
  const historyTasks = tasks.filter(
    (t) => t.status === "completed" || t.status === "approved"
  );

  const currentTasks = tab === "current" ? activeTasks : historyTasks;
  const filtered =
    filter === "all"
      ? currentTasks
      : currentTasks.filter((t) => {
          if (filter === "done") return t.status === "completed" || t.status === "approved";
          if (filter === "pending") return t.status !== "completed" && t.status !== "approved" && !(t.dueDate && isPast(new Date(t.dueDate)));
          if (filter === "overdue") return t.status !== "completed" && t.status !== "approved" && t.dueDate && isPast(new Date(t.dueDate));
          return true;
        });

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
      <div
        className="flex mb-6"
        style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.07)" }}
      >
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
              borderBottom:
                tab === key ? "2px solid #8B5CF6" : "2px solid transparent",
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
          {([
            { key: "all", label: "Бүгд", color: "#6B7280" },
            { key: "pending", label: "Хүлээгдэж буй", color: "#FBBF24" },
            { key: "done", label: "Дууссан", color: "#22C55E" },
            { key: "overdue", label: "Хоцорсон", color: "#EF4444" },
          ] as { key: FilterStatus; label: string; color: string }[]).map(
            ({ key, label, color }) => (
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
            )
          )}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {filtered.map((t) => (
          <TaskCard key={t.id} task={t} />
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
    </div>
  );
}

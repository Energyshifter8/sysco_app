"use client";

import { MemberRoleEditor } from "@/components/member-role-editor";
import { PageContainer, PageHeader } from "@/components/page-container";
import { PageSpinner } from "@/components/page-spinner";
import { TeamFilter } from "@/components/team-filter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { filterByTeam, useTeamFilter } from "@/hooks/useTeamFilter";
import { avatarPalette } from "@/lib/avatar";
import {
  ASSIGNEE_STATUS_COLORS,
  ASSIGNEE_STATUS_LABELS,
  ATTENDANCE_COLORS,
  ATTENDANCE_SHORT_LABELS,
  ROLE_LABELS,
  TEAM_SHORT_LABELS,
  type Team,
  getMajorLabel,
  isAttendanceStatus,
} from "@/lib/constants";
import { db } from "@/lib/firebase";
import { getAssigneeReview, getAssigneeStatus, resolveAssignees } from "@/lib/tasks";
import { getInitials } from "@/lib/utils";
import { AttendanceRecord, Task, User } from "@/types";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { Loader2, Search, Star, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

/** Everyone, or one team — the difference between the admin and lead screens. */
export type MembersScope = "all" | { team: Team };

/** How far back the roster looks for each member's most recent marked day. */
const ATTENDANCE_WINDOW_DAYS = 90;

const mono = { fontFamily: "var(--font-jetbrains)" } as const;
const labelStyle: React.CSSProperties = {
  ...mono,
  fontSize: "0.6rem",
  color: "#6B7280",
  letterSpacing: "0.1em",
};

function windowStart(): string {
  const from = new Date();
  from.setDate(from.getDate() - ATTENDANCE_WINDOW_DAYS);
  return `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}-${String(
    from.getDate(),
  ).padStart(2, "0")}`;
}

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
    <div className="surface-card flex-1 rounded-xl" style={{ padding: "16px 20px" }}>
      <div className="mb-2 flex items-center gap-2">
        <span style={{ color: accent }}>{icon}</span>
        <span style={labelStyle}>{label}</span>
      </div>
      <div
        className="tabular-nums"
        style={{
          fontFamily: "var(--font-barlow-condensed)",
          fontSize: "1.9rem",
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

interface MemberRow {
  user: User;
  /** Tasks assigned to them that nobody has scored yet. */
  activeTasks: number;
  latest: { date: string; status: string } | null;
}

/**
 * The member directory, for the whole club or for a single team.
 *
 * Role and team are only editable in the club-wide (admin) scope — a lead reads
 * their team-mates but does not administer them, which is what the security
 * rules allow as well.
 */
export function MembersWorkspace({ scope }: { scope: MembersScope }) {
  const [rows, setRows] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [team, setTeam] = useTeamFilter();
  const [selected, setSelected] = useState<User | null>(null);
  const [memberTasks, setMemberTasks] = useState<Task[]>([]);
  const [memberAttendance, setMemberAttendance] = useState<AttendanceRecord[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const scopedTeam = scope === "all" ? null : scope.team;
  const canAdminister = scope === "all";

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      // Tasks and the recent attendance window come along for the ride: both
      // columns are per-member summaries that would otherwise cost a query each.
      const [userSnap, taskSnap, attSnap] = await Promise.all([
        getDocs(
          scopedTeam
            ? query(collection(db, "users"), where("team", "==", scopedTeam))
            : query(collection(db, "users"), where("role", "!=", "admin")),
        ),
        getDocs(collection(db, "tasks")),
        getDocs(
          query(
            collection(db, "attendance"),
            where("date", ">=", windowStart()),
            orderBy("date", "desc"),
          ),
        ),
      ]);
      if (cancelled) return;

      const users = userSnap.docs
        .map((d) => d.data() as User)
        .filter((u) => u.role !== "admin")
        .sort((a, b) => b.totalPoints - a.totalPoints);

      const tasks = taskSnap.docs.map((d) => ({ ...d.data(), id: d.id }) as Task);

      // `attendance` arrives newest-first, so the first hit per uid is the
      // latest day anyone has marked for them.
      const latest = new Map<string, { date: string; status: string }>();
      for (const d of attSnap.docs) {
        const record = d.data();
        const uid = record.uid as string;
        if (!latest.has(uid)) latest.set(uid, { date: record.date, status: record.status });
      }

      // resolveAssignees walks the directory per task, so it runs once per task
      // here and the per-member counts are tallied from the result.
      const active = new Map<string, number>();
      for (const task of tasks) {
        for (const assignee of resolveAssignees(task, users)) {
          if (getAssigneeReview(task, assignee.uid) === undefined) {
            active.set(assignee.uid, (active.get(assignee.uid) ?? 0) + 1);
          }
        }
      }

      setRows(
        users.map((user) => ({
          user,
          activeTasks: active.get(user.uid) ?? 0,
          latest: latest.get(user.uid) ?? null,
        })),
      );
      setLoading(false);
    }

    load().catch((err) => {
      console.error("Гишүүдийг ачаалахад алдаа гарлаа", err);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [scopedTeam]);

  const filtered = useMemo(() => {
    // A team scope is already narrowed by the query; only the club-wide view
    // applies the `?team=` filter on top of it.
    const allowed = scopedTeam
      ? null
      : new Set(
          filterByTeam(
            rows.map((r) => r.user),
            team,
          ).map((u) => u.uid),
        );
    const needle = search.trim().toLowerCase();

    return rows.filter(
      (r) =>
        (allowed === null || allowed.has(r.user.uid)) &&
        (!needle ||
          r.user.name.toLowerCase().includes(needle) ||
          getMajorLabel(r.user.major).toLowerCase().includes(needle)),
    );
  }, [rows, scopedTeam, team, search]);

  async function openMember(user: User) {
    setSelected(user);
    setDetailLoading(true);
    try {
      const [taskSnap, attSnap] = await Promise.all([
        getDocs(query(collection(db, "tasks"), where("assignedTo", "array-contains", user.uid))),
        getDocs(
          query(
            collection(db, "attendance"),
            where("uid", "==", user.uid),
            orderBy("date", "desc"),
          ),
        ),
      ]);
      setMemberTasks(taskSnap.docs.map((d) => ({ ...d.data(), id: d.id }) as Task));
      setMemberAttendance(attSnap.docs.map((d) => ({ ...d.data(), id: d.id }) as AttendanceRecord));
    } catch (err) {
      console.error("Гишүүний мэдээллийг ачаалахад алдаа гарлаа", err);
    } finally {
      setDetailLoading(false);
    }
  }

  if (loading) return <PageSpinner />;

  const totalPoints = filtered.reduce((sum, r) => sum + r.user.totalPoints, 0);
  const columns = canAdminister
    ? "28px minmax(0,1fr) 130px 110px 72px 104px 72px 76px"
    : "28px minmax(0,1fr) 130px 72px 104px 72px 76px";

  return (
    <PageContainer>
      <PageHeader
        title={canAdminister ? "ГИШҮҮДИЙН ТОЙМ" : "БАГИЙН ГИШҮҮД"}
        description={`${rows.length} ГИШҮҮН${scopedTeam ? ` · ${TEAM_SHORT_LABELS[scopedTeam]}` : " — SYSCO&TECH CLUB"}`}
        actions={
          <div style={{ position: "relative" }}>
            <Search
              size={14}
              style={{
                position: "absolute",
                left: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#6B7280",
              }}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Хайх..."
              aria-label="Гишүүн хайх"
              style={{
                background: "#1A1A1A",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "3px",
                padding: "8px 12px 8px 30px",
                color: "#E8E8E8",
                fontFamily: "var(--font-barlow)",
                fontSize: "0.85rem",
                outline: "none",
                width: "200px",
              }}
            />
          </div>
        }
      />

      <div className="mb-5 flex flex-wrap gap-3">
        <StatCard
          label="НИЙТ ГИШҮҮН"
          value={filtered.length}
          accent="#8B5CF6"
          icon={<Users size={14} />}
        />
        <StatCard
          label="НИЙТ ОНОО"
          value={totalPoints.toLocaleString()}
          accent="#22C55E"
          icon={<Star size={14} />}
        />
      </div>

      {!scopedTeam && (
        <div style={{ marginBottom: "16px", maxWidth: "520px" }}>
          <TeamFilter value={team} onChange={setTeam} />
        </div>
      )}

      <div className="surface-card overflow-x-auto rounded-xl">
        <div style={{ minWidth: "760px" }}>
          <div
            className="grid gap-3 px-4 py-2.5"
            style={{
              gridTemplateColumns: columns,
              background: "rgba(255,255,255,0.02)",
              borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
            }}
          >
            {[
              "#",
              "ГИШҮҮН",
              "ЧИГЛЭЛ",
              ...(canAdminister ? ["БАГ"] : []),
              "КУРС",
              "ИДЭВХТЭЙ",
              "ИРЦ",
              "ОНОО",
            ].map((head) => (
              <span key={head} style={{ ...labelStyle, fontSize: "0.58rem" }}>
                {head}
              </span>
            ))}
          </div>

          {filtered.map((row, i) => {
            const { user, activeTasks, latest } = row;
            const palette = avatarPalette(user.uid);
            const status = latest?.status;
            return (
              <button
                key={user.uid}
                type="button"
                onClick={() => openMember(user)}
                className="grid w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/[0.035]"
                style={{
                  gridTemplateColumns: columns,
                  borderBottom:
                    i < filtered.length - 1 ? "1px solid rgba(255, 255, 255, 0.04)" : "none",
                }}
              >
                <span style={{ ...mono, fontSize: "0.72rem", color: "#4B5563" }}>{i + 1}</span>

                <span className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="flex size-7 shrink-0 items-center justify-center rounded"
                    style={{
                      background: palette.background,
                      border: `1px solid ${palette.border}`,
                      color: palette.color,
                      ...mono,
                      fontSize: "0.55rem",
                      fontWeight: 700,
                    }}
                  >
                    {getInitials(user.name)}
                  </span>
                  <span className="min-w-0">
                    <span
                      className="block truncate"
                      style={{
                        color: "#E8E8E8",
                        fontFamily: "var(--font-barlow)",
                        fontWeight: 600,
                        fontSize: "0.85rem",
                      }}
                    >
                      {user.name}
                    </span>
                    <span
                      className="block truncate"
                      style={{ ...mono, fontSize: "0.58rem", color: "#4B5563" }}
                    >
                      {ROLE_LABELS[user.role]}
                    </span>
                  </span>
                </span>

                <span
                  className="truncate"
                  style={{
                    color: "#9CA3AF",
                    fontFamily: "var(--font-barlow)",
                    fontSize: "0.78rem",
                  }}
                >
                  {getMajorLabel(user.major) || "—"}
                </span>

                {canAdminister && (
                  <span
                    className="truncate"
                    style={{
                      color: user.team ? "#9CA3AF" : "#374151",
                      fontFamily: "var(--font-barlow)",
                      fontSize: "0.78rem",
                    }}
                  >
                    {user.team ? TEAM_SHORT_LABELS[user.team] : "—"}
                  </span>
                )}

                <span style={{ ...mono, fontSize: "0.72rem", color: "#9CA3AF" }}>
                  {user.course ? `${user.course}-р` : "—"}
                </span>

                <span
                  className="tabular-nums"
                  style={{
                    ...mono,
                    fontSize: "0.72rem",
                    color: activeTasks > 0 ? "#FBBF24" : "#374151",
                  }}
                >
                  {activeTasks > 0 ? `${activeTasks} даалгавар` : "—"}
                </span>

                <span
                  className="truncate"
                  style={{
                    ...mono,
                    fontSize: "0.6rem",
                    fontWeight: 700,
                    color: isAttendanceStatus(status) ? ATTENDANCE_COLORS[status] : "#374151",
                  }}
                  title={latest ? `${latest.date}` : undefined}
                >
                  {isAttendanceStatus(status) ? ATTENDANCE_SHORT_LABELS[status] : "—"}
                </span>

                <span
                  className="tabular-nums"
                  style={{
                    fontFamily: "var(--font-barlow-condensed)",
                    fontWeight: 800,
                    fontSize: "1rem",
                    color: "#22C55E",
                  }}
                >
                  {user.totalPoints}
                </span>
              </button>
            );
          })}

          {filtered.length === 0 && (
            <p className="px-4 py-6 text-center" style={{ ...labelStyle, fontSize: "0.78rem" }}>
              ГИШҮҮН ОЛДСОНГҮЙ
            </p>
          )}
        </div>
      </div>

      <MemberDetailDialog
        member={selected}
        loading={detailLoading}
        tasks={memberTasks}
        attendance={memberAttendance}
        canAdminister={canAdminister}
        onOpenChange={(next) => {
          if (!next) setSelected(null);
        }}
        onUpdated={(patch) => {
          setSelected((prev) => (prev ? { ...prev, ...patch } : prev));
          setRows((prev) =>
            prev.map((r) =>
              r.user.uid === selected?.uid ? { ...r, user: { ...r.user, ...patch } } : r,
            ),
          );
        }}
      />
    </PageContainer>
  );
}

function MemberDetailDialog({
  member,
  loading,
  tasks,
  attendance,
  canAdminister,
  onOpenChange,
  onUpdated,
}: {
  member: User | null;
  loading: boolean;
  tasks: Task[];
  attendance: AttendanceRecord[];
  canAdminister: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (patch: Partial<User>) => void;
}) {
  return (
    <Dialog open={member !== null} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto sm:max-w-lg max-sm:h-dvh max-sm:max-h-dvh max-sm:max-w-full max-sm:rounded-none"
        style={{
          background: "#141414",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "6px",
          padding: "24px",
          gap: "18px",
        }}
      >
        {member && (
          <>
            <DialogHeader style={{ gap: "4px" }}>
              <DialogTitle
                style={{
                  fontFamily: "var(--font-barlow)",
                  fontWeight: 800,
                  fontSize: "1.15rem",
                  color: "#E8E8E8",
                }}
              >
                {member.name}
              </DialogTitle>
              <DialogDescription style={labelStyle}>
                {ROLE_LABELS[member.role]}
                {member.team ? ` · ${TEAM_SHORT_LABELS[member.team]}` : ""}
              </DialogDescription>
            </DialogHeader>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "ИМЭЙЛ", value: member.email },
                    { label: "СУРАЛЦАХ ЖИЛ", value: member.course ? `${member.course}-р` : "—" },
                    { label: "МЭРГЭЖИЛ", value: getMajorLabel(member.major) || "—" },
                    { label: "НИЙТ ОНОО", value: String(member.totalPoints) },
                  ].map(({ label, value }) => (
                    <div key={label} className="min-w-0">
                      <p style={{ ...labelStyle, marginBottom: "3px" }}>{label}</p>
                      <p
                        className="truncate"
                        style={{
                          fontFamily: "var(--font-barlow)",
                          fontSize: "0.88rem",
                          color: "#E8E8E8",
                          fontWeight: 600,
                        }}
                      >
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Role and team are an admin's to change; a lead only reads. */}
                {canAdminister && <MemberRoleEditor member={member} onUpdated={onUpdated} />}

                {tasks.length > 0 && (
                  <div>
                    <p style={{ ...labelStyle, fontSize: "0.65rem", marginBottom: "8px" }}>
                      ДААЛГАВРЫН ТҮҮХ
                    </p>
                    <div className="flex flex-col gap-1">
                      {tasks.map((task) => {
                        const status = getAssigneeStatus(task, member.uid);
                        const review = getAssigneeReview(task, member.uid);
                        return (
                          <div
                            key={task.id}
                            className="flex items-center justify-between gap-3 rounded px-3 py-2"
                            style={{ background: "#0F0F0F" }}
                          >
                            <span
                              className="truncate"
                              style={{
                                fontFamily: "var(--font-barlow)",
                                fontSize: "0.8rem",
                                color: "#E8E8E8",
                              }}
                            >
                              {task.title}
                            </span>
                            <span
                              className="shrink-0"
                              style={{
                                ...mono,
                                fontSize: "0.62rem",
                                fontWeight: 700,
                                color: review ? "#22C55E" : ASSIGNEE_STATUS_COLORS[status],
                              }}
                            >
                              {review
                                ? `${review.score}/${task.points}`
                                : ASSIGNEE_STATUS_LABELS[status]}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {attendance.length > 0 && (
                  <div>
                    <p style={{ ...labelStyle, fontSize: "0.65rem", marginBottom: "8px" }}>
                      ИРЦИЙН ТҮҮХ
                    </p>
                    <div className="flex flex-col gap-1">
                      {attendance.map((record) => (
                        <div
                          key={record.id}
                          className="flex items-center justify-between rounded px-3 py-2"
                          style={{ background: "#0F0F0F" }}
                        >
                          <span style={{ ...mono, fontSize: "0.78rem", color: "#6B7280" }}>
                            {record.date}
                          </span>
                          <span
                            style={{
                              ...mono,
                              fontSize: "0.68rem",
                              fontWeight: 700,
                              color: isAttendanceStatus(record.status)
                                ? ATTENDANCE_COLORS[record.status]
                                : "#4B5563",
                            }}
                          >
                            {isAttendanceStatus(record.status)
                              ? ATTENDANCE_SHORT_LABELS[record.status]
                              : "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

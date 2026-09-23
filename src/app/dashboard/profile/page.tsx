"use client";

import { PageContainer, PageHeader, SectionTitle } from "@/components/page-container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { useAssignedTasks } from "@/hooks/useAssignedTasks";
import { useAttendanceSummary } from "@/hooks/useAttendanceSummary";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { usePointsHistory } from "@/hooks/usePointsHistory";
import { avatarPalette } from "@/lib/avatar";
import {
  ASSIGNEE_STATUS_COLORS,
  ASSIGNEE_STATUS_LABELS,
  MAJORS,
  ROLE_LABELS,
  type Role,
  TEAMS,
  TEAM_LABELS,
  type Team,
  getMajorLabel,
} from "@/lib/constants";
import { db } from "@/lib/firebase";
import { getAssigneeReview, getAssigneeStatus, isTaskOverdue } from "@/lib/tasks";
import { asDate, cn, getInitials } from "@/lib/utils";
import type { Task } from "@/types";
import { doc, updateDoc } from "firebase/firestore";
import { AlertTriangle, CalendarCheck, CheckCircle2, Loader2, Star, Trophy } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const mono = { fontFamily: "var(--font-jetbrains)" } as const;
const condensed = { fontFamily: "var(--font-barlow-condensed)" } as const;

const COURSES = [
  { value: "1", label: "1-р курс" },
  { value: "2", label: "2-р курс" },
  { value: "3", label: "3-р курс" },
  { value: "4", label: "4-р курс" },
];

/** Radix Select has no empty-string value, so "not chosen" needs a sentinel. */
const UNSET = "__unset__";

const ROLE_ACCENT: Record<Role, string> = {
  admin: "#8B5CF6",
  lead: "#3B82F6",
  member: "#6B7280",
};

function Panel({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("surface-card rounded-xl", className)} {...props} />;
}

function Chip({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center rounded px-2 py-0.5"
      style={{
        ...mono,
        fontSize: "0.62rem",
        fontWeight: 700,
        letterSpacing: "0.05em",
        color,
        background: `${color}1F`,
        border: `1px solid ${color}3D`,
      }}
    >
      {children}
    </span>
  );
}

function formatDay(value: unknown): string {
  const date = asDate(value);
  return date
    ? date.toLocaleDateString("mn-MN", { year: "numeric", month: "short", day: "numeric" })
    : "—";
}

/* ─── Identity ─── */

function IdentityCard({
  uid,
  name,
  email,
  role,
  team,
  createdAt,
}: {
  uid: string;
  name: string;
  email: string;
  role: Role;
  team?: Team;
  createdAt: unknown;
}) {
  const palette = avatarPalette(uid);

  return (
    <Panel className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center">
      <span
        aria-hidden="true"
        className="flex size-16 shrink-0 items-center justify-center rounded-lg"
        style={{
          background: palette.background,
          border: `2px solid ${palette.border}`,
          color: palette.color,
          ...mono,
          fontSize: "1.1rem",
          fontWeight: 800,
        }}
      >
        {getInitials(name)}
      </span>

      <div className="min-w-0 flex-1">
        <h2
          className="truncate"
          style={{
            fontFamily: "var(--font-barlow)",
            fontWeight: 800,
            fontSize: "1.25rem",
            color: "#E8E8E8",
          }}
        >
          {name}
        </h2>
        <p className="truncate" style={{ ...mono, fontSize: "0.72rem", color: "#6B7280" }}>
          {email}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Chip color={ROLE_ACCENT[role]}>{ROLE_LABELS[role]}</Chip>
          {team && <Chip color="#22C55E">{TEAM_LABELS[team]}</Chip>}
          <span style={{ ...mono, fontSize: "0.65rem", color: "#4B5563" }}>
            Элссэн: {formatDay(createdAt)}
          </span>
        </div>
      </div>
    </Panel>
  );
}

/* ─── Stats ─── */

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
    <Panel
      className="dashboard-stat-card px-4 py-3.5"
      style={
        {
          "--stat-accent": accent,
          "--stat-glow": `${accent}42`,
          "--stat-shadow": `${accent}20`,
        } as React.CSSProperties
      }
    >
      <div className="mb-2 flex items-center gap-2">
        <span
          className="flex size-6 shrink-0 items-center justify-center rounded-md"
          style={{ color: accent, background: `${accent}16`, border: `1px solid ${accent}25` }}
        >
          {icon}
        </span>
        <span
          className="truncate"
          style={{ ...mono, fontSize: "0.58rem", letterSpacing: "0.09em", color: "#6B7280" }}
        >
          {label}
        </span>
      </div>
      <div
        className="tabular-nums"
        style={{ ...condensed, fontSize: "1.75rem", fontWeight: 800, lineHeight: 1, color: accent }}
      >
        {value}
      </div>
      {hint && (
        <p className="mt-1 truncate" style={{ ...mono, fontSize: "0.58rem", color: "#4B5563" }}>
          {hint}
        </p>
      )}
    </Panel>
  );
}

/* ─── Edit form ─── */

interface Draft {
  name: string;
  major: string;
  course: string;
  team: string;
}

function toDraft(source: { name?: string; major?: string; course?: string; team?: Team }): Draft {
  return {
    name: source.name ?? "",
    major: source.major ?? "",
    course: source.course ?? "",
    team: source.team ?? "",
  };
}

function ProfileForm({
  uid,
  saved,
  onSaved,
}: {
  uid: string;
  /** The values currently in Firestore — the baseline "unchanged" is measured against. */
  saved: Draft;
  onSaved: (next: Draft) => void;
}) {
  const [draft, setDraft] = useState<Draft>(saved);
  const [saving, setSaving] = useState(false);

  // The profile arrives after the first render, so the form mirrors it rather
  // than seeding state once and then showing "Сонгоогүй" for a filled-in field.
  useEffect(() => {
    setDraft(saved);
  }, [saved]);

  const dirty =
    draft.name.trim() !== saved.name ||
    draft.major !== saved.major ||
    draft.course !== saved.course ||
    draft.team !== saved.team;

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    const name = draft.name.trim();
    if (!name) {
      toast.error("Нэрээ оруулна уу");
      return;
    }

    setSaving(true);
    try {
      await updateDoc(doc(db, "users", uid), {
        name,
        major: draft.major,
        course: draft.course,
        team: draft.team || null,
      });
      onSaved({ ...draft, name });
      toast.success("Профайл шинэчлэгдлээ");
    } catch (err) {
      console.error("Профайлыг шинэчлэхэд алдаа гарлаа", err);
      toast.error("Профайлыг шинэчлэхэд алдаа гарлаа");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel>
      <form onSubmit={handleSave} className="px-5 py-5">
        <SectionTitle>МЭДЭЭЛЭЛ ЗАСАХ</SectionTitle>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-1.5">
            <Label
              htmlFor="profile-name"
              style={{ ...mono, fontSize: "0.62rem", color: "#9CA3AF" }}
            >
              НЭР
            </Label>
            <Input
              id="profile-name"
              value={draft.name}
              onChange={(e) => set("name", e.target.value)}
              disabled={saving}
              placeholder="Таны нэр"
              className="h-9"
            />
          </div>

          <div className="grid gap-1.5">
            <Label
              htmlFor="profile-major"
              style={{ ...mono, fontSize: "0.62rem", color: "#9CA3AF" }}
            >
              МЭРГЭЖИЛ
            </Label>
            <Select
              value={draft.major || UNSET}
              disabled={saving}
              onValueChange={(value) => set("major", value === UNSET ? "" : value)}
            >
              <SelectTrigger id="profile-major" className="h-9 w-full">
                <SelectValue placeholder="Сонгоогүй" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNSET}>Сонгоогүй</SelectItem>
                {MAJORS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label
              htmlFor="profile-course"
              style={{ ...mono, fontSize: "0.62rem", color: "#9CA3AF" }}
            >
              КУРС
            </Label>
            <Select
              value={draft.course || UNSET}
              disabled={saving}
              onValueChange={(value) => set("course", value === UNSET ? "" : value)}
            >
              <SelectTrigger id="profile-course" className="h-9 w-full">
                <SelectValue placeholder="Сонгоогүй" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNSET}>Сонгоогүй</SelectItem>
                {COURSES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label
              htmlFor="profile-team"
              style={{ ...mono, fontSize: "0.62rem", color: "#9CA3AF" }}
            >
              БАГ
            </Label>
            <Select
              value={draft.team || UNSET}
              disabled={saving}
              onValueChange={(value) => set("team", value === UNSET ? "" : value)}
            >
              <SelectTrigger id="profile-team" className="h-9 w-full">
                <SelectValue placeholder="Сонгоогүй" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNSET}>Сонгоогүй</SelectItem>
                {TEAMS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-3">
          {dirty && (
            <span style={{ ...mono, fontSize: "0.62rem", color: "#6B7280" }}>
              Хадгалаагүй өөрчлөлт байна
            </span>
          )}
          <Button type="submit" size="lg" disabled={!dirty || saving}>
            {saving && <Loader2 className="animate-spin" />}
            Хадгалах
          </Button>
        </div>
      </form>
    </Panel>
  );
}

/* ─── Side panels ─── */

function RecentPoints({ uid }: { uid: string }) {
  const { entries, loading } = usePointsHistory(uid, 10);

  return (
    <Panel className="px-4 py-4">
      <SectionTitle>СҮҮЛИЙН ОНОО</SectionTitle>
      {loading ? (
        <div className="flex flex-col gap-2" aria-hidden="true">
          {["a", "b", "c", "d"].map((key) => (
            <div key={key} className="h-10 animate-pulse rounded-md bg-white/4" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <p style={{ fontFamily: "var(--font-barlow)", fontSize: "0.82rem", color: "#6B7280" }}>
          Оноо хараахан аваагүй байна. Даалгавраа дуусгаад ахлагчаас үнэлгээ аваарай.
        </p>
      ) : (
        <ul className="flex flex-col">
          {entries.map((entry, i) => (
            <li
              key={entry.id}
              className="flex items-center gap-3 py-2"
              style={{
                borderTop: i === 0 ? "none" : "1px solid rgba(255, 255, 255, 0.05)",
              }}
            >
              <div className="min-w-0 flex-1">
                <p
                  className="truncate"
                  style={{
                    fontFamily: "var(--font-barlow)",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    color: "#E8E8E8",
                  }}
                >
                  {entry.reason}
                </p>
                <p style={{ ...mono, fontSize: "0.6rem", color: "#6B7280" }}>
                  {formatDay(entry.createdAt)}
                </p>
              </div>
              <span
                className="tabular-nums shrink-0"
                style={{
                  ...condensed,
                  fontSize: "1.15rem",
                  fontWeight: 800,
                  color: entry.points < 0 ? "#EF4444" : "#22C55E",
                }}
              >
                {entry.points < 0 ? "" : "+"}
                {entry.points}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function ActiveTasks({
  tasks,
  uid,
  loading,
}: {
  tasks: Task[];
  uid: string;
  loading: boolean;
}) {
  return (
    <Panel className="px-4 py-4">
      <div className="flex items-center justify-between">
        <SectionTitle>ИДЭВХТЭЙ ДААЛГАВАР</SectionTitle>
        <Link
          href="/dashboard/tasks"
          className="mb-3 transition-colors hover:text-[#C4B5FD]"
          style={{ ...mono, fontSize: "0.6rem", color: "#8B5CF6", letterSpacing: "0.05em" }}
        >
          БҮГД →
        </Link>
      </div>
      {loading ? (
        <div className="flex flex-col gap-2" aria-hidden="true">
          {["a", "b", "c"].map((key) => (
            <div key={key} className="h-10 animate-pulse rounded-md bg-white/4" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <p style={{ fontFamily: "var(--font-barlow)", fontSize: "0.82rem", color: "#6B7280" }}>
          Идэвхтэй даалгавар алга — бүгд дууссан байна.
        </p>
      ) : (
        <ul className="flex flex-col">
          {tasks.map((task, i) => (
            <li
              key={task.id}
              className="flex items-center gap-3 py-2"
              style={{ borderTop: i === 0 ? "none" : "1px solid rgba(255, 255, 255, 0.05)" }}
            >
              <div className="min-w-0 flex-1">
                <p
                  className="truncate"
                  style={{
                    fontFamily: "var(--font-barlow)",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    color: "#E8E8E8",
                  }}
                >
                  {task.title}
                </p>
                <p style={{ ...mono, fontSize: "0.6rem", color: "#6B7280" }}>
                  {task.dueDate ? formatDay(task.dueDate) : "Хугацаагүй"}
                </p>
              </div>
              <TaskStatusChip task={task} uid={uid} />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function TaskStatusChip({ task, uid }: { task: Task; uid: string }) {
  const overdue = isTaskOverdue(task);
  const status = getAssigneeStatus(task, uid);
  const color = overdue && status !== "done" ? "#EF4444" : ASSIGNEE_STATUS_COLORS[status];
  const label = overdue && status !== "done" ? "Хоцорсон" : ASSIGNEE_STATUS_LABELS[status];
  return <Chip color={color}>{label}</Chip>;
}

/* ─── Page ─── */

export default function ProfilePage() {
  const { user, userData, loading, profileIncomplete } = useAuth();
  const { entries } = useLeaderboard();
  const { tasks, loading: tasksLoading } = useAssignedTasks();
  const { summary } = useAttendanceSummary(user?.uid);

  // AuthContext only reads the profile on sign-in, so a save is mirrored here to
  // keep the header, the badges and the form agreeing without a page reload.
  const [profile, setProfile] = useState<Draft | null>(null);
  // `userData` keeps its identity until AuthContext replaces the profile, so this
  // only produces a new baseline when the stored profile actually changed.
  const fromAuth = useMemo(() => (userData ? toDraft(userData) : null), [userData]);
  useEffect(() => {
    setProfile(fromAuth);
  }, [fromAuth]);

  if (loading || !user || !userData || !profile) {
    return (
      <PageContainer>
        <PageHeader title="ПРОФАЙЛ" description="АЧААЛЖ БАЙНА…" />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]" aria-hidden="true">
          <div className="flex flex-col gap-5">
            <div className="h-[116px] animate-pulse rounded-xl bg-white/4" />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {["a", "b", "c", "d"].map((key) => (
                <div key={key} className="h-[96px] animate-pulse rounded-xl bg-white/4" />
              ))}
            </div>
            <div className="h-[260px] animate-pulse rounded-xl bg-white/4" />
          </div>
          <div className="flex flex-col gap-5">
            <div className="h-[220px] animate-pulse rounded-xl bg-white/4" />
            <div className="h-[180px] animate-pulse rounded-xl bg-white/4" />
          </div>
        </div>
      </PageContainer>
    );
  }

  const rank = entries.find((e) => e.uid === user.uid)?.rank;
  const completed = tasks.filter((t) => getAssigneeReview(t, user.uid) !== undefined).length;
  const activeTasks = tasks
    .filter((t) => getAssigneeReview(t, user.uid) === undefined)
    .sort(
      (a, b) =>
        (asDate(a.dueDate)?.getTime() ?? Number.POSITIVE_INFINITY) -
        (asDate(b.dueDate)?.getTime() ?? Number.POSITIVE_INFINITY),
    )
    .slice(0, 6);

  const team = profile.team ? (profile.team as Team) : undefined;
  const incomplete = profileIncomplete && (!profile.team || !profile.major);

  return (
    <PageContainer>
      <PageHeader
        title="ПРОФАЙЛ"
        description={`${getMajorLabel(profile.major) || "Мэргэжил сонгоогүй"} · ${
          team ? TEAM_LABELS[team] : "Баггүй"
        }`}
      />

      {incomplete && (
        <div
          className="mb-5 flex items-start gap-2.5 rounded-lg px-4 py-3"
          role="status"
          style={{
            background: "rgba(251, 191, 36, 0.09)",
            border: "1px solid rgba(251, 191, 36, 0.28)",
          }}
        >
          <AlertTriangle size={15} className="mt-0.5 shrink-0 text-[#FBBF24]" />
          <div>
            <p
              style={{
                fontFamily: "var(--font-barlow)",
                fontSize: "0.85rem",
                fontWeight: 700,
                color: "#FCD34D",
              }}
            >
              Профайлаа бөглөнө үү
            </p>
            <p style={{ fontFamily: "var(--font-barlow)", fontSize: "0.8rem", color: "#9CA3AF" }}>
              Баг болон мэргэжлээ сонгосноор багийн даалгавар танд хуваарилагдана.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-5">
          <IdentityCard
            uid={user.uid}
            name={profile.name}
            email={user.email ?? userData.email}
            role={userData.role}
            team={team}
            createdAt={userData.createdAt}
          />

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="НИЙТ ОНОО"
              value={userData.totalPoints.toLocaleString()}
              accent="#22C55E"
              icon={<Star size={13} />}
            />
            <StatCard
              label="ЭРЭМБЭ"
              value={rank ? `#${rank}` : "—"}
              accent="#FBBF24"
              icon={<Trophy size={13} />}
              hint={entries.length > 0 ? `${entries.length} гишүүнээс` : undefined}
            />
            <StatCard
              label="ДУУССАН"
              value={completed}
              accent="#8B5CF6"
              icon={<CheckCircle2 size={13} />}
              hint={`${tasks.length} даалгавраас`}
            />
            <StatCard
              label="ИРЦ"
              value={summary.rate === null ? "—" : `${summary.rate}%`}
              accent="#3B82F6"
              icon={<CalendarCheck size={13} />}
              hint={
                summary.counted > 0 ? `${summary.attended}/${summary.counted} өдөр` : "Бүртгэлгүй"
              }
            />
          </div>

          <ProfileForm uid={user.uid} saved={profile} onSaved={setProfile} />
        </div>

        <aside className="flex min-w-0 flex-col gap-5">
          <RecentPoints uid={user.uid} />
          <ActiveTasks tasks={activeTasks} uid={user.uid} loading={tasksLoading} />
        </aside>
      </div>
    </PageContainer>
  );
}

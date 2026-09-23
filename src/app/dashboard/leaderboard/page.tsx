"use client";

import { PageContainer, PageHeader, SectionTitle } from "@/components/page-container";
import { TeamFilter } from "@/components/team-filter";
import { useAuth } from "@/context/AuthContext";
import { type LeaderboardEntry, useLeaderboard } from "@/hooks/useLeaderboard";
import { filterByTeam, useTeamFilter } from "@/hooks/useTeamFilter";
import { avatarPalette } from "@/lib/avatar";
import { TEAMS, TEAM_SHORT_LABELS, type Team } from "@/lib/constants";
import { cn, getInitials } from "@/lib/utils";
import { Trophy } from "lucide-react";
import { Suspense } from "react";

/* ─── Shared bits ─── */

const MEDALS = ["#FBBF24", "#9CA3AF", "#CD7F32"] as const;

/** Gold / silver / bronze for the top three, a neutral grey for everyone else. */
function medalColor(rank: number): string {
  return MEDALS[rank - 1] ?? "#4B5563";
}

const TEAM_COLORS: Record<Team, string> = {
  dev: "#8B5CF6",
  ops: "#22C55E",
  design: "#FBBF24",
  social: "#3B82F6",
};

const mono = { fontFamily: "var(--font-jetbrains)" } as const;
const condensed = { fontFamily: "var(--font-barlow-condensed)" } as const;

function Avatar({ uid, name, size = 28 }: { uid: string; name: string; size?: number }) {
  const palette = avatarPalette(uid);
  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded"
      style={{
        width: size,
        height: size,
        background: palette.background,
        border: `1px solid ${palette.border}`,
        color: palette.color,
        fontFamily: "var(--font-jetbrains)",
        fontSize: size >= 40 ? "0.75rem" : "0.55rem",
        fontWeight: 700,
      }}
    >
      {getInitials(name)}
    </span>
  );
}

function TeamBadge({ team, className }: { team?: Team; className?: string }) {
  if (!team) {
    return <span style={{ ...mono, fontSize: "0.6rem", color: "#4B5563" }}>—</span>;
  }
  const color = TEAM_COLORS[team];
  return (
    <span
      className={cn("inline-flex items-center rounded px-1.5 py-0.5", className)}
      style={{
        ...mono,
        fontSize: "0.6rem",
        fontWeight: 700,
        letterSpacing: "0.04em",
        color,
        background: `${color}1A`,
        border: `1px solid ${color}33`,
      }}
    >
      {TEAM_SHORT_LABELS[team]}
    </span>
  );
}

function Panel({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("surface-card overflow-hidden rounded-xl", className)} {...props} />;
}

/* ─── Your standing ─── */

function ViewerCard({
  entry,
  rank,
  ahead,
}: {
  entry: LeaderboardEntry;
  rank: number;
  ahead: LeaderboardEntry | null;
}) {
  const gap = ahead ? ahead.totalPoints - entry.totalPoints : 0;

  return (
    <Panel className="flex items-center gap-4 px-4 py-4 sm:px-5">
      <Avatar uid={entry.uid} name={entry.name} size={40} />
      <div className="min-w-0 flex-1">
        <p style={{ ...mono, fontSize: "0.6rem", letterSpacing: "0.1em", color: "#6B7280" }}>
          ТАНЫ БАЙР
        </p>
        <p
          className="truncate"
          style={{
            fontFamily: "var(--font-barlow)",
            fontSize: "0.95rem",
            fontWeight: 700,
            color: "#E8E8E8",
          }}
        >
          {entry.name}
        </p>
        <p className="mt-0.5" style={{ ...mono, fontSize: "0.65rem", color: "#6B7280" }}>
          {ahead
            ? `Дээрх хүнээс ${gap} оноогоор хоцорч байна`
            : "Та тэргүүлж байна — ялгааг хадгална уу"}
        </p>
      </div>
      <div className="flex items-center gap-5 sm:gap-7">
        <div className="text-right">
          <p style={{ ...mono, fontSize: "0.55rem", letterSpacing: "0.1em", color: "#6B7280" }}>
            БАЙР
          </p>
          <p
            style={{
              ...condensed,
              fontSize: "1.9rem",
              fontWeight: 800,
              lineHeight: 1,
              color: medalColor(rank),
            }}
          >
            #{rank}
          </p>
        </div>
        <div className="text-right">
          <p style={{ ...mono, fontSize: "0.55rem", letterSpacing: "0.1em", color: "#6B7280" }}>
            ОНОО
          </p>
          <p
            className="tabular-nums"
            style={{
              ...condensed,
              fontSize: "1.9rem",
              fontWeight: 800,
              lineHeight: 1,
              color: "#22C55E",
            }}
          >
            {entry.totalPoints}
          </p>
        </div>
      </div>
    </Panel>
  );
}

/* ─── Podium ─── */

/** Visual order and block height per place, so first place stands in the middle. */
const PODIUM_LAYOUT = [
  { order: 2, height: 184 },
  { order: 1, height: 152 },
  { order: 3, height: 136 },
] as const;

function Podium({ entries, viewerUid }: { entries: LeaderboardEntry[]; viewerUid?: string }) {
  const top = entries.slice(0, 3);
  if (top.length === 0) return null;

  return (
    <div className="flex items-end justify-center gap-2 sm:gap-3">
      {top.map((entry, i) => {
        const place = i + 1;
        const color = medalColor(place);
        const { order, height } = PODIUM_LAYOUT[i];
        const isViewer = entry.uid === viewerUid;

        return (
          <div
            key={entry.uid}
            className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1.5 overflow-hidden rounded-xl px-2 py-3"
            style={{
              order,
              maxWidth: "200px",
              // A min-height, not a height: a two-line name grows the block rather
              // than spilling out of the top of it.
              minHeight: height,
              background: `linear-gradient(180deg, ${color}14, ${color}05)`,
              border: `1px solid ${isViewer ? "#8B5CF6" : `${color}38`}`,
            }}
          >
            <Avatar uid={entry.uid} name={entry.name} size={place === 1 ? 40 : 34} />
            <p
              className="line-clamp-2 text-center"
              style={{
                fontFamily: "var(--font-barlow)",
                fontSize: "0.8rem",
                fontWeight: 700,
                color: "#E8E8E8",
                lineHeight: 1.2,
              }}
            >
              {entry.name}
            </p>
            <span className="hidden max-w-full sm:block">
              <TeamBadge team={entry.team} className="max-w-full truncate" />
            </span>
            <p
              className="tabular-nums"
              style={{ ...condensed, fontSize: "1.5rem", fontWeight: 800, lineHeight: 1, color }}
            >
              {entry.totalPoints}
            </p>
            <span style={{ ...mono, fontSize: "0.65rem", fontWeight: 800, color }}>#{place}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── List ─── */

function LeaderRow({
  entry,
  rank,
  isViewer,
  last,
}: {
  entry: LeaderboardEntry;
  rank: number;
  isViewer: boolean;
  last: boolean;
}) {
  return (
    <div
      className={cn(
        "grid h-14 grid-cols-[36px_minmax(0,1fr)_64px] items-center gap-3 px-3 transition-colors sm:grid-cols-[44px_minmax(0,1fr)_132px_72px] sm:px-4",
        !isViewer && "hover:bg-white/[0.035]",
      )}
      style={{
        borderBottom: last ? "none" : "1px solid rgba(255, 255, 255, 0.05)",
        ...(isViewer
          ? {
              background: "rgba(139, 92, 246, 0.10)",
              boxShadow: "inset 0 0 0 1px #8B5CF6",
            }
          : {}),
      }}
    >
      <span
        className="tabular-nums"
        style={{ ...mono, fontSize: "0.75rem", fontWeight: 800, color: medalColor(rank) }}
      >
        #{rank}
      </span>

      <div className="flex min-w-0 items-center gap-2.5">
        <Avatar uid={entry.uid} name={entry.name} />
        <div className="min-w-0">
          <p
            className="truncate"
            style={{
              fontFamily: "var(--font-barlow)",
              fontSize: "0.85rem",
              fontWeight: 600,
              color: isViewer ? "#C4B5FD" : "#E8E8E8",
            }}
          >
            {entry.name}
            {isViewer && (
              <span style={{ ...mono, fontSize: "0.6rem", color: "#8B5CF6" }}> · ТА</span>
            )}
          </p>
          {/* The team column is a cell of its own from `sm` up. */}
          <p
            className="truncate sm:hidden"
            style={{ ...mono, fontSize: "0.6rem", color: "#6B7280" }}
          >
            {entry.team ? TEAM_SHORT_LABELS[entry.team] : "—"}
          </p>
        </div>
      </div>

      <div className="hidden sm:block">
        <TeamBadge team={entry.team} />
      </div>

      <span
        className="tabular-nums text-right"
        style={{ ...condensed, fontSize: "1.15rem", fontWeight: 800, color: "#22C55E" }}
      >
        {entry.totalPoints}
      </span>
    </div>
  );
}

function LeaderList({
  entries,
  viewerUid,
}: {
  entries: LeaderboardEntry[];
  viewerUid?: string;
}) {
  if (entries.length === 0) {
    return (
      <Panel className="px-4 py-8 text-center">
        <p style={{ fontFamily: "var(--font-barlow)", fontSize: "0.9rem", color: "#9CA3AF" }}>
          Энэ багт оноо авсан гишүүн алга байна
        </p>
        <p className="mt-1" style={{ ...mono, fontSize: "0.7rem", color: "#4B5563" }}>
          Шүүлтүүрийг "Бүгд" болгож бүх гишүүдийг харна уу
        </p>
      </Panel>
    );
  }

  return (
    <Panel>
      <div
        className="grid grid-cols-[36px_minmax(0,1fr)_64px] gap-3 px-3 py-2.5 sm:grid-cols-[44px_minmax(0,1fr)_132px_72px] sm:px-4"
        style={{
          background: "rgba(255, 255, 255, 0.02)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
        }}
      >
        {["#", "ГИШҮҮН", "БАГ", "ОНОО"].map((head, i) => (
          <span
            key={head}
            className={cn(i === 2 && "hidden sm:block", i === 3 && "text-right")}
            style={{ ...mono, fontSize: "0.58rem", letterSpacing: "0.1em", color: "#6B7280" }}
          >
            {head}
          </span>
        ))}
      </div>
      {entries.map((entry, i) => (
        <LeaderRow
          key={entry.uid}
          entry={entry}
          rank={i + 1}
          isViewer={entry.uid === viewerUid}
          last={i === entries.length - 1}
        />
      ))}
    </Panel>
  );
}

/* ─── Side panel ─── */

function TeamBreakdown({ entries }: { entries: LeaderboardEntry[] }) {
  const rows = TEAMS.map(({ value }) => {
    const members = entries.filter((e) => e.team === value);
    return {
      team: value as Team,
      points: members.reduce((sum, m) => sum + (m.totalPoints ?? 0), 0),
      count: members.length,
    };
  }).sort((a, b) => b.points - a.points);

  const max = Math.max(...rows.map((r) => r.points), 1);

  return (
    <Panel className="px-4 py-4">
      <SectionTitle>БАГУУДЫН ХАРЬЦУУЛАЛТ</SectionTitle>
      <div className="flex flex-col gap-3">
        {rows.map(({ team, points, count }) => (
          <div key={team}>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span
                className="truncate"
                style={{
                  fontFamily: "var(--font-barlow)",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "#E8E8E8",
                }}
              >
                {TEAM_SHORT_LABELS[team]}
              </span>
              <span
                className="tabular-nums"
                style={{ ...mono, fontSize: "0.7rem", fontWeight: 700, color: TEAM_COLORS[team] }}
              >
                {points}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/6">
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{ width: `${(points / max) * 100}%`, background: TEAM_COLORS[team] }}
              />
            </div>
            <p className="mt-1" style={{ ...mono, fontSize: "0.6rem", color: "#6B7280" }}>
              {count} гишүүн
            </p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function SummaryPanel({ entries }: { entries: LeaderboardEntry[] }) {
  const total = entries.reduce((sum, e) => sum + (e.totalPoints ?? 0), 0);
  const average = entries.length > 0 ? Math.round(total / entries.length) : 0;
  const best = entries[0];

  const stats = [
    { label: "НИЙТ ОНОО", value: total.toLocaleString(), color: "#22C55E" },
    { label: "ДУНДАЖ", value: average.toLocaleString(), color: "#8B5CF6" },
    { label: "ХАМГИЙН ӨНДӨР", value: (best?.totalPoints ?? 0).toLocaleString(), color: "#FBBF24" },
  ];

  return (
    <Panel className="px-4 py-4">
      <SectionTitle>ТОЙМ</SectionTitle>
      <div className="grid grid-cols-3 gap-3 xl:grid-cols-1">
        {stats.map(({ label, value, color }) => (
          <div key={label}>
            <p style={{ ...mono, fontSize: "0.55rem", letterSpacing: "0.1em", color: "#6B7280" }}>
              {label}
            </p>
            <p
              className="tabular-nums"
              style={{ ...condensed, fontSize: "1.5rem", fontWeight: 800, lineHeight: 1.1, color }}
            >
              {value}
            </p>
          </div>
        ))}
      </div>
      {best && (
        <div className="mt-3 flex items-center gap-2 border-t border-white/6 pt-3">
          <Trophy size={13} className="shrink-0 text-[#FBBF24]" />
          <span
            className="truncate"
            style={{ fontFamily: "var(--font-barlow)", fontSize: "0.78rem", color: "#9CA3AF" }}
          >
            Тэргүүлэгч: <span style={{ color: "#E8E8E8", fontWeight: 600 }}>{best.name}</span>
          </span>
        </div>
      )}
    </Panel>
  );
}

/* ─── Skeleton ─── */

/** Mirrors the real layout's boxes so nothing jumps when the data lands. */
function LeaderboardSkeleton() {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]" aria-hidden="true">
      <div className="flex flex-col gap-5">
        <div className="h-[76px] animate-pulse rounded-xl bg-white/4" />
        <div className="flex items-end justify-center gap-2 sm:gap-3">
          {[152, 184, 136].map((h, i) => (
            <div
              key={h}
              className="w-full max-w-[200px] animate-pulse rounded-xl bg-white/4"
              style={{ height: h, order: i }}
            />
          ))}
        </div>
        <div className="overflow-hidden rounded-xl bg-white/4">
          <div className="h-10" />
          {["a", "b", "c", "d", "e", "f"].map((key) => (
            <div
              key={key}
              className="h-14 animate-pulse"
              style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
            />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-5">
        <div className="h-[232px] animate-pulse rounded-xl bg-white/4" />
        <div className="h-[150px] animate-pulse rounded-xl bg-white/4" />
      </div>
    </div>
  );
}

/* ─── Page ─── */

function LeaderboardContent() {
  const { user } = useAuth();
  const { entries: allEntries, loading } = useLeaderboard();
  const [team, setTeam] = useTeamFilter();

  // Ranks are recomputed inside the filtered list, so "#1" always means first
  // in what is on screen.
  const entries = filterByTeam(allEntries, team);
  const viewerUid = user?.uid;
  const viewerIndex = entries.findIndex((e) => e.uid === viewerUid);

  return (
    <PageContainer>
      <PageHeader
        title="ЭРЭМБЭ"
        description={loading ? "АЧААЛЖ БАЙНА…" : `${entries.length} ГИШҮҮН`}
        actions={
          <TeamFilter
            value={team}
            onChange={setTeam}
            className="w-full overflow-x-auto lg:w-auto"
          />
        }
      />

      {loading ? (
        <LeaderboardSkeleton />
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="flex min-w-0 flex-col gap-5">
            {viewerIndex >= 0 && (
              <ViewerCard
                entry={entries[viewerIndex]}
                rank={viewerIndex + 1}
                ahead={viewerIndex > 0 ? entries[viewerIndex - 1] : null}
              />
            )}
            <Podium entries={entries} viewerUid={viewerUid} />
            <LeaderList entries={entries} viewerUid={viewerUid} />
          </div>

          <aside className="flex min-w-0 flex-col gap-5">
            <TeamBreakdown entries={allEntries} />
            <SummaryPanel entries={entries} />
          </aside>
        </div>
      )}
    </PageContainer>
  );
}

export default function LeaderboardPage() {
  return (
    <Suspense
      fallback={
        <PageContainer>
          <PageHeader title="ЭРЭМБЭ" description="АЧААЛЖ БАЙНА…" />
          <LeaderboardSkeleton />
        </PageContainer>
      }
    >
      <LeaderboardContent />
    </Suspense>
  );
}

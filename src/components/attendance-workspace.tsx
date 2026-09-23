"use client";

import { EmptyState, PageContainer, PageHeader } from "@/components/page-container";
import { PageSpinner } from "@/components/page-spinner";
import { TeamFilter } from "@/components/team-filter";
import { useAuth } from "@/context/AuthContext";
import { filterByTeam, useTeamFilter } from "@/hooks/useTeamFilter";
import { type AttendanceScope, getAttendanceRoster } from "@/lib/attendance";
import {
  ATTENDANCE_COLORS,
  ATTENDANCE_LABELS,
  ATTENDANCE_STATUSES,
  type AttendanceMark,
  type AttendanceStatus,
  ROLE_LABELS,
  type Role,
  TEAM_LABELS,
  type Team,
  attendancePoints,
  isAttendanceStatus,
} from "@/lib/constants";
import { db } from "@/lib/firebase";
import { getInitials } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import {
  collection,
  doc,
  getDocs,
  increment,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { CalendarOff, Check, Loader2, Minus, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export type { AttendanceScope } from "@/lib/attendance";

const STATUS_ICONS = {
  present: Check,
  late: Minus,
  absent: X,
  excused: CalendarOff,
} as const;

interface MemberAttendance {
  uid: string;
  name: string;
  role: Role;
  team?: Team;
  status: AttendanceMark;
  note: string;
}

/** The badge that marks out the non-members on the roster. */
const ROLE_BADGES: Partial<Record<Role, { label: string; color: string }>> = {
  admin: { label: ROLE_LABELS.admin, color: "#F472B6" },
  lead: { label: ROLE_LABELS.lead, color: "#8B5CF6" },
};

/**
 * The attendance day key, in the marker's own timezone. `toISOString()` would
 * convert to UTC first, which in UTC+8 files the early hours of a day under the
 * previous date.
 */
function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Marks one day's attendance, for the whole club or for a single team.
 *
 * Every role is on the roster — an admin and a lead turn up to the same
 * sessions and earn the same +5 as a member. What nobody may do is file their
 * own day: a "present" mark is worth points, and the same rule that stops
 * anyone reviewing their own work stops them crediting themselves. The viewer's
 * own row is therefore shown (another admin may already have marked it) but
 * left read-only, and the security rules refuse the write regardless.
 */
export function AttendanceWorkspace({ scope }: { scope: AttendanceScope }) {
  const { userData, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [date, setDate] = useState<Date>(new Date());
  const [members, setMembers] = useState<MemberAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [team, setTeam] = useTeamFilter();

  const scopedTeam = scope === "all" ? null : scope.team;
  const viewerUid = userData?.uid;

  useEffect(() => {
    if (!viewerUid) return;

    let cancelled = false;
    async function load() {
      setLoading(true);

      // The same roster the lead screen gets, just scoped differently — every
      // role is on it, the viewer included.
      const roster = (await getAttendanceRoster(scopedTeam ? { team: scopedTeam } : "all")).map(
        (u) => ({ ...u, status: "" as AttendanceMark, note: "" }),
      );

      const dateKey = formatDateKey(date);
      const attSnap = await getDocs(
        query(collection(db, "attendance"), where("date", "==", dateKey)),
      );
      const filed = new Map(attSnap.docs.map((d) => [d.data().uid as string, d.data()] as const));

      if (cancelled) return;
      setMembers(
        roster.map((m) => {
          const record = filed.get(m.uid);
          const status = record?.status;
          return {
            ...m,
            status: isAttendanceStatus(status) ? status : "",
            note: (record?.note as string) ?? "",
          };
        }),
      );
      setLoading(false);
    }

    load().catch((err) => {
      console.error("Ирцийг ачаалахад алдаа гарлаа", err);
      toast.error("Ирцийг ачаалахад алдаа гарлаа");
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [date, scopedTeam, viewerUid]);

  function updateMember(uid: string, status: AttendanceStatus) {
    // The buttons are already disabled on the viewer's own row; this is the
    // same line again, so no code path can quietly hand them their own +5.
    if (uid === viewerUid) return;
    setMembers((prev) =>
      // Clicking the current state again clears it, so a mistake can be undone.
      prev.map((m) => (m.uid === uid ? { ...m, status: m.status === status ? "" : status } : m)),
    );
  }

  /**
   * Files one member's day.
   *
   * The previous status is read *inside* the transaction, so the point delta is
   * computed from what is actually stored. That is what keeps an admin and a
   * lead filing the same person on the same day from crediting them twice.
   */
  async function saveMember(member: MemberAttendance, dateKey: string, actorUid: string) {
    if (!member.status) return 0;

    const attRef = doc(db, "attendance", `${dateKey}_${member.uid}`);
    return runTransaction(db, async (tx) => {
      const snap = await tx.get(attRef);
      const stored = snap.exists() ? snap.data().status : undefined;
      const previous: AttendanceMark = isAttendanceStatus(stored) ? stored : "";
      const storedNote = snap.exists() ? ((snap.data().note as string) ?? "") : "";

      if (previous === member.status && storedNote === member.note) return 0;

      const delta = attendancePoints(member.status) - attendancePoints(previous);

      tx.set(attRef, {
        id: `${dateKey}_${member.uid}`,
        uid: member.uid,
        date: dateKey,
        status: member.status,
        markedBy: actorUid,
        note: member.note,
      });

      if (delta !== 0) {
        tx.update(doc(db, "users", member.uid), { totalPoints: increment(delta) });
        // Attendance points used to move a member's total with nothing to show
        // for it; every change is now in the same ledger as review points.
        tx.set(doc(collection(db, "pointsHistory")), {
          uid: member.uid,
          points: delta,
          reason: `Ирц: ${dateKey}`,
          source: "attendance",
          reviewedBy: actorUid,
          createdAt: serverTimestamp(),
        });
      }

      return delta;
    });
  }

  async function handleSave() {
    if (!userData) return;
    setSaving(true);
    const dateKey = formatDateKey(date);

    let changed = 0;
    let failed = 0;
    // One transaction per member: a single failure cannot roll back everyone
    // else's day, and each member's points stay atomic with their record.
    for (const member of members) {
      // Their own row is read-only — the rules would reject the write anyway,
      // and skipping it keeps a stray failure out of the error count.
      if (member.uid === userData.uid) continue;
      try {
        const delta = await saveMember(member, dateKey, userData.uid);
        if (delta !== 0) changed += 1;
      } catch (err) {
        failed += 1;
        console.error(`Ирц хадгалахад алдаа гарлаа (${member.name})`, err);
      }
    }

    setSaving(false);
    // The profile reads this ledger, so its cache is stale the moment we write.
    queryClient.invalidateQueries({ queryKey: ["pointsHistory"] });
    queryClient.invalidateQueries({ queryKey: ["attendanceSummary"] });

    if (failed > 0) {
      toast.error(`${failed} гишүүний ирц хадгалагдсангүй`);
      return;
    }
    toast.success(
      changed > 0 ? `Ирц хадгалагдлаа — ${changed} гишүүний оноо шинэчлэгдлээ` : "Ирц хадгалагдлаа",
    );
  }

  if (authLoading || loading) {
    return <PageSpinner />;
  }

  // Only the listed members are counted, so the totals match what is on screen.
  // The viewer's own row counts too: someone else may have filed it already.
  const visible = scopedTeam ? members : filterByTeam(members, team);
  // A screen showing nothing but the viewer's own read-only row has nothing to
  // save, so the button is not offered.
  const markable = visible.filter((m) => m.uid !== viewerUid);
  const counts = Object.fromEntries(
    ATTENDANCE_STATUSES.map((s) => [s.value, visible.filter((m) => m.status === s.value).length]),
  ) as Record<AttendanceStatus, number>;

  return (
    <PageContainer>
      <PageHeader
        title="ИРЦИЙН БҮРТГЭЛ"
        description={`${date.toLocaleDateString("mn-MN", {
          year: "numeric",
          month: "long",
          day: "numeric",
          weekday: "long",
        })}${scopedTeam ? ` · ${TEAM_LABELS[scopedTeam]}` : ""}`}
        actions={
          <div className="flex flex-wrap gap-5">
            {ATTENDANCE_STATUSES.map(({ value, short, color }) => (
              <div key={value} style={{ textAlign: "center" }}>
                <div className="type-stat-sm leading-none" style={{ color }}>
                  {counts[value]}
                </div>
                <div className="mt-1 font-mono text-xs tracking-[0.08em]" style={{ color }}>
                  {short}
                </div>
              </div>
            ))}
          </div>
        }
      />

      <div className="max-w-3xl">
        <div className="mb-6">
          <input
            type="date"
            aria-label="Огноо"
            value={formatDateKey(date)}
            onChange={(e) => setDate(new Date(`${e.target.value}T00:00:00`))}
            style={{
              background: "#1A1A1A",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "3px",
              padding: "8px 12px",
              color: "#E8E8E8",
              fontFamily: "var(--font-jetbrains)",
              fontSize: "0.875rem",
              outline: "none",
            }}
          />
        </div>

        {/* A team scope is already narrowed; only the club-wide view filters. */}
        {!scopedTeam && (
          <div style={{ marginBottom: "16px", maxWidth: "520px" }}>
            {/* The teamless — the admins — get their own segment here; "Бүгд"
                still includes them. */}
            <TeamFilter value={team} onChange={setTeam} showNoTeam />
          </div>
        )}

        <div
          className="border"
          style={{
            background: "#141414",
            borderColor: "rgba(255, 255, 255, 0.07)",
            borderRadius: "4px",
            overflow: "hidden",
            marginBottom: "16px",
          }}
        >
          {visible.length === 0 && (
            <EmptyState icon={<Users size={18} />} message="Бүртгэх гишүүн алга байна." />
          )}

          {visible.map((m, i) => {
            // Nobody files their own day, so their row is shown but frozen.
            const isSelf = m.uid === viewerUid;
            const badge = ROLE_BADGES[m.role];
            const lockNote = "Өөр admin бүртгэнэ";
            return (
              <div
                key={m.uid}
                className="flex flex-col gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.03] sm:flex-row sm:items-center sm:gap-4"
                style={{
                  borderBottom:
                    i < visible.length - 1 ? "1px solid rgba(255, 255, 255, 0.05)" : "none",
                  borderLeft: `3px solid ${m.status ? ATTENDANCE_COLORS[m.status] : "transparent"}`,
                  opacity: isSelf ? 0.6 : 1,
                }}
                title={isSelf ? lockNote : undefined}
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#8B5CF6]/10 font-mono text-xs text-[#8B5CF6]"
                  >
                    {getInitials(m.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 font-sans text-sm font-semibold text-[#E8E8E8]">
                      <span className="truncate">{m.name}</span>
                      {badge && (
                        <span
                          className="shrink-0 rounded-sm border px-1.5 py-px font-mono text-[0.625rem] leading-[1.4] tracking-[0.06em]"
                          style={{
                            color: badge.color,
                            borderColor: `${badge.color}40`,
                            background: `${badge.color}14`,
                          }}
                        >
                          {badge.label}
                        </span>
                      )}
                    </p>
                    {/* The chosen state is spelled out here on mobile, where the
                      right-hand label column has nowhere to go. */}
                    <p
                      className="font-mono text-xs sm:hidden"
                      style={{ color: m.status ? ATTENDANCE_COLORS[m.status] : "#4B5563" }}
                    >
                      {m.status ? ATTENDANCE_LABELS[m.status] : isSelf ? lockNote : "Тэмдэглээгүй"}
                    </p>
                  </div>
                </div>

                <div className="flex gap-1.5">
                  {ATTENDANCE_STATUSES.map(({ value, label, color }) => {
                    const Icon = STATUS_ICONS[value];
                    const active = m.status === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => updateMember(m.uid, value)}
                        disabled={isSelf}
                        title={isSelf ? lockNote : label}
                        aria-label={`${m.name}: ${label}`}
                        aria-pressed={active}
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "3px",
                          border: `1px solid ${active ? color : "rgba(255, 255, 255, 0.1)"}`,
                          background: active ? `${color}25` : "transparent",
                          color: active ? color : "#374151",
                          cursor: isSelf ? "not-allowed" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.15s",
                        }}
                      >
                        <Icon size={12} />
                      </button>
                    );
                  })}
                </div>

                <span
                  className="hidden w-[104px] text-right font-mono text-xs tracking-[0.06em] sm:block"
                  style={{ color: m.status ? ATTENDANCE_COLORS[m.status] : "#374151" }}
                >
                  {m.status ? ATTENDANCE_LABELS[m.status] : isSelf ? lockNote : ""}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || markable.length === 0}
            className="flex items-center gap-2"
            style={{
              background: "#8B5CF6",
              color: "#fff",
              border: "none",
              borderRadius: "3px",
              padding: "11px 24px",
              fontFamily: "var(--font-jetbrains)",
              fontWeight: 700,
              fontSize: "0.875rem",
              letterSpacing: "0.08em",
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1,
              transition: "background 0.2s",
            }}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {saving ? "ХАДГАЛЖ БАЙНА..." : "ИРЦ ХАДГАЛАХ →"}
          </button>
          <span
            style={{ fontFamily: "var(--font-jetbrains)", fontSize: "0.75rem", color: "#4B5563" }}
          >
            "Ирсэн" тэмдэглэгээ +5 оноо
          </span>
        </div>
      </div>
    </PageContainer>
  );
}

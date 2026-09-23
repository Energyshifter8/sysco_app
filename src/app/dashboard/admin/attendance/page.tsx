"use client";

import { PageSpinner } from "@/components/page-spinner";
import { TeamFilter } from "@/components/team-filter";
import { useAuth } from "@/context/AuthContext";
import { filterByTeam, useTeamFilter } from "@/hooks/useTeamFilter";
import type { Team } from "@/lib/constants";
import { db } from "@/lib/firebase";
import { getInitials } from "@/lib/utils";
import { collection, doc, getDocs, increment, query, where, writeBatch } from "firebase/firestore";
import { CalendarOff, Check, Loader2, Minus, X } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";

const attendanceStatuses = ["present", "late", "absent", "excused"] as const;
type AttendanceStatus = (typeof attendanceStatuses)[number] | "";

const attendanceMeta = {
  present: { color: "#22C55E", label: "ИРСЭН", Icon: Check },
  late: { color: "#FBBF24", label: "ХОЦОРСОН", Icon: Minus },
  absent: { color: "#EF4444", label: "ИРЭЭГҮЙ", Icon: X },
  excused: { color: "#60A5FA", label: "ЧӨЛӨӨТЭЙ", Icon: CalendarOff },
} as const;

interface MemberAttendance {
  uid: string;
  name: string;
  team?: Team;
  status: AttendanceStatus;
  note: string;
}

/**
 * The attendance day key, in the admin's own timezone. `toISOString()` would
 * convert to UTC first, which in UTC+8 files the early hours of a day under the
 * previous date.
 */
function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function AttendanceContent() {
  const { userData, loading: authLoading } = useAuth();
  const [date, setDate] = useState<Date>(new Date());
  const [members, setMembers] = useState<MemberAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [team, setTeam] = useTeamFilter();

  useEffect(() => {
    async function fetchMembers() {
      setLoading(true);
      const snap = await getDocs(query(collection(db, "users"), where("role", "!=", "admin")));
      const data = snap.docs.map((d) => ({
        uid: d.data().uid,
        name: d.data().name,
        team: d.data().team as Team | undefined,
        status: "" as AttendanceStatus,
        note: "",
      }));
      setMembers(data);

      const dateKey = formatDateKey(date);
      const attSnap = await getDocs(
        query(collection(db, "attendance"), where("date", "==", dateKey)),
      );
      if (!attSnap.empty) {
        setMembers((prev) =>
          prev.map((m) => {
            const record = attSnap.docs.find((d) => d.data().uid === m.uid);
            if (record) {
              return {
                ...m,
                status: record.data().status as AttendanceStatus,
                note: record.data().note ?? "",
              };
            }
            return m;
          }),
        );
      }
      setLoading(false);
    }
    fetchMembers();
  }, [date]);

  function updateMember(uid: string, field: "status" | "note", value: string) {
    setMembers((prev) => prev.map((m) => (m.uid === uid ? { ...m, [field]: value } : m)));
  }

  async function handleSave() {
    if (!userData) return;
    setSaving(true);
    try {
      const dateKey = formatDateKey(date);
      const existingSnap = await getDocs(
        query(collection(db, "attendance"), where("date", "==", dateKey)),
      );
      const existingStatuses = new Map(
        existingSnap.docs.map((record) => [
          record.data().uid,
          record.data().status as AttendanceStatus,
        ]),
      );
      const batch = writeBatch(db);

      for (const member of members) {
        if (!member.status) continue;
        const attId = `${dateKey}_${member.uid}`;
        const attRef = doc(db, "attendance", attId);
        batch.set(attRef, {
          id: attId,
          uid: member.uid,
          date: dateKey,
          status: member.status,
          markedBy: userData.uid,
          note: member.note,
        });

        const previousStatus = existingStatuses.get(member.uid);
        if (previousStatus !== "present" && member.status === "present") {
          const userRef = doc(db, "users", member.uid);
          batch.update(userRef, { totalPoints: increment(5) });
        } else if (previousStatus === "present" && member.status !== "present") {
          const userRef = doc(db, "users", member.uid);
          batch.update(userRef, { totalPoints: increment(-5) });
        }
      }

      await batch.commit();
      toast.success("Ирц амжилттай хадгалагдлаа");
    } catch (err) {
      console.error("Ирцыг хадгалахад алдаа гарлаа", err);
      toast.error("Ирцыг хадгалахад алдаа гарлаа");
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || loading) {
    return <PageSpinner />;
  }

  // Only the listed members are counted, so the totals match what is on screen.
  const visible = filterByTeam(members, team);
  const counts = {
    present: visible.filter((m) => m.status === "present").length,
    late: visible.filter((m) => m.status === "late").length,
    absent: visible.filter((m) => m.status === "absent").length,
    excused: visible.filter((m) => m.status === "excused").length,
  };

  return (
    <div style={{ maxWidth: "720px" }}>
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
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
            ИРЦИЙН БҮРТГЭЛ
          </h1>
          <p
            style={{
              color: "#6B7280",
              fontSize: "0.75rem",
              fontFamily: "var(--font-jetbrains)",
              marginTop: "4px",
            }}
          >
            {date.toLocaleDateString("mn-MN", {
              year: "numeric",
              month: "long",
              day: "numeric",
              weekday: "long",
            })}
          </p>
        </div>
        <div className="flex gap-4">
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontFamily: "var(--font-barlow-condensed)",
                fontWeight: 800,
                fontSize: "1.5rem",
                color: "#22C55E",
              }}
            >
              {counts.present}
            </div>
            <div
              style={{
                fontFamily: "var(--font-jetbrains)",
                fontSize: "0.55rem",
                color: "#22C55E",
                letterSpacing: "0.08em",
              }}
            >
              ИРСЭН
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontFamily: "var(--font-barlow-condensed)",
                fontWeight: 800,
                fontSize: "1.5rem",
                color: "#60A5FA",
              }}
            >
              {counts.excused}
            </div>
            <div
              style={{
                fontFamily: "var(--font-jetbrains)",
                fontSize: "0.55rem",
                color: "#60A5FA",
                letterSpacing: "0.08em",
              }}
            >
              ЧӨЛӨӨТЭЙ
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontFamily: "var(--font-barlow-condensed)",
                fontWeight: 800,
                fontSize: "1.5rem",
                color: "#FBBF24",
              }}
            >
              {counts.late}
            </div>
            <div
              style={{
                fontFamily: "var(--font-jetbrains)",
                fontSize: "0.55rem",
                color: "#FBBF24",
                letterSpacing: "0.08em",
              }}
            >
              ХОЦОРСОН
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontFamily: "var(--font-barlow-condensed)",
                fontWeight: 800,
                fontSize: "1.5rem",
                color: "#EF4444",
              }}
            >
              {counts.absent}
            </div>
            <div
              style={{
                fontFamily: "var(--font-jetbrains)",
                fontSize: "0.55rem",
                color: "#EF4444",
                letterSpacing: "0.08em",
              }}
            >
              ИРЭЭГҮЙ
            </div>
          </div>
        </div>
      </div>

      {/* Date picker */}
      <div className="mb-6">
        <input
          type="date"
          value={formatDateKey(date)}
          onChange={(e) => setDate(new Date(`${e.target.value}T00:00:00`))}
          style={{
            background: "#1A1A1A",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "3px",
            padding: "8px 12px",
            color: "#E8E8E8",
            fontFamily: "var(--font-jetbrains)",
            fontSize: "0.8rem",
            outline: "none",
          }}
        />
      </div>

      <div style={{ marginBottom: "16px", maxWidth: "520px" }}>
        <TeamFilter value={team} onChange={setTeam} />
      </div>

      {/* Members list */}
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
        {visible.map((m, i) => {
          const status = m.status;
          return (
            <div
              key={m.uid}
              className="flex items-center gap-4 px-4 py-3"
              style={{
                borderBottom:
                  i < members.length - 1 ? "1px solid rgba(255, 255, 255, 0.05)" : "none",
                borderLeft: `3px solid ${status ? attendanceMeta[status].color : "transparent"}`,
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#1A1A1A")}
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.background = "transparent")
              }
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  background: "rgba(139, 92, 246, 0.08)",
                  fontFamily: "var(--font-jetbrains)",
                  fontSize: "0.6rem",
                  color: "#8B5CF6",
                }}
              >
                {getInitials(m.name)}
              </div>
              <div className="flex-1">
                <p
                  style={{
                    color: "#E8E8E8",
                    fontWeight: 600,
                    fontSize: "0.88rem",
                    fontFamily: "var(--font-barlow)",
                  }}
                >
                  {m.name}
                </p>
              </div>

              <div className="flex gap-1">
                {attendanceStatuses.map((s) => {
                  const { color, label, Icon } = attendanceMeta[s];
                  const active = status === s;
                  return (
                    <button
                      key={s}
                      onClick={() => updateMember(m.uid, "status", s)}
                      title={label}
                      aria-label={`${m.name}: ${label}`}
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "3px",
                        border: `1px solid ${active ? color : "rgba(255, 255, 255, 0.1)"}`,
                        background: active ? `${color}25` : "transparent",
                        color: active ? color : "#374151",
                        cursor: "pointer",
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
                style={{
                  fontFamily: "var(--font-jetbrains)",
                  fontSize: "0.6rem",
                  letterSpacing: "0.06em",
                  color: status ? attendanceMeta[status].color : "#374151",
                  width: "88px",
                  textAlign: "right",
                }}
              >
                {status ? attendanceMeta[status].label : ""}
              </span>
            </div>
          );
        })}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          background: saving ? "#22C55E" : "#8B5CF6",
          color: "#fff",
          border: "none",
          borderRadius: "3px",
          padding: "11px 24px",
          fontFamily: "var(--font-jetbrains)",
          fontWeight: 700,
          fontSize: "0.8rem",
          letterSpacing: "0.08em",
          cursor: saving ? "not-allowed" : "pointer",
          transition: "background 0.2s",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
        {saving ? "ХАДГАЛЖ БАЙНА..." : "ИРЦИЙГ ХАДГАЛАХ →"}
      </button>
    </div>
  );
}

export default function AttendancePage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <AttendanceContent />
    </Suspense>
  );
}

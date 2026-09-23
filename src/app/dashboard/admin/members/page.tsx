"use client";

import { MemberRoleEditor } from "@/components/member-role-editor";
import { PageContainer, PageHeader } from "@/components/page-container";
import { PageSpinner } from "@/components/page-spinner";
import { TeamFilter } from "@/components/team-filter";
import { filterByTeam, useTeamFilter } from "@/hooks/useTeamFilter";
import {
  ASSIGNEE_STATUS_COLORS,
  ASSIGNEE_STATUS_LABELS,
  ROLE_LABELS,
  type Role,
  TEAM_SHORT_LABELS,
  getMajorLabel,
} from "@/lib/constants";
import { db } from "@/lib/firebase";
import { getAssigneeReview, getAssigneeStatus } from "@/lib/tasks";
import { getInitials } from "@/lib/utils";
import { AttendanceRecord, Task, User } from "@/types";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { Loader2, Search, Star, Users } from "lucide-react";
import { Suspense, useEffect, useState } from "react";

const ROLE_BADGE: Record<Role, { background: string; color: string; border: string }> = {
  admin: {
    background: "rgba(139, 92, 246, 0.125)",
    color: "#8B5CF6",
    border: "rgba(139, 92, 246, 0.25)",
  },
  lead: {
    background: "rgba(59, 130, 246, 0.125)",
    color: "#60A5FA",
    border: "rgba(59, 130, 246, 0.25)",
  },
  member: { background: "#1F1F1F", color: "#6B7280", border: "rgba(255, 255, 255, 0.08)" },
};

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
      className="border flex-1"
      style={{
        background: "#141414",
        borderColor: "rgba(255, 255, 255, 0.07)",
        borderRadius: "4px",
        padding: "18px 20px",
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span style={{ color: accent }}>{icon}</span>
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

function MembersContent() {
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [team, setTeam] = useTeamFilter();
  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  const [memberTasks, setMemberTasks] = useState<Task[]>([]);
  const [memberAttendance, setMemberAttendance] = useState<AttendanceRecord[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    async function fetchMembers() {
      setLoading(true);
      const snap = await getDocs(query(collection(db, "users"), where("role", "!=", "admin")));
      setMembers(snap.docs.map((d) => d.data() as User));
      setLoading(false);
    }
    fetchMembers();
  }, []);

  const filtered = filterByTeam(members, team).filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      getMajorLabel(m.major).toLowerCase().includes(search.toLowerCase()),
  );

  async function handleViewMember(member: User) {
    setSelectedMember(member);
    setDetailLoading(true);
    const [tasksSnap, attSnap] = await Promise.all([
      getDocs(query(collection(db, "tasks"), where("assignedTo", "array-contains", member.uid))),
      getDocs(
        query(
          collection(db, "attendance"),
          where("uid", "==", member.uid),
          orderBy("date", "desc"),
        ),
      ),
    ]);
    setMemberTasks(tasksSnap.docs.map((d) => ({ ...d.data(), id: d.id }) as Task));
    setMemberAttendance(attSnap.docs.map((d) => ({ ...d.data(), id: d.id }) as AttendanceRecord));
    setDetailLoading(false);
  }

  if (loading) {
    return <PageSpinner />;
  }

  // The summary follows the filter, so the numbers always describe what is listed.
  const totalPoints = filtered.reduce((sum, m) => sum + m.totalPoints, 0);

  return (
    <PageContainer>
      <PageHeader
        title="ГИШҮҮДИЙН ТОЙМ"
        description={`${members.length} ГИШҮҮН — SYSCO&TECH CLUB`}
        actions={
          /* Search */
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

      {/* Summary cards */}
      <div className="flex gap-4 mb-6 flex-wrap">
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

      <div style={{ marginBottom: "20px", maxWidth: "520px" }}>
        <TeamFilter value={team} onChange={setTeam} />
      </div>

      {/* Table */}
      <div
        className="border"
        style={{
          background: "#141414",
          borderColor: "rgba(255, 255, 255, 0.07)",
          borderRadius: "4px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "32px 1fr 150px 130px 80px 80px",
            padding: "12px 20px",
            background: "#0F0F0F",
            borderBottom: "1px solid rgba(255, 255, 255, 0.07)",
          }}
        >
          {["#", "НЭР", "ЧИГЛЭЛ", "БАГ", "ОНОО", "ҮҮРЭГ"].map((h) => (
            <span
              key={h}
              style={{
                fontFamily: "var(--font-jetbrains)",
                fontSize: "0.6rem",
                color: "#6B7280",
                letterSpacing: "0.1em",
              }}
            >
              {h}
            </span>
          ))}
        </div>
        {filtered.map((m, i) => (
          <div
            key={m.uid}
            style={{
              display: "grid",
              gridTemplateColumns: "32px 1fr 150px 130px 80px 80px",
              padding: "12px 20px",
              alignItems: "center",
              borderBottom:
                i < filtered.length - 1 ? "1px solid rgba(255, 255, 255, 0.04)" : "none",
              transition: "background 0.1s",
              cursor: "pointer",
            }}
            onClick={() => handleViewMember(m)}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#1A1A1A")}
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.background = "transparent")
            }
          >
            <span
              style={{
                fontFamily: "var(--font-jetbrains)",
                fontSize: "0.75rem",
                color: "#4B5563",
              }}
            >
              {i + 1}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  background: "rgba(139, 92, 246, 0.08)",
                  fontFamily: "var(--font-jetbrains)",
                  fontSize: "0.55rem",
                  color: "#8B5CF6",
                  fontWeight: 700,
                }}
              >
                {getInitials(m.name)}
              </div>
              <span
                style={{
                  color: "#E8E8E8",
                  fontFamily: "var(--font-barlow)",
                  fontWeight: 600,
                  fontSize: "0.88rem",
                }}
              >
                {m.name}
              </span>
            </div>
            <span
              style={{
                color: "#9CA3AF",
                fontFamily: "var(--font-barlow)",
                fontSize: "0.8rem",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {getMajorLabel(m.major)}
            </span>
            <span
              style={{
                color: m.team ? "#9CA3AF" : "#374151",
                fontFamily: "var(--font-barlow)",
                fontSize: "0.8rem",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {m.team ? TEAM_SHORT_LABELS[m.team] : "—"}
            </span>
            <span
              style={{
                fontFamily: "var(--font-barlow-condensed)",
                fontWeight: 800,
                fontSize: "1rem",
                color: "#22C55E",
              }}
            >
              {m.totalPoints}
            </span>
            <span
              style={{
                fontFamily: "var(--font-jetbrains)",
                fontSize: "0.6rem",
                padding: "2px 6px",
                borderRadius: "2px",
                background: ROLE_BADGE[m.role].background,
                color: ROLE_BADGE[m.role].color,
                border: `1px solid ${ROLE_BADGE[m.role].border}`,
                letterSpacing: "0.06em",
                display: "inline-block",
              }}
            >
              {ROLE_LABELS[m.role]}
            </span>
          </div>
        ))}
        {filtered.length === 0 && (
          <div
            style={{
              padding: "24px",
              textAlign: "center",
              color: "#374151",
              fontFamily: "var(--font-jetbrains)",
              fontSize: "0.8rem",
            }}
          >
            ГИШҮҮН ОЛДСОНГҮЙ
          </div>
        )}
      </div>

      {/* Detail dialog */}
      {selectedMember && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0, 0, 0, 0.7)",
          }}
          onClick={() => setSelectedMember(null)}
        >
          <div
            style={{
              background: "#141414",
              border: "1px solid rgba(255, 255, 255, 0.07)",
              borderRadius: "4px",
              padding: "24px",
              maxWidth: "600px",
              width: "90vw",
              maxHeight: "85vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2
                style={{
                  fontFamily: "var(--font-barlow)",
                  fontWeight: 800,
                  fontSize: "1.2rem",
                  color: "#E8E8E8",
                }}
              >
                {selectedMember.name}
              </h2>
              <button
                onClick={() => setSelectedMember(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#6B7280",
                  cursor: "pointer",
                  fontSize: "1.2rem",
                }}
              >
                ✕
              </button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-5">
                <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
                  {[
                    { label: "ИМЭЙЛ", value: selectedMember.email },
                    { label: "СУРАЛЦАХ ЖИЛ", value: selectedMember.course || "-" },
                    { label: "МЭРГЭЖИЛ", value: getMajorLabel(selectedMember.major) || "-" },
                    { label: "НИЙТ ОНОО", value: String(selectedMember.totalPoints) },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p
                        style={{
                          fontFamily: "var(--font-jetbrains)",
                          fontSize: "0.6rem",
                          color: "#6B7280",
                          letterSpacing: "0.1em",
                          marginBottom: "4px",
                        }}
                      >
                        {label}
                      </p>
                      <p
                        style={{
                          fontFamily: "var(--font-barlow)",
                          fontSize: "0.9rem",
                          color: "#E8E8E8",
                          fontWeight: 600,
                        }}
                      >
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                <MemberRoleEditor
                  member={selectedMember}
                  onUpdated={(patch) => {
                    setSelectedMember((prev) => (prev ? { ...prev, ...patch } : prev));
                    setMembers((prev) =>
                      prev.map((m) => (m.uid === selectedMember.uid ? { ...m, ...patch } : m)),
                    );
                  }}
                />

                {memberTasks.length > 0 && (
                  <div>
                    <h3
                      style={{
                        fontFamily: "var(--font-jetbrains)",
                        fontSize: "0.7rem",
                        color: "#6B7280",
                        letterSpacing: "0.1em",
                        marginBottom: "8px",
                      }}
                    >
                      ДААЛГАВРЫН ТҮҮХ
                    </h3>
                    <div className="flex flex-col gap-1">
                      {memberTasks.map((t) => {
                        const review = getAssigneeReview(t, selectedMember.uid);
                        const status = getAssigneeStatus(t, selectedMember.uid);
                        return (
                          <div
                            key={t.id}
                            className="flex items-center justify-between gap-3 px-3 py-2"
                            style={{
                              background: "#0F0F0F",
                              borderRadius: "3px",
                            }}
                          >
                            <span
                              className="min-w-0 flex-1 truncate"
                              style={{
                                color: "#E8E8E8",
                                fontSize: "0.85rem",
                                fontFamily: "var(--font-barlow)",
                              }}
                            >
                              {t.title}
                            </span>
                            <span
                              style={{
                                fontFamily: "var(--font-jetbrains)",
                                fontSize: "0.6rem",
                                color: ASSIGNEE_STATUS_COLORS[status],
                                letterSpacing: "0.04em",
                              }}
                            >
                              {ASSIGNEE_STATUS_LABELS[status]}
                            </span>
                            <span
                              style={{
                                fontFamily: "var(--font-jetbrains)",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                color: review ? "#22C55E" : "#4B5563",
                              }}
                            >
                              {review ? `${review.score}/${t.points}` : `—/${t.points}`} pts
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {memberAttendance.length > 0 && (
                  <div>
                    <h3
                      style={{
                        fontFamily: "var(--font-jetbrains)",
                        fontSize: "0.7rem",
                        color: "#6B7280",
                        letterSpacing: "0.1em",
                        marginBottom: "8px",
                      }}
                    >
                      ИРЦИЙН ТҮҮХ
                    </h3>
                    <div className="flex flex-col gap-1">
                      {memberAttendance.map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center justify-between px-3 py-2"
                          style={{
                            background: "#0F0F0F",
                            borderRadius: "3px",
                          }}
                        >
                          <span
                            style={{
                              color: "#6B7280",
                              fontSize: "0.8rem",
                              fontFamily: "var(--font-jetbrains)",
                            }}
                          >
                            {a.date}
                          </span>
                          <span
                            style={{
                              fontFamily: "var(--font-jetbrains)",
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              color:
                                a.status === "present"
                                  ? "#22C55E"
                                  : a.status === "late"
                                    ? "#FBBF24"
                                    : "#EF4444",
                            }}
                          >
                            {a.status === "present"
                              ? "ИРСЭН"
                              : a.status === "late"
                                ? "ХОЦОРСОН"
                                : "ИРЭЭГҮЙ"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </PageContainer>
  );
}

export default function MembersPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <MembersContent />
    </Suspense>
  );
}

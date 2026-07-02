"use client";

import { useEffect, useState } from "react";
import { Loader2, Search, Users, Star } from "lucide-react";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { User, Task, AttendanceRecord } from "@/types";
import { getMajorLabel } from "@/lib/constants";
import { getInitials } from "@/lib/utils";

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

export default function MembersPage() {
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  const [memberTasks, setMemberTasks] = useState<Task[]>([]);
  const [memberAttendance, setMemberAttendance] = useState<
    AttendanceRecord[]
  >([]);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    async function fetchMembers() {
      setLoading(true);
      const snap = await getDocs(
        query(collection(db, "users"), where("role", "!=", "admin"))
      );
      setMembers(snap.docs.map((d) => d.data() as User));
      setLoading(false);
    }
    fetchMembers();
  }, []);

  const filtered = members.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      getMajorLabel(m.major).toLowerCase().includes(search.toLowerCase())
  );

  async function handleViewMember(member: User) {
    setSelectedMember(member);
    setDetailLoading(true);
    const [tasksSnap, attSnap] = await Promise.all([
      getDocs(
        query(
          collection(db, "tasks"),
          where("assignedTo", "array-contains", member.uid)
        )
      ),
      getDocs(
        query(
          collection(db, "attendance"),
          where("uid", "==", member.uid),
          orderBy("date", "desc")
        )
      ),
    ]);
    setMemberTasks(tasksSnap.docs.map((d) => d.data() as Task));
    setMemberAttendance(
      attSnap.docs.map((d) => d.data() as AttendanceRecord)
    );
    setDetailLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalPoints = members.reduce((s, m) => s + m.totalPoints, 0);

  return (
    <div style={{ maxWidth: "1000px" }}>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
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
            ГИШҮҮДИЙН ТОЙМ
          </h1>
          <p
            style={{
              color: "#6B7280",
              fontSize: "0.75rem",
              fontFamily: "var(--font-jetbrains)",
              marginTop: "4px",
            }}
          >
            {members.length} ГИШҮҮН — SYSCO CLUB
          </p>
        </div>
        {/* Search */}
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
      </div>

      {/* Summary cards */}
      <div className="flex gap-4 mb-6 flex-wrap">
        <StatCard label="НИЙТ ГИШҮҮН" value={members.length} accent="#8B5CF6" icon={<Users size={14} />} />
        <StatCard label="НИЙТ ОНШ" value={totalPoints.toLocaleString()} accent="#22C55E" icon={<Star size={14} />} />
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
            gridTemplateColumns: "32px 1fr 160px 100px 70px",
            padding: "12px 20px",
            background: "#0F0F0F",
            borderBottom: "1px solid rgba(255, 255, 255, 0.07)",
          }}
        >
          {["#", "НЭР", "ЧИГЛЭЛ", "ОНШ", "ҮҮРЭГ"].map((h) => (
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
              gridTemplateColumns: "32px 1fr 160px 100px 70px",
              padding: "12px 20px",
              alignItems: "center",
              borderBottom:
                i < filtered.length - 1
                  ? "1px solid rgba(255, 255, 255, 0.04)"
                  : "none",
              transition: "background 0.1s",
              cursor: "pointer",
            }}
            onClick={() => handleViewMember(m)}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#1A1A1A")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
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
                background: m.role === "admin" ? "rgba(139, 92, 246, 0.125)" : "#1F1F1F",
                color: m.role === "admin" ? "#8B5CF6" : "#6B7280",
                border: `1px solid ${m.role === "admin" ? "rgba(139, 92, 246, 0.25)" : "rgba(255, 255, 255, 0.08)"}`,
                letterSpacing: "0.06em",
                display: "inline-block",
              }}
            >
              {m.role === "admin" ? "ADMIN" : "MEMBER"}
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
                <div
                  className="grid gap-4"
                  style={{ gridTemplateColumns: "1fr 1fr" }}
                >
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
                      {memberTasks.map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between px-3 py-2"
                          style={{
                            background: "#0F0F0F",
                            borderRadius: "3px",
                          }}
                        >
                          <span
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
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              color: t.status === "completed" ? "#22C55E" : "#FBBF24",
                            }}
                          >
                            {t.points} pts
                          </span>
                        </div>
                      ))}
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
                            {typeof a.date === "string"
                              ? a.date
                              : a.date instanceof Date
                                ? a.date.toLocaleDateString()
                                : String(a.date)}
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
    </div>
  );
}

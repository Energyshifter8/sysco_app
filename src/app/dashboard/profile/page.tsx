"use client";

import { useAuth } from "@/context/AuthContext";
import { MAJORS } from "@/lib/constants";
import { db } from "@/lib/firebase";
import { getInitials } from "@/lib/utils";
import { TEAM_LABELS, Team } from "@/types";
import { doc, updateDoc } from "firebase/firestore";
import { Check, Loader2, Star, Trophy, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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

const COURSE_OPTIONS = [
  { value: "1", label: "1-р курс" },
  { value: "2", label: "2-р курс" },
  { value: "3", label: "3-р курс" },
  { value: "4", label: "4-р курс" },
];

export default function ProfilePage() {
  const { user, userData, loading } = useAuth();
  const [major, setMajor] = useState(userData?.major ?? "");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(major);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const [team, setTeam] = useState(userData?.team ?? "");
  const [teamEditing, setTeamEditing] = useState(false);
  const [teamDraft, setTeamDraft] = useState(team);
  const [teamSaved, setTeamSaved] = useState(false);
  const [teamSaving, setTeamSaving] = useState(false);

  const [course, setCourse] = useState(userData?.course ?? "");
  const [courseEditing, setCourseEditing] = useState(false);
  const [courseDraft, setCourseDraft] = useState(course);
  const [courseSaved, setCourseSaved] = useState(false);
  const [courseSaving, setCourseSaving] = useState(false);

  if (loading || !user || !userData) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { major: draft });
      setMajor(draft);
      setEditing(false);
      setSaved(true);
      toast.success("Профайл амжилттай шинэчлэгдлээ");
      setTimeout(() => setSaved(false), 2000);
    } catch {
      toast.error("Профайлыг шинэчлэхэд алдаа гарлаа");
    } finally {
      setSaving(false);
    }
  };

  const handleTeamSave = async () => {
    setTeamSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { team: teamDraft || null });
      setTeam(teamDraft);
      setTeamEditing(false);
      setTeamSaved(true);
      toast.success("Баг амжилттай шинэчлэгдлээ");
      setTimeout(() => setTeamSaved(false), 2000);
    } catch {
      toast.error("Багийг шинэчлэхэд алдаа гарлаа");
    } finally {
      setTeamSaving(false);
    }
  };

  const handleCourseSave = async () => {
    setCourseSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { course: courseDraft });
      setCourse(courseDraft);
      setCourseEditing(false);
      setCourseSaved(true);
      toast.success("Курс амжилттай шинэчлэгдлээ");
      setTimeout(() => setCourseSaved(false), 2000);
    } catch {
      toast.error("Курсыг шинэчлэхэд алдаа гарлаа");
    } finally {
      setCourseSaving(false);
    }
  };

  const initials = getInitials(userData.name);

  return (
    <div style={{ maxWidth: "680px" }}>
      <h1
        style={{
          fontFamily: "var(--font-jetbrains)",
          fontSize: "1.3rem",
          fontWeight: 800,
          color: "#E8E8E8",
          letterSpacing: "-0.02em",
          marginBottom: "28px",
        }}
      >
        ПРОФАЙЛ
      </h1>

      {/* User card */}
      <div
        className="border mb-6"
        style={{
          background: "#141414",
          borderColor: "rgba(255, 255, 255, 0.07)",
          borderRadius: "4px",
          padding: "24px",
        }}
      >
        <div className="flex items-center gap-5 mb-6">
          <div
            className="w-16 h-16 rounded flex items-center justify-center text-xl font-black"
            style={{
              background:
                "linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(139, 92, 246, 0.125))",
              border: "2px solid rgba(139, 92, 246, 0.375)",
              fontFamily: "var(--font-jetbrains)",
              color: "#8B5CF6",
              fontSize: "1rem",
            }}
          >
            {initials}
          </div>
          <div>
            <h2
              style={{
                fontFamily: "var(--font-barlow)",
                fontWeight: 800,
                fontSize: "1.3rem",
                color: "#E8E8E8",
                marginBottom: "4px",
              }}
            >
              {userData.name}
            </h2>
            <div className="flex gap-2 items-center flex-wrap">
              <span
                style={{
                  background: "rgba(139, 92, 246, 0.125)",
                  border: "1px solid rgba(139, 92, 246, 0.25)",
                  borderRadius: "3px",
                  padding: "2px 8px",
                  fontFamily: "var(--font-jetbrains)",
                  fontSize: "0.65rem",
                  color: "#8B5CF6",
                  letterSpacing: "0.06em",
                  fontWeight: 700,
                }}
              >
                {userData.role.toUpperCase()}
              </span>
              {course && (
                <span
                  style={{
                    background: "rgba(34, 197, 94, 0.125)",
                    border: "1px solid rgba(34, 197, 94, 0.25)",
                    borderRadius: "3px",
                    padding: "2px 8px",
                    fontFamily: "var(--font-jetbrains)",
                    fontSize: "0.65rem",
                    color: "#22C55E",
                    letterSpacing: "0.06em",
                    fontWeight: 700,
                  }}
                >
                  {COURSE_OPTIONS.find((c) => c.value === course)?.label || `${course}-р курс`}
                </span>
              )}
              <span
                style={{
                  color: "#6B7280",
                  fontSize: "0.75rem",
                  fontFamily: "var(--font-jetbrains)",
                }}
              >
                ID: {user.uid.slice(0, 8)}
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
          {[
            { label: "И-МЭЙЛ", value: user.email ?? "-" },
            {
              label: "ЭЛССЭН ОГНОО",
              value: userData.createdAt
                ? new Date(userData.createdAt).toLocaleDateString("mn-MN")
                : "-",
            },
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

          <div>
            <p
              style={{
                fontFamily: "var(--font-jetbrains)",
                fontSize: "0.6rem",
                color: "#6B7280",
                letterSpacing: "0.1em",
                marginBottom: "4px",
              }}
            >
              ЧИГЛЭЛ
            </p>
            {editing ? (
              <div className="flex gap-2 items-center">
                <select
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  style={{
                    background: "#1A1A1A",
                    border: "1px solid #8B5CF6",
                    borderRadius: "3px",
                    padding: "4px 8px",
                    color: "#E8E8E8",
                    fontFamily: "var(--font-barlow)",
                    fontSize: "0.85rem",
                    outline: "none",
                    flex: 1,
                  }}
                >
                  {MAJORS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    background: "#22C55E",
                    color: "#fff",
                    border: "none",
                    borderRadius: "3px",
                    padding: "4px 8px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setDraft(major);
                  }}
                  style={{
                    background: "rgba(239, 68, 68, 0.125)",
                    color: "#EF4444",
                    border: "1px solid rgba(239, 68, 68, 0.25)",
                    borderRadius: "3px",
                    padding: "4px 8px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="flex gap-2 items-center">
                <p
                  style={{
                    fontFamily: "var(--font-barlow)",
                    fontSize: "0.9rem",
                    color: "#E8E8E8",
                    fontWeight: 600,
                  }}
                >
                  {MAJORS.find((m) => m.value === major)?.label || major}
                </p>
                <button
                  onClick={() => setEditing(true)}
                  style={{
                    background: "none",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "3px",
                    padding: "2px 6px",
                    cursor: "pointer",
                    fontFamily: "var(--font-jetbrains)",
                    fontSize: "0.6rem",
                    color: "#6B7280",
                  }}
                >
                  ЗАСАХ
                </button>
                {saved && (
                  <span
                    style={{
                      color: "#22C55E",
                      fontSize: "0.65rem",
                      fontFamily: "var(--font-jetbrains)",
                    }}
                  >
                    ✓ ХАДГАЛАГДЛАА
                  </span>
                )}
              </div>
            )}
          </div>

          <div>
            <p
              style={{
                fontFamily: "var(--font-jetbrains)",
                fontSize: "0.6rem",
                color: "#6B7280",
                letterSpacing: "0.1em",
                marginBottom: "4px",
              }}
            >
              БАГ
            </p>
            {teamEditing ? (
              <div className="flex gap-2 items-center">
                <select
                  value={teamDraft}
                  onChange={(e) => setTeamDraft(e.target.value)}
                  style={{
                    background: "#1A1A1A",
                    border: "1px solid #8B5CF6",
                    borderRadius: "3px",
                    padding: "4px 8px",
                    color: "#E8E8E8",
                    fontFamily: "var(--font-barlow)",
                    fontSize: "0.85rem",
                    outline: "none",
                    flex: 1,
                  }}
                >
                  <option value="">Сонгоогүй</option>
                  {(Object.keys(TEAM_LABELS) as Team[]).map((t) => (
                    <option key={t} value={t}>
                      {TEAM_LABELS[t]}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleTeamSave}
                  disabled={teamSaving}
                  style={{
                    background: "#22C55E",
                    color: "#fff",
                    border: "none",
                    borderRadius: "3px",
                    padding: "4px 8px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {teamSaving ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                </button>
                <button
                  onClick={() => {
                    setTeamEditing(false);
                    setTeamDraft(team);
                  }}
                  style={{
                    background: "rgba(239, 68, 68, 0.125)",
                    color: "#EF4444",
                    border: "1px solid rgba(239, 68, 68, 0.25)",
                    borderRadius: "3px",
                    padding: "4px 8px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="flex gap-2 items-center">
                <p
                  style={{
                    fontFamily: "var(--font-barlow)",
                    fontSize: "0.9rem",
                    color: "#E8E8E8",
                    fontWeight: 600,
                  }}
                >
                  {team ? TEAM_LABELS[team as Team] : "Сонгоогүй"}
                </p>
                <button
                  onClick={() => setTeamEditing(true)}
                  style={{
                    background: "none",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "3px",
                    padding: "2px 6px",
                    cursor: "pointer",
                    fontFamily: "var(--font-jetbrains)",
                    fontSize: "0.6rem",
                    color: "#6B7280",
                  }}
                >
                  ЗАСАХ
                </button>
                {teamSaved && (
                  <span
                    style={{
                      color: "#22C55E",
                      fontSize: "0.65rem",
                      fontFamily: "var(--font-jetbrains)",
                    }}
                  >
                    ✓ ХАДГАЛАГДЛАА
                  </span>
                )}
              </div>
            )}
          </div>

          <div>
            <p
              style={{
                fontFamily: "var(--font-jetbrains)",
                fontSize: "0.6rem",
                color: "#6B7280",
                letterSpacing: "0.1em",
                marginBottom: "4px",
              }}
            >
              КУРС
            </p>
            {courseEditing ? (
              <div className="flex gap-2 items-center">
                <select
                  value={courseDraft}
                  onChange={(e) => setCourseDraft(e.target.value)}
                  style={{
                    background: "#1A1A1A",
                    border: "1px solid #8B5CF6",
                    borderRadius: "3px",
                    padding: "4px 8px",
                    color: "#E8E8E8",
                    fontFamily: "var(--font-barlow)",
                    fontSize: "0.85rem",
                    outline: "none",
                    flex: 1,
                  }}
                >
                  <option value="">Сонгоогүй</option>
                  {COURSE_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleCourseSave}
                  disabled={courseSaving}
                  style={{
                    background: "#22C55E",
                    color: "#fff",
                    border: "none",
                    borderRadius: "3px",
                    padding: "4px 8px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {courseSaving ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                </button>
                <button
                  onClick={() => {
                    setCourseEditing(false);
                    setCourseDraft(course);
                  }}
                  style={{
                    background: "rgba(239, 68, 68, 0.125)",
                    color: "#EF4444",
                    border: "1px solid rgba(239, 68, 68, 0.25)",
                    borderRadius: "3px",
                    padding: "4px 8px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="flex gap-2 items-center">
                <p
                  style={{
                    fontFamily: "var(--font-barlow)",
                    fontSize: "0.9rem",
                    color: "#E8E8E8",
                    fontWeight: 600,
                  }}
                >
                  {course
                    ? COURSE_OPTIONS.find((c) => c.value === course)?.label || `${course}-р курс`
                    : "Сонгоогүй"}
                </p>
                <button
                  onClick={() => setCourseEditing(true)}
                  style={{
                    background: "none",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "3px",
                    padding: "2px 6px",
                    cursor: "pointer",
                    fontFamily: "var(--font-jetbrains)",
                    fontSize: "0.6rem",
                    color: "#6B7280",
                  }}
                >
                  ЗАСАХ
                </button>
                {courseSaved && (
                  <span
                    style={{
                      color: "#22C55E",
                      fontSize: "0.65rem",
                      fontFamily: "var(--font-jetbrains)",
                    }}
                  >
                    ✓ ХАДГАЛАГДЛАА
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 mb-6 flex-wrap">
        <StatCard
          label="НИЙТ ОНШ"
          value={userData.totalPoints.toLocaleString()}
          accent="#8B5CF6"
          icon={<Star size={14} />}
        />
        <StatCard label="ЭРЭМБЭ" value="-" accent="#FBBF24" icon={<Trophy size={14} />} />
      </div>
    </div>
  );
}

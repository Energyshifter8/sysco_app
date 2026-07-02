"use client";

import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { getInitials } from "@/lib/utils";
import { TEAM_LABELS, Task, Team, User } from "@/types";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  increment,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { Check, CheckCircle2, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function resolveAssignedLabel(entry: string, members: User[]): string {
  if (entry === "all") return "Бүх гишүүд";
  if (entry.startsWith("team:")) {
    const key = entry.slice(5) as Team;
    return TEAM_LABELS[key] ?? entry;
  }
  const member = members.find((m) => m.uid === entry);
  return member?.name ?? entry;
}

export default function AdminTasksPage() {
  const { userData, loading: authLoading } = useAuth();
  const [members, setMembers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [points, setPoints] = useState("100");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [membersSnap, tasksSnap] = await Promise.all([
        getDocs(query(collection(db, "users"), where("role", "!=", "admin"))),
        getDocs(collection(db, "tasks")),
      ]);
      setMembers(membersSnap.docs.map((d) => d.data() as User));
      setTasks(tasksSnap.docs.map((d) => d.data() as Task));
      setLoading(false);
    }
    fetchData();
  }, []);

  function toggleMember(uid: string) {
    setSelectedMembers((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid],
    );
  }

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!userData || !title) return;
    if (selectedMembers.length === 0) {
      toast.error("Нэг эсвэл түбээс олон гишүүн сонгоно уу");
      return;
    }
    setSaving(true);
    try {
      const assignedTo = selectedMembers.length === members.length ? ["all"] : [...selectedMembers];
      const taskData = {
        title,
        description,
        points: Number(points),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        createdBy: userData.uid,
        assignedTo,
        status: "assigned",
      };
      const docRef = await addDoc(collection(db, "tasks"), taskData);
      await updateDoc(docRef, { id: docRef.id });
      setTasks((prev) => [...prev, { ...taskData, id: docRef.id } as Task]);
      setTitle("");
      setDescription("");
      setPoints("100");
      setSelectedMembers([]);
      toast.success("Даалгавар амжилттай үүсгэгдлээ");
    } catch {
      toast.error("Даалгавар үүсгэхэд алдаа гарлаа");
    } finally {
      setSaving(false);
    }
  }

  async function handleApproveTask(task: Task, memberUid: string) {
    try {
      const taskRef = doc(db, "tasks", task.id);
      const newAssignedTo = task.assignedTo.filter((id) => id !== memberUid);
      await updateDoc(taskRef, {
        assignedTo: newAssignedTo,
        status: newAssignedTo.length === 0 ? "completed" : task.status,
      });
      const userRef = doc(db, "users", memberUid);
      await updateDoc(userRef, { totalPoints: increment(task.points) });
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? {
                ...t,
                assignedTo: newAssignedTo,
                status: newAssignedTo.length === 0 ? "completed" : t.status,
              }
            : t,
        ),
      );
      toast.success("Даалгавар баталгаажуулагдлаа, оноо нэмэгдлээ");
    } catch {
      toast.error("Даалгавар баталгаажуулахад алдаа гарлаа");
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "900px" }}>
      <div className="mb-8">
        <h1
          style={{
            fontFamily: "var(--font-jetbrains)",
            fontSize: "1.3rem",
            fontWeight: 800,
            color: "#E8E8E8",
            letterSpacing: "-0.02em",
          }}
        >
          ДААЛГАВАР ҮҮСГЭХ
        </h1>
        <p
          style={{
            color: "#6B7280",
            fontSize: "0.75rem",
            fontFamily: "var(--font-jetbrains)",
            marginTop: "4px",
          }}
        >
          ADMIN PANEL
        </p>
      </div>

      <div
        className="border"
        style={{
          background: "#141414",
          borderColor: "rgba(255, 255, 255, 0.07)",
          borderRadius: "4px",
          padding: "28px",
          marginBottom: "32px",
        }}
      >
        <form onSubmit={handleCreateTask} className="flex flex-col gap-5">
          {/* Title */}
          <div>
            <label
              style={{
                fontFamily: "var(--font-jetbrains)",
                fontSize: "0.65rem",
                color: "#6B7280",
                letterSpacing: "0.1em",
                display: "block",
                marginBottom: "8px",
              }}
            >
              ГАРЧИГ *
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Даалгаврын гарчиг..."
              required
              style={{
                width: "100%",
                background: "#1A1A1A",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "3px",
                padding: "10px 12px",
                color: "#E8E8E8",
                fontFamily: "var(--font-barlow)",
                fontSize: "0.9rem",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Description */}
          <div>
            <label
              style={{
                fontFamily: "var(--font-jetbrains)",
                fontSize: "0.65rem",
                color: "#6B7280",
                letterSpacing: "0.1em",
                display: "block",
                marginBottom: "8px",
              }}
            >
              ТАЙЛБАР
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Даалгаврын дэлгэрэнгүй тайлбар..."
              style={{
                width: "100%",
                background: "#1A1A1A",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "3px",
                padding: "10px 12px",
                color: "#E8E8E8",
                fontFamily: "var(--font-barlow)",
                fontSize: "0.9rem",
                outline: "none",
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Points */}
          <div style={{ maxWidth: "160px" }}>
            <label
              style={{
                fontFamily: "var(--font-jetbrains)",
                fontSize: "0.65rem",
                color: "#6B7280",
                letterSpacing: "0.1em",
                display: "block",
                marginBottom: "8px",
              }}
            >
              ОНШ *
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="number"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                style={{
                  width: "100%",
                  background: "#1A1A1A",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "3px",
                  padding: "10px 36px 10px 12px",
                  color: "#22C55E",
                  fontFamily: "var(--font-jetbrains)",
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <span
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#22C55E",
                  fontFamily: "var(--font-jetbrains)",
                  fontSize: "0.7rem",
                }}
              >
                pts
              </span>
            </div>
          </div>

          {/* Member select */}
          <div>
            <label
              style={{
                fontFamily: "var(--font-jetbrains)",
                fontSize: "0.65rem",
                color: "#6B7280",
                letterSpacing: "0.1em",
                display: "block",
                marginBottom: "8px",
              }}
            >
              ГИШҮҮД СОНГОХ ({selectedMembers.length} СОНГОГДСОН)
            </label>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => {
                const sel = selectedMembers.includes(m.uid);
                return (
                  <button
                    key={m.uid}
                    type="button"
                    onClick={() => toggleMember(m.uid)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "5px 12px",
                      borderRadius: "20px",
                      border: `1px solid ${sel ? "#8B5CF6" : "rgba(255, 255, 255, 0.1)"}`,
                      background: sel ? "rgba(139, 92, 246, 0.125)" : "transparent",
                      color: sel ? "#8B5CF6" : "#9CA3AF",
                      cursor: "pointer",
                      fontFamily: "var(--font-barlow)",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      transition: "all 0.15s",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-jetbrains)",
                        fontSize: "0.6rem",
                      }}
                    >
                      {getInitials(m.name)}
                    </span>
                    {m.name}
                    {sel && <X size={10} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
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
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {saving ? "ҮҮСГЭЖ БАЙНА..." : "ДААЛГАВАР ҮҮСГЭХ →"}
            </button>
            <button
              type="button"
              onClick={() => {
                setTitle("");
                setDescription("");
                setPoints("100");
                setSelectedMembers([]);
              }}
              style={{
                background: "transparent",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "3px",
                padding: "11px 16px",
                color: "#6B7280",
                fontFamily: "var(--font-jetbrains)",
                fontSize: "0.75rem",
                cursor: "pointer",
              }}
            >
              ЦЭВЭРЛЭХ
            </button>
          </div>
        </form>
      </div>

      {/* Task list */}
      <h2
        style={{
          fontFamily: "var(--font-jetbrains)",
          fontSize: "0.75rem",
          fontWeight: 700,
          color: "#6B7280",
          letterSpacing: "0.1em",
          marginBottom: "16px",
        }}
      >
        БАЙГАА ДААЛГАВРУУД
      </h2>
      <div className="flex flex-col gap-2">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="border"
            style={{
              background: "#141414",
              borderColor: "rgba(255, 255, 255, 0.07)",
              borderRadius: "4px",
              padding: "14px 16px",
              borderLeft: `3px solid ${task.status === "completed" ? "#22C55E" : "#FBBF24"}`,
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
                  }}
                >
                  {task.title}
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <span
                    style={{
                      fontFamily: "var(--font-jetbrains)",
                      fontSize: "0.65rem",
                      color: task.status === "completed" ? "#22C55E" : "#FBBF24",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {task.status === "completed" ? "Дууссан" : "Хүлээгдэж буй"}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-jetbrains)",
                      fontSize: "0.65rem",
                      color: "#6B7280",
                    }}
                  >
                    {task.assignedTo.map((a) => resolveAssignedLabel(a, members)).join(", ")}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div
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
                {task.assignedTo.some((id) => id !== "all" && !id.startsWith("team:")) && (
                  <div className="flex flex-wrap gap-1">
                    {task.assignedTo
                      .filter((id) => id !== "all" && !id.startsWith("team:"))
                      .map((uid) => (
                        <button
                          key={uid}
                          onClick={() => handleApproveTask(task, uid)}
                          style={{
                            background: "rgba(34, 197, 94, 0.125)",
                            color: "#22C55E",
                            border: "1px solid rgba(34, 197, 94, 0.25)",
                            borderRadius: "3px",
                            padding: "4px 8px",
                            cursor: "pointer",
                            fontFamily: "var(--font-jetbrains)",
                            fontSize: "0.65rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <CheckCircle2 size={12} />
                          {resolveAssignedLabel(uid, members)}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {tasks.length === 0 && (
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

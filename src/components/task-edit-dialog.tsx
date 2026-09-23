"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ASSIGN_ALL, MAX_TASK_POINTS, type Team, teamToken } from "@/lib/constants";
import { db } from "@/lib/firebase";
import { asDate, getInitials } from "@/lib/utils";
import { Task, User } from "@/types";
import { doc, updateDoc } from "firebase/firestore";
import { Check, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-jetbrains)",
  fontSize: "0.62rem",
  color: "#6B7280",
  letterSpacing: "0.1em",
  display: "block",
  marginBottom: "6px",
};

const fieldStyle: React.CSSProperties = {
  width: "100%",
  background: "#1A1A1A",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  borderRadius: "3px",
  padding: "9px 12px",
  color: "#E8E8E8",
  fontFamily: "var(--font-barlow)",
  fontSize: "0.88rem",
  outline: "none",
  boxSizing: "border-box",
};

/**
 * `datetime-local` wants wall-clock time, so the UTC offset is subtracted before
 * slicing. Going through `toISOString()` directly would shift the value into UTC
 * and, in UTC+8, file an evening deadline under the previous day.
 */
function toDateTimeLocalValue(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export interface TaskEditDialogProps {
  task: Task | null;
  /** Who the editor may assign to — already narrowed to a lead's own team. */
  assignable: User[];
  /** A lead's edits stay inside their team; an admin may use the "all" token. */
  scope: "admin" | "lead";
  /** The lead's team, used to collapse "everyone" into a single team token. */
  team?: Team;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Edits an existing task: title, description, points, deadline and assignees.
 *
 * The security rules allow an admin to update any task and a lead only their
 * own, but they cannot check that each uid in `assignedTo` is on the lead's
 * team — rules have no loops — so that check happens here, exactly as it does
 * when a task is created.
 */
export function TaskEditDialog({
  task,
  assignable,
  scope,
  team,
  open,
  onOpenChange,
}: TaskEditDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [points, setPoints] = useState("0");
  const [deadline, setDeadline] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Reload the form whenever a different task is opened, so a previous edit
  // never leaks into the next one.
  useEffect(() => {
    if (!open || !task) return;
    const due = asDate(task.dueDate);
    setTitle(task.title ?? "");
    setDescription(task.description ?? "");
    setPoints(String(task.points ?? 0));
    setDeadline(due ? toDateTimeLocalValue(due) : "");
    // "all" and "team:<team>" expand back into the people they stand for, so the
    // picker always shows real names.
    const entries = task.assignedTo ?? [];
    setSelected(
      entries.includes(ASSIGN_ALL) || entries.some((e) => e.startsWith("team:"))
        ? assignable.map((m) => m.uid)
        : entries.filter((e) => assignable.some((m) => m.uid === e)),
    );
  }, [open, task, assignable]);

  if (!task) return null;

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!task) return;

    const trimmed = title.trim();
    if (!trimmed) {
      toast.error("Гарчгийг оруулна уу");
      return;
    }
    if (selected.length === 0) {
      toast.error("Нэг эсвэл түүнээс олон гишүүн сонгоно уу");
      return;
    }

    const pointValue = Number(points);
    if (!Number.isInteger(pointValue) || pointValue < 0 || pointValue > MAX_TASK_POINTS) {
      toast.error(`Оноог 0–${MAX_TASK_POINTS} хооронд бүхэл тоогоор оруулна уу`);
      return;
    }

    // Lowering the ceiling under a score already given would leave the ledger
    // and the task disagreeing, so it is refused rather than silently clamped.
    const highestScore = Math.max(
      0,
      ...Object.values(task.assigneeReview ?? {}).map((review) => review.score),
    );
    if (pointValue < highestScore) {
      toast.error(`Аль хэдийн ${highestScore} оноо өгсөн тул үүнээс бага болгож болохгүй`);
      return;
    }

    const deadlineDate = deadline ? new Date(deadline) : null;
    if (deadline && Number.isNaN(deadlineDate?.getTime() ?? Number.NaN)) {
      toast.error("Хугацааг зөв оруулна уу");
      return;
    }

    if (scope === "lead" && selected.some((uid) => !assignable.some((m) => m.uid === uid))) {
      toast.error("Зөвхөн өөрийн багийн гишүүдэд даалгавар өгөх боломжтой");
      return;
    }

    const everyone = selected.length === assignable.length && assignable.length > 0;
    const assignedTo = everyone
      ? [scope === "admin" ? ASSIGN_ALL : teamToken(team as Team)]
      : [...selected];

    setSaving(true);
    try {
      await updateDoc(doc(db, "tasks", task.id), {
        title: trimmed,
        description: description.trim(),
        points: pointValue,
        ...(deadlineDate ? { dueDate: deadlineDate } : {}),
        assignedTo,
      });
      toast.success("Даалгавар шинэчлэгдлээ");
      onOpenChange(false);
    } catch (err) {
      console.error("Даалгаврыг шинэчлэхэд алдаа гарлаа", err);
      toast.error("Даалгаврыг шинэчлэхэд алдаа гарлаа");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && saving) return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto sm:max-w-lg max-sm:h-dvh max-sm:max-h-dvh max-sm:max-w-full max-sm:rounded-none"
        style={{
          background: "#141414",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "6px",
          padding: "24px",
          gap: "16px",
        }}
      >
        <DialogHeader style={{ gap: "6px" }}>
          <DialogTitle
            style={{
              fontFamily: "var(--font-barlow)",
              fontWeight: 700,
              fontSize: "1.05rem",
              color: "#E8E8E8",
            }}
          >
            Даалгавар засах
          </DialogTitle>
          <DialogDescription style={{ ...labelStyle, marginBottom: 0 }}>
            ГАРЧИГ, ТАЙЛБАР, ОНОО, ХУГАЦАА, ГИШҮҮД
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div>
            <label htmlFor="edit-title" style={labelStyle}>
              ГАРЧИГ *
            </label>
            <input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={fieldStyle}
            />
          </div>

          <div>
            <label htmlFor="edit-description" style={labelStyle}>
              ТАЙЛБАР
            </label>
            <textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              style={{ ...fieldStyle, resize: "vertical" }}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="edit-points" style={labelStyle}>
                ДЭЭД ОНОО *
              </label>
              <input
                id="edit-points"
                type="number"
                min={0}
                max={MAX_TASK_POINTS}
                step={1}
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                style={{
                  ...fieldStyle,
                  color: "#22C55E",
                  fontFamily: "var(--font-jetbrains)",
                  fontWeight: 700,
                }}
              />
            </div>
            <div>
              <label htmlFor="edit-deadline" style={labelStyle}>
                ЭЦСИЙН ХУГАЦАА
              </label>
              <input
                id="edit-deadline"
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                style={{
                  ...fieldStyle,
                  fontFamily: "var(--font-jetbrains)",
                  fontSize: "0.78rem",
                }}
              />
            </div>
          </div>

          <div>
            <span style={labelStyle}>ГИШҮҮД ({selected.length} СОНГОГДСОН)</span>
            <div className="flex flex-wrap gap-1.5">
              {assignable.map((member) => {
                const on = selected.includes(member.uid);
                return (
                  <button
                    key={member.uid}
                    type="button"
                    onClick={() =>
                      setSelected((prev) =>
                        prev.includes(member.uid)
                          ? prev.filter((id) => id !== member.uid)
                          : [...prev, member.uid],
                      )
                    }
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "4px 10px",
                      borderRadius: "20px",
                      border: `1px solid ${on ? "#8B5CF6" : "rgba(255, 255, 255, 0.1)"}`,
                      background: on ? "rgba(139, 92, 246, 0.125)" : "transparent",
                      color: on ? "#8B5CF6" : "#9CA3AF",
                      cursor: "pointer",
                      fontFamily: "var(--font-barlow)",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                    }}
                  >
                    <span style={{ fontFamily: "var(--font-jetbrains)", fontSize: "0.58rem" }}>
                      {getInitials(member.name)}
                    </span>
                    {member.name}
                    {on && <X size={10} />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              style={{
                background: "transparent",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "3px",
                padding: "9px 14px",
                color: "#6B7280",
                fontFamily: "var(--font-jetbrains)",
                fontSize: "0.72rem",
                cursor: "pointer",
              }}
            >
              БОЛИХ
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2"
              style={{
                background: "#8B5CF6",
                color: "#fff",
                border: "none",
                borderRadius: "3px",
                padding: "9px 18px",
                fontFamily: "var(--font-jetbrains)",
                fontWeight: 700,
                fontSize: "0.75rem",
                letterSpacing: "0.06em",
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              ХАДГАЛАХ
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

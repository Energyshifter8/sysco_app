"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroupSegment, RadioGroupSegments } from "@/components/ui/radio-group";
import { Task, User } from "@/types";
import { Check, Loader2, Minus, Plus } from "lucide-react";
import { useEffect, useState } from "react";

/** Above this many points a segmented row stops being readable. */
const MAX_SEGMENTED_POINTS = 10;

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-jetbrains)",
  fontSize: "0.6rem",
  color: "#6B7280",
  letterSpacing: "0.08em",
  display: "block",
  marginBottom: "8px",
};

export interface ReviewDialogProps {
  task: Task | null;
  assignee: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (score: number, comment: string) => Promise<void>;
  submitting: boolean;
}

/** Scores one member's work on one task, from 0 up to the task's point value. */
export function ReviewDialog({
  task,
  assignee,
  open,
  onOpenChange,
  onSubmit,
  submitting,
}: ReviewDialogProps) {
  const max = task?.points ?? 0;
  const [score, setScore] = useState(max);
  const [comment, setComment] = useState("");

  // Each time the dialog opens on a different pairing, start from full marks.
  useEffect(() => {
    if (open) {
      setScore(max);
      setComment("");
    }
  }, [open, max]);

  if (!task || !assignee) return null;

  const clamp = (value: number) => Math.min(max, Math.max(0, Math.round(value)));
  const scoreOptions = Array.from({ length: max + 1 }, (_, index) => index);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        style={{
          background: "#141414",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "6px",
          padding: "24px",
          gap: "20px",
        }}
      >
        <DialogHeader style={{ gap: "8px" }}>
          <DialogTitle
            style={{
              fontFamily: "var(--font-barlow)",
              fontWeight: 700,
              fontSize: "1.1rem",
              color: "#E8E8E8",
              lineHeight: 1.3,
            }}
          >
            {assignee.name} — үнэлгээ
          </DialogTitle>
          <DialogDescription
            style={{
              fontFamily: "var(--font-jetbrains)",
              fontSize: "0.7rem",
              color: "#6B7280",
              letterSpacing: "0.06em",
            }}
          >
            {task.title} · дээд тал нь {max} оноо
          </DialogDescription>
        </DialogHeader>

        <div>
          <span style={labelStyle}>
            ОНОО ({score}/{max})
          </span>
          {max <= MAX_SEGMENTED_POINTS ? (
            <RadioGroupSegments
              value={String(score)}
              onValueChange={(value) => setScore(clamp(Number(value)))}
              disabled={submitting}
              aria-label="Өгөх оноо"
            >
              {scoreOptions.map((option) => (
                <RadioGroupSegment
                  key={option}
                  value={String(option)}
                  accent="#22C55E"
                  disabled={submitting}
                >
                  {option}
                </RadioGroupSegment>
              ))}
            </RadioGroupSegments>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setScore((s) => clamp(s - 1))}
                disabled={submitting || score <= 0}
                aria-label="Оноо хасах"
                className="flex size-8 items-center justify-center rounded-md border border-white/10 text-[#9CA3AF] transition-colors hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Minus size={14} />
              </button>
              <input
                type="number"
                min={0}
                max={max}
                step={1}
                value={score}
                disabled={submitting}
                onChange={(e) => setScore(clamp(Number(e.target.value) || 0))}
                aria-label="Өгөх оноо"
                style={{
                  width: "88px",
                  background: "#1A1A1A",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "3px",
                  padding: "6px 10px",
                  color: "#22C55E",
                  fontFamily: "var(--font-jetbrains)",
                  fontSize: "0.9rem",
                  fontWeight: 700,
                  textAlign: "center",
                  outline: "none",
                }}
              />
              <button
                type="button"
                onClick={() => setScore((s) => clamp(s + 1))}
                disabled={submitting || score >= max}
                aria-label="Оноо нэмэх"
                className="flex size-8 items-center justify-center rounded-md border border-white/10 text-[#9CA3AF] transition-colors hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus size={14} />
              </button>
              <button
                type="button"
                onClick={() => setScore(max)}
                disabled={submitting}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "3px",
                  padding: "6px 10px",
                  color: "#6B7280",
                  fontFamily: "var(--font-jetbrains)",
                  fontSize: "0.62rem",
                  cursor: submitting ? "not-allowed" : "pointer",
                }}
              >
                ДҮҮРЭН
              </button>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="review-comment" style={labelStyle}>
            ТАЙЛБАР (СОНГОХ)
          </label>
          <textarea
            id="review-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            disabled={submitting}
            placeholder="Юу сайн болсон, юуг сайжруулах вэ..."
            style={{
              width: "100%",
              background: "#1A1A1A",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "3px",
              padding: "10px 12px",
              color: "#E8E8E8",
              fontFamily: "var(--font-barlow)",
              fontSize: "0.85rem",
              outline: "none",
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onSubmit(score, comment.trim())}
            disabled={submitting}
            style={{
              background: "#22C55E",
              color: "#fff",
              border: "none",
              borderRadius: "3px",
              padding: "9px 18px",
              fontFamily: "var(--font-jetbrains)",
              fontWeight: 700,
              fontSize: "0.72rem",
              letterSpacing: "0.06em",
              cursor: submitting ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "7px",
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            БАТАЛГААЖУУЛАХ
          </button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "3px",
              padding: "9px 14px",
              color: "#6B7280",
              fontFamily: "var(--font-jetbrains)",
              fontSize: "0.7rem",
              cursor: submitting ? "not-allowed" : "pointer",
            }}
          >
            БОЛИХ
          </button>
        </div>

        <p
          style={{
            fontFamily: "var(--font-barlow)",
            fontSize: "0.75rem",
            color: "#4B5563",
          }}
        >
          Баталгаажуулсны дараа оноо нэмэгдэж, гишүүн статусаа солих боломжгүй болно. Дахин үнэлэх
          боломжгүй.
        </p>
      </DialogContent>
    </Dialog>
  );
}

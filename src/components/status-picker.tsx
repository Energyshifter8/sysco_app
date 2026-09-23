"use client";

import { RadioGroupSegment, RadioGroupSegments } from "@/components/ui/radio-group";
import { ASSIGNEE_STATUSES, type AssigneeStatus } from "@/lib/constants";
import { Loader2 } from "lucide-react";

export interface StatusPickerProps {
  value: AssigneeStatus;
  onChange: (next: AssigneeStatus) => void;
  /** Set while a status write is in flight. */
  busy?: boolean;
  /** Set once the work has been reviewed, or after the deadline has passed. */
  disabled?: boolean;
  /** Statuses the member may not pick right now, e.g. "done" past the deadline. */
  blocked?: AssigneeStatus[];
}

/** The member's own three-state progress control on a task. */
export function StatusPicker({
  value,
  onChange,
  busy = false,
  disabled = false,
  blocked = [],
}: StatusPickerProps) {
  return (
    <div className="flex items-center gap-2">
      <RadioGroupSegments
        value={value}
        onValueChange={(next) => onChange(next as AssigneeStatus)}
        disabled={disabled || busy}
        aria-label="Даалгаврын статус"
      >
        {ASSIGNEE_STATUSES.map((status) => (
          <RadioGroupSegment
            key={status.value}
            value={status.value}
            accent={status.color}
            disabled={disabled || busy || blocked.includes(status.value)}
          >
            {status.label}
          </RadioGroupSegment>
        ))}
      </RadioGroupSegments>
      {busy && <Loader2 size={13} className="shrink-0 animate-spin text-[#6B7280]" />}
    </div>
  );
}

"use client";

import { RadioGroupSegment, RadioGroupSegments } from "@/components/ui/radio-group";
import { ALL_TEAMS, type TeamFilterValue } from "@/hooks/useTeamFilter";
import { TEAMS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export interface TeamFilterProps {
  value: TeamFilterValue;
  onChange: (next: TeamFilterValue) => void;
  className?: string;
}

/** Shared "Бүгд / <team>" segmented filter used across the list pages. */
export function TeamFilter({ value, onChange, className }: TeamFilterProps) {
  return (
    <RadioGroupSegments
      value={value}
      onValueChange={(next) => onChange(next as TeamFilterValue)}
      aria-label="Багаар шүүх"
      className={cn("overflow-x-auto", className)}
    >
      <RadioGroupSegment value={ALL_TEAMS}>Бүгд</RadioGroupSegment>
      {TEAMS.map((team) => (
        <RadioGroupSegment key={team.value} value={team.value}>
          {team.short}
        </RadioGroupSegment>
      ))}
    </RadioGroupSegments>
  );
}

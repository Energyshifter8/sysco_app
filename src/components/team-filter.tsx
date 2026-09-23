"use client";

import { RadioGroupSegment, RadioGroupSegments } from "@/components/ui/radio-group";
import { ALL_TEAMS, NO_TEAM, type TeamFilterValue } from "@/hooks/useTeamFilter";
import { TEAMS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export interface TeamFilterProps {
  value: TeamFilterValue;
  onChange: (next: TeamFilterValue) => void;
  className?: string;
  /**
   * Adds a "Баггүй" segment. Only for lists that actually contain people with
   * no team — the attendance roster, where the admins live.
   */
  showNoTeam?: boolean;
}

/** Shared "Бүгд / <team>" segmented filter used across the list pages. */
export function TeamFilter({ value, onChange, className, showNoTeam }: TeamFilterProps) {
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
      {showNoTeam && <RadioGroupSegment value={NO_TEAM}>Баггүй</RadioGroupSegment>}
    </RadioGroupSegments>
  );
}

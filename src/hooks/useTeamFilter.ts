"use client";

import { type Team, isTeam } from "@/lib/constants";
import { useSearchParams } from "next/navigation";
import { useCallback } from "react";

export const ALL_TEAMS = "all";

/**
 * People with no team of their own — in practice the admins, who belong to the
 * attendance roster without belonging to any one team.
 */
export const NO_TEAM = "none";

export type TeamFilterValue = Team | typeof ALL_TEAMS | typeof NO_TEAM;

/**
 * Team filter backed by the `?team=` search param, so a filtered view survives
 * a refresh and can be shared as a link.
 *
 * Writes go through `window.history.replaceState` rather than the router: Next
 * keeps `useSearchParams` in sync with it, and a filter change does not need an
 * RSC round-trip. The value is always written explicitly — including "all" —
 * so an absent param means "use the caller's default" and nothing else.
 */
export function useTeamFilter(fallback: TeamFilterValue = ALL_TEAMS) {
  const searchParams = useSearchParams();
  const raw = searchParams.get("team");
  const value: TeamFilterValue =
    raw === ALL_TEAMS || raw === NO_TEAM ? raw : isTeam(raw) ? raw : fallback;

  const setValue = useCallback((next: TeamFilterValue) => {
    const params = new URLSearchParams(window.location.search);
    params.set("team", next);
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }, []);

  return [value, setValue] as const;
}

/** Narrows any list of people to the selected team, or to those without one. */
export function filterByTeam<T extends { team?: Team }>(items: T[], team: TeamFilterValue): T[] {
  if (team === ALL_TEAMS) return items;
  if (team === NO_TEAM) return items.filter((item) => !item.team);
  return items.filter((item) => item.team === team);
}

import type { Role, Team } from "@/lib/constants";

/** The minimum shape any permission check needs from a user document. */
export interface Principal {
  uid: string;
  role: Role;
  team?: Team;
}

export function isAdmin(user?: Pick<Principal, "role"> | null): boolean {
  return user?.role === "admin";
}

export function isLead(user?: Pick<Principal, "role"> | null): boolean {
  return user?.role === "lead";
}

/** Admins and leads both see the lead task workspace. */
export function canManageTeamTasks(actor?: Principal | null): boolean {
  return isAdmin(actor) || isLead(actor);
}

/**
 * Can `actor` administer `target`'s profile (role, team, points)?
 * Admins can manage anyone; a lead only their own team-mates.
 */
export function canManageMember(actor?: Principal | null, target?: Principal | null): boolean {
  if (!actor || !target) return false;
  if (isAdmin(actor)) return true;
  return isLead(actor) && !!actor.team && actor.team === target.team;
}

/**
 * Can `actor` score `assignee`'s work? Nobody reviews themselves — a lead's own
 * tasks have to be signed off by an admin.
 */
export function canReview(actor?: Principal | null, assignee?: Principal | null): boolean {
  if (!actor || !assignee) return false;
  if (actor.uid === assignee.uid) return false;
  if (isAdmin(actor)) return true;
  return isLead(actor) && !!actor.team && actor.team === assignee.team;
}

/** Can `actor` assign a task to `target`? Leads are limited to their own team. */
export function canAssignTo(actor?: Principal | null, target?: Principal | null): boolean {
  if (!actor || !target) return false;
  if (isAdmin(actor)) return true;
  return isLead(actor) && !!actor.team && actor.team === target.team;
}

import type { Role, Team } from "@/lib/constants";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

/** Everyone, or one team — the difference between the admin and lead screens. */
export type AttendanceScope = "all" | { team: Team };

/** One person on the attendance roster. Every role is on it, admins included. */
export interface AttendanceRosterEntry {
  uid: string;
  name: string;
  role: Role;
  team?: Team;
}

/**
 * The people whose day can be filed under `scope`.
 *
 * Attendance is not a members-only register: an admin turns up to the same
 * sessions and earns the same +5, so no role is filtered out here. A team scope
 * therefore returns that team's lead and any admin attached to it as well, and
 * the club-wide scope returns the whole directory — including the admins who
 * have no team at all, who reach the screen through the "Баггүй" filter.
 *
 * The caller's own row comes back too: it has to be *shown* (someone else may
 * already have marked it) even though nobody may mark it themselves. Both the
 * workspace and the security rules drop self-marks, not this query.
 */
export async function getAttendanceRoster(
  scope: AttendanceScope,
): Promise<AttendanceRosterEntry[]> {
  const snap = await getDocs(
    scope === "all"
      ? collection(db, "users")
      : query(collection(db, "users"), where("team", "==", scope.team)),
  );

  return snap.docs
    .map((d) => d.data())
    .map((u) => ({
      uid: u.uid as string,
      name: u.name as string,
      role: u.role as Role,
      team: u.team as Team | undefined,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "mn"));
}

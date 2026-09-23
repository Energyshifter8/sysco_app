"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROLES, type Role, TEAMS, type Team } from "@/lib/constants";
import { db } from "@/lib/firebase";
import { User } from "@/types";
import { doc, updateDoc } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const NO_TEAM = "__none__";

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-jetbrains)",
  fontSize: "0.75rem",
  color: "#6B7280",
  letterSpacing: "0.1em",
  marginBottom: "4px",
};

/**
 * Admin control for a member's role and team.
 *
 * A lead is defined by the team they lead, so promoting someone without a team
 * is rejected here rather than silently creating a lead who can reach nobody.
 */
export function MemberRoleEditor({
  member,
  onUpdated,
}: {
  member: User;
  onUpdated: (patch: Partial<User>) => void;
}) {
  const [saving, setSaving] = useState(false);

  async function save(patch: Partial<Pick<User, "role" | "team">>) {
    const nextRole = patch.role ?? member.role;
    const nextTeam = "team" in patch ? patch.team : member.team;

    if (nextRole === "lead" && !nextTeam) {
      toast.error("Ахлагч болгохын тулд эхлээд баг сонгоно уу");
      return;
    }

    setSaving(true);
    try {
      await updateDoc(doc(db, "users", member.uid), {
        ...("role" in patch ? { role: patch.role } : {}),
        ...("team" in patch ? { team: patch.team ?? null } : {}),
      });
      onUpdated(patch);
      toast.success("Гишүүний мэдээлэл шинэчлэгдлээ");
    } catch (err) {
      console.error("Гишүүнийг шинэчлэхэд алдаа гарлаа", err);
      toast.error("Гишүүнийг шинэчлэхэд алдаа гарлаа");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
      <div>
        <p style={labelStyle}>ҮҮРЭГ</p>
        <Select
          value={member.role}
          disabled={saving}
          onValueChange={(value) => save({ role: value as Role })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <p style={labelStyle}>
          БАГ {saving && <Loader2 size={10} className="inline animate-spin" />}
        </p>
        <Select
          value={member.team ?? NO_TEAM}
          disabled={saving}
          onValueChange={(value) => save({ team: value === NO_TEAM ? undefined : (value as Team) })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_TEAM}>Сонгоогүй</SelectItem>
            {TEAMS.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

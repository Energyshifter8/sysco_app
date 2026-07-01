"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Team, TEAM_LABELS } from "@/types";
import { MAJORS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const COURSE_OPTIONS = [
  "1st Year",
  "2nd Year",
  "3rd Year",
  "4th Year",
  "5th Year",
  "Graduate",
];

export default function ProfilePage() {
  const { user, userData, loading } = useAuth();
  const [course, setCourse] = useState(userData?.course ?? "");
  const [major, setMajor] = useState(userData?.major ?? "");
  const [team, setTeam] = useState<Team | "">(userData?.team ?? "");
  const [saving, setSaving] = useState(false);

  if (loading || !user || !userData) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      const ref = doc(db, "users", user.uid);
      await updateDoc(ref, { course, major, team: team || null });
      toast.success("Профайл амжилттай шинэчлэгдлээ");
    } catch {
      toast.error("Профайлыг шинэчлэхэд алдаа гарлаа");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 sm:space-y-6">
      <h1 className="text-xl font-bold sm:text-2xl">Профайл</h1>

      <Card>
        <CardHeader>
          <CardTitle>Бүртгэлийн мэдээлэл</CardTitle>
          <CardDescription>Таны бүртгэлийн мэдээлэл</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label>Нэр</Label>
            <Input value={userData.name} disabled />
          </div>
          <div className="grid gap-2">
            <Label>Email</Label>
            <Input value={user.email ?? ""} disabled />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Үүрэг</Label>
              <Input value={userData.role} disabled className="capitalize" />
            </div>
            <div className="grid gap-2">
              <Label>Нийт оноо</Label>
              <Input value={userData.totalPoints} disabled />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Профайл засах</CardTitle>
          <CardDescription>Сургалтын мэдээллээ өөрчлөх</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label>Суралцах жил / Түвшин</Label>
            <Select value={course} onValueChange={setCourse}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Суралцах жилээ сонгоно уу" />
              </SelectTrigger>
              <SelectContent>
                {COURSE_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Мэргэжил / Чиглэл</Label>
            <Select value={major} onValueChange={setMajor}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Мэргэжлээ сонгоно уу" />
              </SelectTrigger>
              <SelectContent>
                {MAJORS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Баг</Label>
            <Select value={team} onValueChange={(v) => setTeam(v as Team | "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Багаа сонгоно уу" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TEAM_LABELS) as Team[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {TEAM_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Save className="mr-2 size-4" />
            )}
            {saving ? "Хадгалж байна..." : "Хадгалах"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

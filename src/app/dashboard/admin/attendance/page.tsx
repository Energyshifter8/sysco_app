"use client";

import { useEffect, useState } from "react";
import { Loader2, CalendarIcon } from "lucide-react";
import {
  collection,
  getDocs,
  query,
  where,
  writeBatch,
  doc,
  increment,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

type AttendanceStatus = "present" | "absent" | "late" | "";

interface MemberAttendance {
  uid: string;
  name: string;
  status: AttendanceStatus;
  note: string;
}

function formatDateKey(date: Date): string {
  return date.toISOString().split("T")[0];
}

export default function AttendancePage() {
  const { userData, loading: authLoading } = useAuth();
  const [date, setDate] = useState<Date>(new Date());
  const [members, setMembers] = useState<MemberAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  useEffect(() => {
    async function fetchMembers() {
      setLoading(true);
      const snap = await getDocs(
        query(collection(db, "users"), where("role", "!=", "admin"))
      );
      const data = snap.docs.map((d) => ({
        uid: d.data().uid,
        name: d.data().name,
        status: "" as AttendanceStatus,
        note: "",
      }));
      setMembers(data);

      const dateKey = formatDateKey(date);
      const attSnap = await getDocs(
        query(
          collection(db, "attendance"),
          where("date", "==", dateKey)
        )
      );
      if (!attSnap.empty) {
        setMembers((prev) =>
          prev.map((m) => {
            const record = attSnap.docs.find(
              (d) => d.data().uid === m.uid
            );
            if (record) {
              return {
                ...m,
                status: record.data().status as AttendanceStatus,
                note: record.data().note ?? "",
              };
            }
            return m;
          })
        );
      }
      setLoading(false);
    }
    fetchMembers();
  }, [date]);

  function updateMember(
    uid: string,
    field: "status" | "note",
    value: string
  ) {
    setMembers((prev) =>
      prev.map((m) => (m.uid === uid ? { ...m, [field]: value } : m))
    );
  }

  async function handleSave() {
    if (!userData) return;
    setSaving(true);
    try {
      const dateKey = formatDateKey(date);
      const batch = writeBatch(db);

      for (const member of members) {
        if (!member.status) continue;
        const attId = `${dateKey}_${member.uid}`;
        const attRef = doc(db, "attendance", attId);
        batch.set(attRef, {
          id: attId,
          uid: member.uid,
          date: dateKey,
          status: member.status,
          markedBy: userData.uid,
          note: member.note,
        });

        if (member.status === "present") {
          const userRef = doc(db, "users", member.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            batch.update(userRef, {
              totalPoints: increment(5),
            });
          }
        }
      }

      await batch.commit();
      toast.success("Ирц амжилттай хадгалагдлаа");
    } catch {
      toast.error("Ирцыг хадгалахад алдаа гарлаа");
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold sm:text-2xl">Ирц бүртгэл</h1>
        <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
          {saving ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : null}
          {saving ? "Хадгалж байна..." : "Ирц хадгалах"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <CardTitle className="text-base sm:text-lg">Огноо сонгох</CardTitle>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-full sm:w-auto">
                  <CalendarIcon className="mr-2 size-4" />
                  {date.toLocaleDateString("mn-MN", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => {
                    if (d) {
                      setDate(d);
                      setCalendarOpen(false);
                    }
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent>
          {/* Mobile card view */}
          <div className="space-y-3 sm:hidden">
            {members.map((member) => (
              <div key={member.uid} className="rounded-lg border p-3 space-y-2">
                <p className="font-medium text-sm">{member.name}</p>
                <div className="flex gap-2">
                  <Select
                    value={member.status}
                    onValueChange={(v) =>
                      updateMember(member.uid, "status", v)
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Сонгох" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="present">Ирсэн</SelectItem>
                      <SelectItem value="absent">Тасалсан</SelectItem>
                      <SelectItem value="late">Хоцорсон</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Тэмдэглэл"
                    className="flex-1"
                    value={member.note}
                    onChange={(e) =>
                      updateMember(member.uid, "note", e.target.value)
                    }
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table view */}
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Нэр</TableHead>
                  <TableHead className="w-36 md:w-40">Төлөв</TableHead>
                  <TableHead>Тэмдэглэл</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.uid}>
                    <TableCell className="font-medium">
                      {member.name}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={member.status}
                        onValueChange={(v) =>
                          updateMember(member.uid, "status", v)
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Сонгох" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="present">Ирсэн</SelectItem>
                          <SelectItem value="absent">Тасалсан</SelectItem>
                          <SelectItem value="late">Хоцорсон</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        placeholder="Нэмэлт тэмдэглэл"
                        value={member.note}
                        onChange={(e) =>
                          updateMember(member.uid, "note", e.target.value)
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {members.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">
              Гишүүд олдсонгүй
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

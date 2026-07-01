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
      toast.success("Attendance saved successfully");
    } catch {
      toast.error("Failed to save attendance");
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Attendance</h1>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : null}
          {saving ? "Saving..." : "Save Attendance"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <CardTitle>Select Date</CardTitle>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <CalendarIcon className="mr-2 size-4" />
                  {date.toLocaleDateString("en-US", {
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="w-40">Status</TableHead>
                <TableHead>Note</TableHead>
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
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="present">Present</SelectItem>
                        <SelectItem value="absent">Absent</SelectItem>
                        <SelectItem value="late">Late</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      placeholder="Optional note"
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
          {members.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">
              No members found
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

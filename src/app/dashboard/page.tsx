"use client";

import { Loader2, Trophy, Medal, CheckSquare } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLeaderboard } from "@/hooks/useLeaderboard";
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

export default function DashboardPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const { entries, loading: leaderboardLoading } = useLeaderboard();

  if (authLoading || !user || !userData) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const userRank = entries.find((e) => e.uid === user.uid)?.rank ?? "-";

  return (
    <div className="space-y-6 sm:space-y-8">
      <h1 className="text-xl font-bold sm:text-2xl">Хянах самбар</h1>

      <div className="grid gap-3 sm:gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Таны оноо
            </CardTitle>
            <Trophy className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold sm:text-3xl">{userData.totalPoints}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Байр
            </CardTitle>
            <Medal className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold sm:text-3xl">
              {leaderboardLoading ? (
                <Loader2 className="size-6 animate-spin" />
              ) : (
                `#${userRank}`
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="sm:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Дуусгасан даалгавар
            </CardTitle>
            <CheckSquare className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold sm:text-3xl">0</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Шууд чансаа</CardTitle>
        </CardHeader>
        <CardContent>
          {leaderboardLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : entries.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              Хэрэглэгч олдсонгүй
            </p>
          ) : (
            <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <Table className="min-w-[400px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 sm:w-16">#</TableHead>
                    <TableHead>Нэр</TableHead>
                    <TableHead className="hidden sm:table-cell">Суралцах жил</TableHead>
                    <TableHead className="text-right">Оноо</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow
                      key={entry.uid}
                      className={
                        entry.uid === user.uid ? "bg-accent font-medium" : ""
                      }
                    >
                      <TableCell>#{entry.rank}</TableCell>
                      <TableCell>
                        {entry.name}
                        {entry.uid === user.uid && (
                          <span className="ml-1.5 text-xs text-muted-foreground">
                            (Та)
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {entry.course || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {entry.totalPoints}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

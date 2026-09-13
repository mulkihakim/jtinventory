import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CheckCheck,
  ClipboardList,
  Clock,
  FolderKanban,
  ListOrdered,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const isTechnician = session.user.role === "TEKNISI";
  const userId = Number(session.user.id);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [
    totalItems,
    totalCategories,
    totalUsers,
    pendingRequests,
    activeLoans,
    completedTransactions,
    overdueLoansCount,
    recentLoans,
    overdueLoansList,
  ] = await Promise.all([
    prisma.item.count({ where: isTechnician ? undefined : { is_active: true, condition: "GOOD", available_quantity: { gt: 0 } } }),
    isTechnician ? prisma.category.count() : Promise.resolve(0),
    isTechnician ? prisma.user.count() : Promise.resolve(0),
    prisma.loan.count({ where: { status: "PENDING", ...(isTechnician ? {} : { user_id: userId }) } }),
    prisma.loan.count({ where: { status: { in: ["APPROVED", "BORROWED"] }, ...(isTechnician ? {} : { user_id: userId }) } }),
    prisma.loan.count({ where: { status: { in: ["RETURNED", "REJECTED"] }, ...(isTechnician ? {} : { user_id: userId }) } }),
    prisma.loan.count({
      where: {
        status: "BORROWED",
        due_date: { lte: startOfToday },
        ...(isTechnician ? {} : { user_id: userId }),
      },
    }),
    prisma.loan.findMany({
      where: isTechnician ? undefined : { user_id: userId },
      orderBy: { requested_at: "desc" },
      take: 5,
      include: {
        user: true,
        loan_items: {
          include: {
            item: true,
          },
        },
      },
    }),
    prisma.loan.findMany({
      where: {
        status: "BORROWED",
        due_date: { lte: startOfToday },
        ...(isTechnician ? {} : { user_id: userId }),
      },
      orderBy: { due_date: "asc" },
      include: {
        user: true,
        loan_items: {
          include: {
            item: true,
          },
        },
      },
    }),
  ]);

  const technicianStats = [
    {
      title: "Total Items",
      value: totalItems.toLocaleString(),
      description: "Inventory items",
      icon: Boxes,
    },
    {
      title: "Categories",
      value: totalCategories.toLocaleString(),
      description: "Item categories",
      icon: FolderKanban,
    },
    {
      title: "Pending Requests",
      value: pendingRequests.toLocaleString(),
      description: "Awaiting technician approval",
      icon: ListOrdered,
    },
    {
      title: "Active Loans",
      value: activeLoans.toLocaleString(),
      description: "Approved or currently borrowed",
      icon: ClipboardList,
    },
    {
      title: "Overdue Loans",
      value: overdueLoansCount.toLocaleString(),
      description: "Passed return due date",
      icon: AlertTriangle,
      isWarning: overdueLoansCount > 0,
    },
    {
      title: "Completed",
      value: completedTransactions.toLocaleString(),
      description: "Returned or rejected",
      icon: CheckCheck,
    },
    {
      title: "Users",
      value: totalUsers.toLocaleString(),
      description: "Registered users",
      icon: Users,
    },
  ];

  const userStats = [
    {
      title: "Pending Requests",
      value: pendingRequests.toLocaleString(),
      description: "Your requests awaiting approval",
      icon: ListOrdered,
    },
    {
      title: "Active Loans",
      value: activeLoans.toLocaleString(),
      description: "Your approved or currently borrowed items",
      icon: ClipboardList,
    },
    {
      title: "Overdue Loans",
      value: overdueLoansCount.toLocaleString(),
      description: "Your items passed due date",
      icon: AlertTriangle,
      isWarning: overdueLoansCount > 0,
    },
    {
      title: "Loan History",
      value: completedTransactions.toLocaleString(),
      description: "Your returned or rejected requests",
      icon: CheckCheck,
    },
  ];

  const stats = isTechnician ? technicianStats : userStats;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Dashboard
          </h1>
          <p className="text-muted-foreground">
            Overview of your inventory management system.
          </p>
        </div>

        <Link
          href="/loans"
          className={buttonVariants({ variant: "outline", size: "sm", className: "gap-1.5 self-start sm:self-auto" })}
        >
          Ke Halaman Loans
          <ArrowRight className="size-3.5" />
        </Link>
      </div>

      {/* Overdue Warning Alert Banner for Students/Lecturers */}
      {!isTechnician && overdueLoansCount > 0 ? (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-destructive">
          <AlertTriangle className="size-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-base">
              Perhatian: Anda memiliki {overdueLoansCount} pinjaman yang telah melewati jatuh tempo!
            </p>
            <p className="text-sm text-destructive/90">
              Barang yang Anda pinjam telah melebihi batas tanggal pengembalian. Harap segera menyerahkan fisik barang ke laboratorium/teknisi dan melakukan konfirmasi pengembalian.
            </p>
            <Link
              href="/loans"
              className="inline-flex items-center gap-1.5 font-semibold underline text-sm mt-1 hover:text-destructive/80"
            >
              Lihat dan kembalikan sekarang di halaman Loans
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      ) : null}

      {/* Summary Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const isWarning = "isWarning" in stat && stat.isWarning;

          return (
            <Card
              key={stat.title}
              className={isWarning ? "border-destructive/40 bg-destructive/5" : ""}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className={`text-sm font-medium ${isWarning ? "text-destructive font-semibold" : ""}`}>
                  {stat.title}
                </CardTitle>

                <Icon className={`size-4 ${isWarning ? "text-destructive" : "text-muted-foreground"}`} />
              </CardHeader>

              <CardContent>
                <div className={`text-2xl font-bold ${isWarning ? "text-destructive" : ""}`}>
                  {stat.value}
                </div>

                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Special Overdue / Unreturned Loans Section for Technician */}
      {isTechnician && (
        <Card className={overdueLoansList.length > 0 ? "border-destructive/30" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">
                  Pinjaman Terlewat Jatuh Tempo / Belum Dikembalikan
                </CardTitle>
                {overdueLoansList.length > 0 ? (
                  <Badge variant="destructive" className="font-semibold">
                    {overdueLoansList.length} Terlambat
                  </Badge>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                Daftar mahasiswa dan dosen yang meminjam barang dan telah melewati batas tanggal pengembalian.
              </p>
            </div>

            <Link
              href="/loans"
              className={buttonVariants({ variant: "ghost", size: "sm", className: "gap-1 text-xs" })}
            >
              Kelola Semua
              <ArrowRight className="size-3" />
            </Link>
          </CardHeader>

          <CardContent className="px-0 pb-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Peminjam</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Kontak / NIM</TableHead>
                    <TableHead>Barang</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Keterlambatan</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {overdueLoansList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <Clock className="size-5 text-muted-foreground" />
                          <p className="font-medium text-foreground">Tidak ada pinjaman yang terlambat</p>
                          <p className="text-xs text-muted-foreground">
                            Semua pinjaman aktif berada dalam jadwal atau belum melewati jatuh tempo.
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    overdueLoansList.map((loan) => {
                      const itemNames = loan.loan_items.map((entry) => entry.item.name).join(", ") || "-";
                      const totalQuantity = loan.loan_items.reduce((sum, entry) => sum + entry.quantity, 0);
                      const dueDateObj = loan.due_date ? new Date(loan.due_date) : null;
                      const daysLate = dueDateObj
                        ? Math.max(1, Math.ceil((now.getTime() - dueDateObj.getTime()) / (1000 * 60 * 60 * 24)))
                        : 0;

                      return (
                        <TableRow key={loan.id} className="hover:bg-destructive/5">
                          <TableCell className="font-medium text-foreground">
                            {loan.user.name}
                          </TableCell>
                          <TableCell>
                            <span className="rounded bg-muted px-2 py-0.5 text-xs font-semibold">
                              {loan.user.role}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            <div>{loan.user.identity_number || "-"}</div>
                            <div>{loan.user.email}</div>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{itemNames}</span>
                            <span className="ml-1 text-xs text-muted-foreground">({totalQuantity} unit)</span>
                          </TableCell>
                          <TableCell className="font-semibold text-destructive">
                            {dueDateObj ? dueDateObj.toLocaleDateString("id-ID") : "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="destructive" className="font-mono text-xs">
                              +{daysLate} hari
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Link
                              href="/loans"
                              className={buttonVariants({ variant: "outline", size: "sm", className: "h-7 text-xs" })}
                            >
                              Proses
                            </Link>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Loan Activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle>{isTechnician ? "Recent loan activity" : "Your recent loan activity"}</CardTitle>
          <Link
            href="/loans"
            className={buttonVariants({ variant: "ghost", size: "sm", className: "gap-1 text-xs" })}
          >
            Kelola Semua
            <ArrowRight className="size-3" />
          </Link>
        </CardHeader>

        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Peminjam</TableHead>
                  <TableHead>Barang</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {recentLoans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      Belum ada aktivitas peminjaman.
                    </TableCell>
                  </TableRow>
                ) : (
                  recentLoans.map((loan) => {
                    const itemNames = loan.loan_items.map((entry) => entry.item.name).join(", ") || "-";
                    const totalQuantity = loan.loan_items.reduce((sum, entry) => sum + entry.quantity, 0);
                    const isOverdue = Boolean(
                      loan.due_date &&
                      loan.status === "BORROWED" &&
                      new Date(loan.due_date) <= startOfToday
                    );

                    return (
                      <TableRow key={loan.id}>
                        <TableCell className="font-medium">{loan.user.name}</TableCell>
                        <TableCell>{itemNames}</TableCell>
                        <TableCell>{totalQuantity}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span className={isOverdue ? "font-semibold text-destructive" : ""}>
                              {loan.due_date ? new Date(loan.due_date).toLocaleDateString("id-ID") : "-"}
                            </span>
                            {isOverdue ? (
                              <Badge variant="destructive" className="h-4 px-1 text-[10px]">
                                Overdue
                              </Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              loan.status === "PENDING"
                                ? "secondary"
                                : loan.status === "REJECTED"
                                  ? "destructive"
                                  : loan.status === "RETURNED"
                                    ? "default"
                                    : "outline"
                            }
                          >
                            {loan.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

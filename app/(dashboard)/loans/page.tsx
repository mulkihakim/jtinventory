"use client";

import { useEffect, useMemo, useState } from "react";
import { getSession } from "next-auth/react";
import { Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { LoanSummaryCards } from "./components/loan-summary-cards";
import {
  LoanRecord,
  LoanSortConfig,
  LoanSortKey,
  LoanTable,
  LoanWorkflowAction,
} from "./components/loan-table";
import { LoanDialog } from "./components/loan-dialog";
import { LoanDetailDialog } from "./components/loan-detail-dialog";
import { LoanReturnDialog } from "./components/loan-return-dialog";
import { LoanDeleteDialog } from "./components/loan-delete-dialog";

type UserRole = "MAHASISWA" | "DOSEN" | "TEKNISI";

export type InventoryItemOption = {
  id: number;
  name: string;
  code?: string;
  availableQuantity: number;
};

export default function LoansPage() {
  const [loans, setLoans] = useState<LoanRecord[]>([]);
  const [borrowerOptions, setBorrowerOptions] = useState<string[]>([]);
  const [itemOptions, setItemOptions] = useState<string[]>([]);
  const [availableItems, setAvailableItems] = useState<InventoryItemOption[]>([]);
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<LoanRecord | null>(null);
  const [sortConfig, setSortConfig] = useState<LoanSortConfig>({
    key: "borrower",
    direction: "asc",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<LoanRecord | null>(null);
  const [viewingLoan, setViewingLoan] = useState<LoanRecord | null>(null);
  const [returningLoan, setReturningLoan] = useState<LoanRecord | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const isTechnician = role === "TEKNISI";
  const pageSize = 5;

  async function loadItems() {
    try {
      const itemsResponse = await fetch("/api/items");
      if (!itemsResponse.ok) return;
      const items = (await itemsResponse.json()) as Array<{
        id: number;
        name: string;
        code?: string;
        availableQuantity: number;
      }>;
      setAvailableItems(items.filter((item) => Boolean(item.name)));
      setItemOptions(items.map((item) => item.name).filter(Boolean));
    } catch (error) {
      console.error("Failed to reload items:", error);
    }
  }

  async function loadLoans() {
    try {
      const response = await fetch("/api/loans");
      if (!response.ok) {
        throw new Error("Failed to fetch loans");
      }
      const data = (await response.json()) as LoanRecord[];
      setLoans(data);
      void loadItems();
    } catch (error) {
      console.error("Failed to load loans:", error);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      try {
        const session = await getSession();
        const currentRole = session?.user?.role as UserRole | undefined;

        if (!currentRole || !isMounted) {
          return;
        }

        setRole(currentRole);

        const itemsResponse = await fetch("/api/items");
        if (!itemsResponse.ok) {
          throw new Error("Failed to load loan items");
        }

        const items = (await itemsResponse.json()) as Array<{
          id: number;
          name: string;
          code?: string;
          availableQuantity: number;
        }>;

        if (!isMounted) return;

        setAvailableItems(items.filter((item) => Boolean(item.name)));
        setItemOptions(items.map((item) => item.name).filter(Boolean));

        if (currentRole === "TEKNISI") {
          const borrowersResponse = await fetch("/api/users");
          if (borrowersResponse.ok && isMounted) {
            const borrowers = (await borrowersResponse.json()) as Array<{
              name: string;
            }>;
            setBorrowerOptions(
              borrowers.map((b) => b.name).filter(Boolean),
            );
          }
        }

        const loansResponse = await fetch("/api/loans");
        if (loansResponse.ok && isMounted) {
          const loansData = (await loansResponse.json()) as LoanRecord[];
          setLoans(loansData);
        }
      } catch (error) {
        console.error("Failed to load loan options:", error);
      }
    }

    void loadInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

  const loanSummary = useMemo(
    () => ({
      pending: loans.filter((loan) => loan.status === "PENDING").length,
      approved: loans.filter((loan) => loan.status === "APPROVED").length,
      borrowed: loans.filter((loan) => loan.status === "BORROWED").length,
      returned: loans.filter((loan) => loan.status === "RETURNED").length,
    }),
    [loans],
  );

  const filteredLoans = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) {
      return loans;
    }
    return loans.filter((loan) => {
      const haystack = [
        loan.borrower,
        loan.item,
        loan.status,
        loan.notes,
        loan.rejectionReason ?? "",
        loan.returnNotes ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }, [loans, search]);

  const sortedLoans = useMemo(() => {
    const data = [...filteredLoans];
    data.sort((a, b) => {
      const valueA = String(a[sortConfig.key]).toLowerCase();
      const valueB = String(b[sortConfig.key]).toLowerCase();
      const direction = sortConfig.direction === "asc" ? 1 : -1;
      return valueA.localeCompare(valueB) * direction;
    });
    return data;
  }, [filteredLoans, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sortedLoans.length / pageSize));
  const paginatedLoans = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedLoans.slice(start, start + pageSize);
  }, [currentPage, sortedLoans]);

  function handleSort(key: LoanSortKey) {
    setSortConfig((current) => {
      if (current.key === key) {
        return {
          key,
          direction: current.direction === "asc" ? "desc" : "asc",
        };
      }
      return { key, direction: "asc" };
    });
  }

  function openAddDialog() {
    setEditingLoan(null);
    setIsDialogOpen(true);
  }

  function openEditDialog(loan: LoanRecord) {
    if (loan.status !== "PENDING") {
      toast.add({
        title: "Perhatian",
        description: "Permohonan yang telah disetujui atau diproses tidak dapat diubah.",
        type: "error",
      });
      return;
    }
    setEditingLoan(loan);
    setIsDialogOpen(true);
  }

  async function handleWorkflowAction(
    loan: LoanRecord,
    action: LoanWorkflowAction,
  ) {
    try {
      const actionMap = {
        approve: "APPROVE",
        reject: "REJECT",
        borrow: "BORROW",
        return: "RETURN",
      } as const;

      const response = await fetch(`/api/loans/${loan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionMap[action] }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || "Failed to update loan state");
      }

      await loadLoans();
      toast.add({
        title: "Status updated",
        description: `Loan status changed by action: ${action}.`,
        type: "success",
        timeout: 4000,
      });
    } catch (error) {
      console.error("handleWorkflowAction error:", error);
      const messageText =
        error instanceof Error ? error.message : "Failed to update loan state";
      toast.add({
        title: "Action failed",
        description: messageText,
        type: "error",
        timeout: 5000,
      });
    }
  }

  async function confirmDeleteLoan() {
    if (!deleteTarget) return;

    try {
      const response = await fetch(`/api/loans/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const message = errorData?.message || "Gagal menghapus data pinjaman";
        toast.add({
          title: "Delete failed",
          description: message,
          type: "error",
          timeout: 5000,
        });
        return;
      }

      await loadLoans();
      toast.add({
        title: isTechnician ? "Loan deleted" : "Permohonan Dibatalkan",
        description: isTechnician
          ? `Loan for "${deleteTarget.borrower}" has been removed.`
          : `Permohonan pinjaman "${deleteTarget.item}" berhasil dibatalkan.`,
        type: "success",
        timeout: 4000,
      });
    } catch (error) {
      console.error("handleDelete error:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Gagal memproses penghapusan";
      toast.add({
        title: "Delete failed",
        description: message,
        type: "error",
        timeout: 5000,
      });
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <div className="space-y-6">
      <LoanSummaryCards summary={loanSummary} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Loans</h1>
          <p className="text-muted-foreground">
            Manage loan requests and borrowing workflows.
          </p>
        </div>

        <Button onClick={openAddDialog}>
          <Plus className="size-4" />
          Add Loan
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setCurrentPage(1);
          }}
          placeholder="Search loans..."
          className="pl-9"
        />
      </div>

      <LoanTable
        loans={paginatedLoans}
        totalCount={sortedLoans.length}
        sortConfig={sortConfig}
        onSort={handleSort}
        isTechnician={isTechnician}
        onViewDetail={(loan) => setViewingLoan(loan)}
        onReturn={(loan) => setReturningLoan(loan)}
        onEdit={openEditDialog}
        onDelete={(loan) => setDeleteTarget(loan)}
        onWorkflowAction={handleWorkflowAction}
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
      />

      <LoanDialog
        open={isDialogOpen}
        loan={editingLoan}
        isTechnician={isTechnician}
        userRole={role}
        borrowerOptions={borrowerOptions}
        availableItems={availableItems}
        itemOptions={itemOptions}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={loadLoans}
      />

      <LoanDetailDialog
        loan={viewingLoan}
        open={Boolean(viewingLoan)}
        onClose={() => setViewingLoan(null)}
        onReturn={(loan) => setReturningLoan(loan)}
        canReturn={viewingLoan?.status === "BORROWED"}
      />

      <LoanReturnDialog
        loan={returningLoan}
        open={Boolean(returningLoan)}
        onClose={() => setReturningLoan(null)}
        onSuccess={loadLoans}
      />

      <LoanDeleteDialog
        target={deleteTarget}
        isTechnician={isTechnician}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteLoan}
      />
    </div>
  );
}

"use client";

import {
  ArrowUpDown,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  PackageCheck,
  Pencil,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type LoanStatus =
  | "PENDING"
  | "APPROVED"
  | "BORROWED"
  | "RETURNED"
  | "REJECTED";

export type LoanWorkflowAction = "approve" | "reject" | "borrow" | "return";

export type LoanRecord = {
  id: number;
  borrower: string;
  borrowerIdentityNumber?: string;
  borrowerEmail?: string;
  borrowerRole?: string;
  item: string;
  items?: Array<{ name: string; code?: string; quantity: number }>;
  quantity: number;
  dueDate: string;
  status: LoanStatus;
  requestedAt: string;
  approvedAt?: string;
  borrowedAt?: string;
  returnedAt?: string;
  notes: string;
  identityDocumentUrl?: string;
  rejectionReason?: string;
  returnNotes?: string;
  isOverdue?: boolean;
  daysOverdue?: number;
};

export type LoanSortKey = keyof Pick<
  LoanRecord,
  "borrower" | "item" | "quantity" | "dueDate" | "status"
>;

export type LoanSortConfig = {
  key: LoanSortKey;
  direction: "asc" | "desc";
};

const loanStatusStyles: Record<
  LoanStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  PENDING: "secondary",
  APPROVED: "default",
  BORROWED: "outline",
  RETURNED: "default",
  REJECTED: "destructive",
};

type LoanTableProps = {
  loans: LoanRecord[];
  totalCount: number;
  sortConfig: LoanSortConfig;
  onSort: (key: LoanSortKey) => void;
  isTechnician: boolean;
  onViewDetail: (loan: LoanRecord) => void;
  onReturn: (loan: LoanRecord) => void;
  onEdit: (loan: LoanRecord) => void;
  onDelete: (loan: LoanRecord) => void;
  onWorkflowAction: (loan: LoanRecord, action: LoanWorkflowAction) => void;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (page: number) => void;
};

export function LoanTable({
  loans,
  totalCount,
  sortConfig,
  onSort,
  isTechnician,
  onViewDetail,
  onReturn,
  onEdit,
  onDelete,
  onWorkflowAction,
  currentPage,
  totalPages,
  pageSize,
  onPageChange,
}: LoanTableProps) {
  const startItem = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden rounded-xl border-0 bg-card py-0 shadow-none">
        <CardContent className="px-2 py-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="px-3 py-2.5 text-left">
                    <button
                      type="button"
                      onClick={() => onSort("borrower")}
                      className="inline-flex items-center gap-2 font-medium text-foreground"
                    >
                      Borrower
                      <ArrowUpDown
                        className={`size-3.5 ${
                          sortConfig.key === "borrower"
                            ? "text-foreground font-bold"
                            : "text-muted-foreground"
                        }`}
                      />
                    </button>
                  </TableHead>
                  <TableHead className="px-3 py-2.5 text-left">
                    <button
                      type="button"
                      onClick={() => onSort("item")}
                      className="inline-flex items-center gap-2 font-medium text-foreground"
                    >
                      Item
                      <ArrowUpDown
                        className={`size-3.5 ${
                          sortConfig.key === "item"
                            ? "text-foreground font-bold"
                            : "text-muted-foreground"
                        }`}
                      />
                    </button>
                  </TableHead>
                  <TableHead className="px-3 py-2.5 text-left">
                    <button
                      type="button"
                      onClick={() => onSort("quantity")}
                      className="inline-flex items-center gap-2 font-medium text-foreground"
                    >
                      Qty
                      <ArrowUpDown
                        className={`size-3.5 ${
                          sortConfig.key === "quantity"
                            ? "text-foreground font-bold"
                            : "text-muted-foreground"
                        }`}
                      />
                    </button>
                  </TableHead>
                  <TableHead className="px-3 py-2.5 text-left">
                    <button
                      type="button"
                      onClick={() => onSort("dueDate")}
                      className="inline-flex items-center gap-2 font-medium text-foreground"
                    >
                      Due Date
                      <ArrowUpDown
                        className={`size-3.5 ${
                          sortConfig.key === "dueDate"
                            ? "text-foreground font-bold"
                            : "text-muted-foreground"
                        }`}
                      />
                    </button>
                  </TableHead>
                  <TableHead className="px-3 py-2.5 text-left">Requested</TableHead>
                  <TableHead className="px-3 py-2.5 text-left">
                    <button
                      type="button"
                      onClick={() => onSort("status")}
                      className="inline-flex items-center gap-2 font-medium text-foreground"
                    >
                      Status
                      <ArrowUpDown
                        className={`size-3.5 ${
                          sortConfig.key === "status"
                            ? "text-foreground font-bold"
                            : "text-muted-foreground"
                        }`}
                      />
                    </button>
                  </TableHead>
                  <TableHead className="px-3 py-2.5 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center">
                      <p className="font-medium">No loans found</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Try another search keyword.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  loans.map((loan) => (
                    <TableRow key={loan.id} className="border-b last:border-b-0">
                      <TableCell className="px-3 py-2.5 font-medium">
                        {loan.borrower}
                      </TableCell>
                      <TableCell className="px-3 py-2.5">
                        {loan.items && loan.items.length > 1 ? (
                          <div className="flex flex-col gap-0.5 max-w-[240px]">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-foreground truncate">
                                {loan.items[0].name}
                              </span>
                              <Badge
                                variant="secondary"
                                className="h-4 px-1 text-[10px] font-normal shrink-0"
                              >
                                +{loan.items.length - 1} lainnya
                              </Badge>
                            </div>
                            <span className="text-[11px] text-muted-foreground truncate" title={loan.item}>
                              {loan.item}
                            </span>
                          </div>
                        ) : (
                          <span>{loan.item}</span>
                        )}
                      </TableCell>
                      <TableCell className="px-3 py-2.5">{loan.quantity}</TableCell>
                      <TableCell className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={
                              loan.isOverdue ? "font-semibold text-destructive" : ""
                            }
                          >
                            {loan.dueDate || "-"}
                          </span>
                          {loan.isOverdue ? (
                            <Badge
                              variant="destructive"
                              className="h-5 px-1.5 text-[10px]"
                            >
                              Overdue
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="px-3 py-2.5">
                        {loan.requestedAt}
                      </TableCell>
                      <TableCell className="px-3 py-2.5">
                        <Badge variant={loanStatusStyles[loan.status]}>
                          {loan.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-3 py-2.5">
                        <div className="flex flex-wrap justify-end items-center gap-1.5">
                          {/* Detail button for all users */}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1 text-xs"
                            onClick={() => onViewDetail(loan)}
                            title="Lihat detail pinjaman dan bukti upload"
                          >
                            <Eye className="size-3.5" />
                            Detail
                          </Button>

                          {/* Non-technician actions */}
                          {!isTechnician ? (
                            <>
                              {loan.status === "BORROWED" ? (
                                <Button
                                  type="button"
                                  variant="default"
                                  size="sm"
                                  className="h-8 gap-1 text-xs"
                                  onClick={() => onReturn(loan)}
                                >
                                  <RotateCcw className="size-3.5" />
                                  Kembalikan
                                </Button>
                              ) : null}

                              {loan.status === "PENDING" ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="size-8"
                                  onClick={() => onEdit(loan)}
                                  aria-label={`Edit permohonan ${loan.item}`}
                                  title="Edit Permohonan"
                                >
                                  <Pencil className="size-3.5" />
                                </Button>
                              ) : null}

                              {loan.status === "PENDING" ||
                              loan.status === "REJECTED" ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="size-8 text-destructive hover:bg-destructive/10"
                                  onClick={() => onDelete(loan)}
                                  aria-label={
                                    loan.status === "PENDING"
                                      ? `Batalkan permohonan ${loan.item}`
                                      : `Hapus riwayat ${loan.item}`
                                  }
                                  title={
                                    loan.status === "PENDING"
                                      ? "Batalkan Permohonan"
                                      : "Hapus Riwayat"
                                  }
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              ) : null}
                            </>
                          ) : null}

                          {/* Technician actions */}
                          {isTechnician ? (
                            <>
                              {loan.status === "PENDING" ? (
                                <>
                                  <Button
                                    type="button"
                                    variant="default"
                                    size="sm"
                                    className="h-8 text-xs"
                                    onClick={() => onWorkflowAction(loan, "approve")}
                                  >
                                    <Check className="size-3.5" />
                                    Approve
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs"
                                    onClick={() => onWorkflowAction(loan, "reject")}
                                  >
                                    <X className="size-3.5" />
                                    Reject
                                  </Button>
                                </>
                              ) : null}

                              {loan.status === "APPROVED" ? (
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  className="h-8 text-xs"
                                  onClick={() => onWorkflowAction(loan, "borrow")}
                                >
                                  <PackageCheck className="size-3.5" />
                                  Borrow
                                </Button>
                              ) : null}

                              {loan.status === "BORROWED" ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-xs"
                                  onClick={() => onReturn(loan)}
                                >
                                  <Clock3 className="size-3.5" />
                                  Return
                                </Button>
                              ) : null}

                              {loan.status === "PENDING" ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="size-8"
                                  onClick={() => onEdit(loan)}
                                  aria-label={`Edit loan for ${loan.borrower}`}
                                  title="Edit Loan"
                                >
                                  <Pencil className="size-3.5" />
                                </Button>
                              ) : null}

                              {loan.status === "PENDING" ||
                              loan.status === "REJECTED" ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="size-8 text-destructive hover:bg-destructive/10"
                                  onClick={() => onDelete(loan)}
                                  aria-label={`Delete loan for ${loan.borrower}`}
                                  title="Delete Loan"
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              ) : null}
                            </>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {startItem}-{endItem} of {totalCount}
        </p>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="size-4" />
            Prev
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} / {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
          >
            Next
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

"use client";

import {
  AlertTriangle,
  Calendar,
  Clock,
  Download,
  ExternalLink,
  FileCheck,
  FileText,
  Package,
  User,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type LoanDetailRecord = {
  id: number;
  borrower: string;
  borrowerIdentityNumber?: string;
  borrowerEmail?: string;
  borrowerRole?: string;
  item: string;
  items?: Array<{ name: string; code?: string; quantity: number }>;
  quantity: number;
  dueDate: string;
  status: "PENDING" | "APPROVED" | "BORROWED" | "RETURNED" | "REJECTED";
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

type LoanDetailDialogProps = {
  loan: LoanDetailRecord | null;
  open: boolean;
  onClose: () => void;
  onReturn?: (loan: LoanDetailRecord) => void;
  canReturn?: boolean;
};

const statusBadgeVariants: Record<
  LoanDetailRecord["status"],
  "default" | "secondary" | "outline" | "destructive"
> = {
  PENDING: "secondary",
  APPROVED: "default",
  BORROWED: "outline",
  RETURNED: "default",
  REJECTED: "destructive",
};

export function LoanDetailDialog({
  loan,
  open,
  onClose,
  onReturn,
  canReturn = false,
}: LoanDetailDialogProps) {
  if (!loan) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle className="text-xl font-bold">
              Detail Peminjaman #{loan.id}
            </DialogTitle>
            <Badge variant={statusBadgeVariants[loan.status]} className="font-semibold">
              {loan.status}
            </Badge>
            {loan.isOverdue ? (
              <Badge variant="destructive" className="flex items-center gap-1 font-semibold">
                <AlertTriangle className="size-3" />
                Terlambat {loan.daysOverdue ? `(${loan.daysOverdue} hari)` : ""}
              </Badge>
            ) : null}
          </div>
          <DialogDescription>
            Rincian lengkap data peminjaman inventaris, peminjam, dan lampiran dokumen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Overdue Warning Banner */}
          {loan.isOverdue ? (
            <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 size-5 shrink-0" />
              <div>
                <p className="font-semibold">Peminjaman Melebihi Batas Jatuh Tempo</p>
                <p className="text-xs text-destructive/90">
                  Batas tanggal pengembalian barang adalah{" "}
                  <span className="font-semibold underline">{loan.dueDate}</span>
                  {loan.daysOverdue ? ` (terlewat ${loan.daysOverdue} hari)` : ""}. Harap segera
                  menyelesaikan pengembalian fisik barang.
                </p>
              </div>
            </div>
          ) : null}

          {/* Section: Identitas Peminjam */}
          <div className="rounded-xl border bg-card/60 p-4 space-y-3">
            <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
              <User className="size-4 text-primary" />
              <span>Informasi Peminjam</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
              <div>
                <span className="text-xs text-muted-foreground block">Nama Lengkap</span>
                <span className="font-medium text-foreground">{loan.borrower}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Role / Peran</span>
                <span className="inline-block mt-0.5 text-xs font-semibold px-2 py-0.5 rounded bg-muted">
                  {loan.borrowerRole || "MAHASISWA"}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">NIM / NIP</span>
                <span className="font-medium text-foreground">
                  {loan.borrowerIdentityNumber || "-"}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Email</span>
                <span className="font-medium text-foreground">{loan.borrowerEmail || "-"}</span>
              </div>
            </div>
          </div>

          {/* Section: Barang & Kuantitas */}
          <div className="rounded-xl border bg-card/60 p-4 space-y-3">
            <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
              <Package className="size-4 text-primary" />
              <span>Barang yang Dipinjam</span>
            </div>
            <div className="space-y-2">
              {loan.items && loan.items.length > 0 ? (
                loan.items.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium text-foreground">{item.name}</p>
                      {item.code ? (
                        <p className="text-xs text-muted-foreground">Kode: {item.code}</p>
                      ) : null}
                    </div>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {item.quantity} unit
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                  <span className="font-medium text-foreground">{loan.item}</span>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {loan.quantity} unit
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Section: Waktu & Jadwal Peminjaman */}
          <div className="rounded-xl border bg-card/60 p-4 space-y-3">
            <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
              <Calendar className="size-4 text-primary" />
              <span>Waktu & Jadwal Peminjaman</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
              <div>
                <span className="text-xs text-muted-foreground block">Tanggal Permohonan</span>
                <span className="font-medium text-foreground">{loan.requestedAt || "-"}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Batas Jatuh Tempo (Due Date)</span>
                <span
                  className={`font-medium ${
                    loan.isOverdue ? "text-destructive font-bold" : "text-foreground"
                  }`}
                >
                  {loan.dueDate || "-"}
                </span>
              </div>
              {loan.borrowedAt ? (
                <div>
                  <span className="text-xs text-muted-foreground block">Tanggal Diserahkan / Dipinjam</span>
                  <span className="font-medium text-foreground">{loan.borrowedAt}</span>
                </div>
              ) : null}
              {loan.returnedAt ? (
                <div>
                  <span className="text-xs text-muted-foreground block">Tanggal Pengembalian</span>
                  <span className="font-medium text-foreground">{loan.returnedAt}</span>
                </div>
              ) : null}
            </div>
          </div>

          {/* Section: Catatan & Keterangan */}
          {(loan.notes || loan.rejectionReason || loan.returnNotes) && (
            <div className="rounded-xl border bg-card/60 p-4 space-y-3">
              <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
                <FileText className="size-4 text-primary" />
                <span>Catatan & Keterangan</span>
              </div>
              <div className="space-y-2 text-sm">
                {loan.notes ? (
                  <div className="rounded-lg bg-muted/40 p-3">
                    <span className="text-xs font-semibold text-muted-foreground block mb-1">
                      Catatan Peminjam:
                    </span>
                    <p className="text-foreground whitespace-pre-wrap">{loan.notes}</p>
                  </div>
                ) : null}
                {loan.rejectionReason ? (
                  <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                    <span className="text-xs font-semibold text-destructive block mb-1">
                      Alasan Penolakan:
                    </span>
                    <p className="text-destructive whitespace-pre-wrap">{loan.rejectionReason}</p>
                  </div>
                ) : null}
                {loan.returnNotes ? (
                  <div className="rounded-lg bg-muted/40 p-3">
                    <span className="text-xs font-semibold text-muted-foreground block mb-1">
                      Catatan Pengembalian:
                    </span>
                    <p className="text-foreground whitespace-pre-wrap">{loan.returnNotes}</p>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {/* Section: Bukti Dokumen / KTM Mahasiswa */}
          <div className="rounded-xl border bg-card/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
                <FileCheck className="size-4 text-primary" />
                <span>Bukti Dokumen / KTM Mahasiswa</span>
              </div>
              {loan.identityDocumentUrl ? (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1.5 text-xs"
                    onClick={() => window.open(loan.identityDocumentUrl, "_blank")}
                  >
                    <ExternalLink className="size-3" />
                    Buka Ukuran Penuh
                  </Button>
                  <a
                    href={loan.identityDocumentUrl}
                    download={`KTM-${loan.borrower.replace(/\s+/g, "_")}`}
                    className="inline-flex h-7 items-center gap-1.5 rounded-md border border-input bg-background px-2.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
                  >
                    <Download className="size-3" />
                    Unduh
                  </a>
                </div>
              ) : null}
            </div>

            {loan.identityDocumentUrl ? (
              <div className="space-y-2">
                <div className="relative overflow-hidden rounded-xl border bg-muted/30 p-2 text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={loan.identityDocumentUrl}
                    alt={`Bukti KTM ${loan.borrower}`}
                    className="mx-auto max-h-72 w-auto rounded-lg object-contain shadow-xs transition hover:scale-[1.01]"
                  />
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  Foto Kartu Tanda Mahasiswa (KTM) yang dilampirkan peminjam saat permohonan.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                <p className="font-medium">Tidak ada lampiran dokumen.</p>
                <p className="text-xs mt-1">
                  Permohonan ini tidak menyertakan file KTM (misal: pengajuan dosen atau data manual).
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <Button type="button" variant="outline" onClick={onClose}>
            Tutup
          </Button>

          {canReturn && loan.status === "BORROWED" && onReturn ? (
            <Button
              type="button"
              variant="default"
              className="gap-2"
              onClick={() => {
                onClose();
                onReturn(loan);
              }}
            >
              <Clock className="size-4" />
              Kembalikan Barang Ini
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

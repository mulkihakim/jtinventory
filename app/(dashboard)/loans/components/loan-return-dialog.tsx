"use client";

import { useState } from "react";

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
import { toast } from "@/components/ui/toast";
import type { LoanRecord } from "./loan-table";

type LoanReturnDialogProps = {
  loan: LoanRecord | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function LoanReturnDialog({
  loan,
  open,
  onClose,
  onSuccess,
}: LoanReturnDialogProps) {
  if (!open || !loan) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <LoanReturnDialogForm
        key={loan.id}
        loan={loan}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </Dialog>
  );
}

function LoanReturnDialogForm({
  loan,
  onClose,
  onSuccess,
}: {
  loan: LoanRecord;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [returnNote, setReturnNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleConfirmReturn() {
    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/loans/${loan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "RETURN", note: returnNote.trim() }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.message || "Gagal memproses pengembalian");
      }

      toast.add({
        title: "Pengembalian Berhasil",
        description: result?.message || "Barang telah berhasil dikembalikan.",
        type: "success",
        timeout: 4000,
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error("handleConfirmReturn error:", error);
      const messageText =
        error instanceof Error
          ? error.message
          : "Gagal memproses pengembalian";
      toast.add({
        title: "Pengembalian Gagal",
        description: messageText,
        type: "error",
        timeout: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Konfirmasi Pengembalian Barang</DialogTitle>
        <DialogDescription>
          Pastikan barang fisik telah diserahkan. Anda dapat menambahkan catatan
          kondisi pengembalian di bawah ini.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-2">
        <div className="rounded-xl border bg-muted/50 p-3 text-sm space-y-2">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
              Barang yang Dikembalikan
            </span>
            <Badge variant="secondary">{loan.quantity} unit total</Badge>
          </div>

          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {loan.items && loan.items.length > 0 ? (
              loan.items.map((it, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center rounded-md border bg-background/80 px-2.5 py-1.5 text-xs"
                >
                  <span className="font-medium text-foreground">{it.name}</span>
                  <span className="font-mono text-muted-foreground">{it.quantity} unit</span>
                </div>
              ))
            ) : (
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-foreground">{loan.item}</span>
                <span className="font-mono text-muted-foreground">{loan.quantity} unit</span>
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground pt-1 border-t border-border/50">
            Peminjam:{" "}
            <span className="font-medium text-foreground">{loan.borrower}</span>{" "}
            | Batas Kembali: {loan.dueDate || "-"}
          </p>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="returnNotesInput"
            className="text-sm font-medium text-foreground"
          >
            Catatan Pengembalian (Opsional)
          </label>
          <textarea
            id="returnNotesInput"
            rows={3}
            value={returnNote}
            onChange={(e) => setReturnNote(e.target.value)}
            placeholder="Contoh: Barang telah diserahkan di lab lantai 2, kondisi lengkap dan berfungsi normal."
            className="flex min-h-20 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
          />
        </div>
      </div>

      <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isSubmitting}
        >
          Batal
        </Button>
        <Button
          type="button"
          onClick={handleConfirmReturn}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Memproses..." : "Konfirmasi Pengembalian"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { LoanRecord } from "./loan-table";

type LoanDeleteDialogProps = {
  target: LoanRecord | null;
  isTechnician: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function LoanDeleteDialog({
  target,
  isTechnician,
  onClose,
  onConfirm,
}: LoanDeleteDialogProps) {
  return (
    <AlertDialog
      open={Boolean(target)}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isTechnician ? "Hapus data pinjaman?" : "Batalkan permohonan pinjaman?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isTechnician
              ? `Tindakan ini tidak dapat dibatalkan. Catatan peminjaman untuk “${
                  target?.borrower ?? "this borrower"
                }” akan dihapus permanen.`
              : `Apakah Anda yakin ingin membatalkan permohonan pinjaman untuk “${
                  target?.item ?? "barang ini"
                }”? Tindakan ini tidak dapat dibatalkan.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Batal</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            {isTechnician ? "Hapus" : "Batalkan"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

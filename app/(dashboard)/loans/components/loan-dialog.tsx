"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import type { LoanRecord } from "./loan-table";

type AvailableInventoryItem = {
  id: number;
  name: string;
  code?: string;
  availableQuantity: number;
};

type LoanDialogProps = {
  open: boolean;
  loan: LoanRecord | null;
  isTechnician: boolean;
  userRole: string | null;
  borrowerOptions: string[];
  availableItems: AvailableInventoryItem[];
  itemOptions: string[];
  onClose: () => void;
  onSuccess: () => void;
};

type LoanItemRow = {
  rowId: string;
  itemId: number;
  quantity: number;
};

export function LoanDialog({
  open,
  loan,
  isTechnician,
  userRole,
  borrowerOptions,
  availableItems,
  itemOptions,
  onClose,
  onSuccess,
}: LoanDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <LoanDialogForm
        key={loan ? `edit-${loan.id}` : "create"}
        loan={loan}
        isTechnician={isTechnician}
        userRole={userRole}
        borrowerOptions={borrowerOptions}
        availableItems={availableItems}
        itemOptions={itemOptions}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </Dialog>
  );
}

function LoanDialogForm({
  loan,
  isTechnician,
  userRole,
  borrowerOptions,
  availableItems,
  onClose,
  onSuccess,
}: {
  loan: LoanRecord | null;
  isTechnician: boolean;
  userRole: string | null;
  borrowerOptions: string[];
  availableItems: AvailableInventoryItem[];
  itemOptions: string[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEditing = Boolean(loan);

  const initialItems: LoanItemRow[] = useMemo(() => {
    if (loan?.items && loan.items.length > 0) {
      return loan.items.map((it, idx) => {
        const match = availableItems.find(
          (a) =>
            a.name.toLowerCase() === it.name.toLowerCase() ||
            (it.code && a.code?.toLowerCase() === it.code.toLowerCase())
        );
        return {
          rowId: `edit-${idx}-${it.name}`,
          itemId: match?.id ?? availableItems[0]?.id ?? 0,
          quantity: Math.max(1, it.quantity),
        };
      });
    }

    if (loan?.item) {
      const match = availableItems.find(
        (a) => a.name.toLowerCase() === loan.item.toLowerCase()
      );
      return [
        {
          rowId: "edit-legacy-0",
          itemId: match?.id ?? availableItems[0]?.id ?? 0,
          quantity: Math.max(1, loan.quantity || 1),
        },
      ];
    }

    if (availableItems.length > 0) {
      return [
        {
          rowId: "new-initial-0",
          itemId: availableItems[0].id,
          quantity: 1,
        },
      ];
    }

    return [];
  }, [loan, availableItems]);

  const [selectedItems, setSelectedItems] = useState<LoanItemRow[]>(initialItems);
  const [borrower, setBorrower] = useState(
    loan?.borrower ?? borrowerOptions[0] ?? "",
  );
  const [dueDate, setDueDate] = useState(loan?.dueDate ?? "");

  const [notes, setNotes] = useState(loan?.notes ?? "");
  const [identityDocument, setIdentityDocument] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Duplicate items detection
  const duplicateItemIds = useMemo(() => {
    const counts = new Map<number, number>();
    for (const item of selectedItems) {
      counts.set(item.itemId, (counts.get(item.itemId) || 0) + 1);
    }
    const duplicates = new Set<number>();
    for (const [id, count] of counts.entries()) {
      if (count > 1) duplicates.add(id);
    }
    return duplicates;
  }, [selectedItems]);

  const totalQuantity = useMemo(() => {
    return selectedItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  }, [selectedItems]);

  function handleAddItem() {
    const currentIds = new Set(selectedItems.map((r) => r.itemId));
    const nextItem = availableItems.find((inv) => !currentIds.has(inv.id)) ?? availableItems[0];

    if (!nextItem) {
      toast.add({
        title: "Pemberitahuan",
        description: "Tidak ada barang inventaris lain yang tersedia untuk ditambahkan.",
        type: "info",
        timeout: 3000,
      });
      return;
    }

    setSelectedItems((prev) => [
      ...prev,
      {
        rowId: `item-${Date.now()}-${prev.length}`,
        itemId: nextItem.id,
        quantity: 1,
      },
    ]);
  }

  function handleRemoveItem(rowId: string) {
    if (selectedItems.length <= 1) {
      toast.add({
        title: "Perhatian",
        description: "Permohonan pinjaman harus memiliki minimal 1 barang.",
        type: "error",
        timeout: 3000,
      });
      return;
    }
    setSelectedItems((prev) => prev.filter((r) => r.rowId !== rowId));
  }

  function handleItemChange(rowId: string, newItemId: number) {
    const inv = availableItems.find((a) => a.id === newItemId);
    const maxStock = inv?.availableQuantity ?? 1;

    setSelectedItems((prev) =>
      prev.map((r) => {
        if (r.rowId !== rowId) return r;
        return {
          ...r,
          itemId: newItemId,
          quantity: Math.min(Math.max(1, r.quantity), Math.max(1, maxStock)),
        };
      })
    );
  }

  function handleQuantityChange(rowId: string, qty: number) {
    setSelectedItems((prev) =>
      prev.map((r) => {
        if (r.rowId !== rowId) return r;
        return {
          ...r,
          quantity: Math.max(1, qty),
        };
      })
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedBorrower = borrower.trim();

    if (isTechnician && !trimmedBorrower) {
      setError("Peminjam wajib dipilih.");
      return;
    }

    if (selectedItems.length === 0) {
      setError("Pilih minimal 1 barang yang ingin dipinjam.");
      return;
    }

    if (duplicateItemIds.size > 0) {
      setError("Terdapat barang yang dipilih lebih dari satu kali. Silakan gabungkan jumlahnya.");
      return;
    }

    if (!dueDate) {
      setError("Batas tanggal pengembalian (due date) wajib diisi.");
      return;
    }

    // Validate quantities against stock
    for (const row of selectedItems) {
      const inv = availableItems.find((a) => a.id === row.itemId);
      if (!inv) {
        setError("Barang yang dipilih tidak valid.");
        return;
      }
      if (row.quantity < 1) {
        setError(`Jumlah pinjam untuk "${inv.name}" harus minimal 1.`);
        return;
      }
      if (row.quantity > inv.availableQuantity) {
        setError(
          `Jumlah pinjam untuk "${inv.name}" (${row.quantity}) melebihi stok yang tersedia (${inv.availableQuantity}).`
        );
        return;
      }
    }

    if (!isEditing && userRole === "MAHASISWA" && !identityDocument) {
      setError("Foto KTM (bukti identitas) wajib diunggah untuk mahasiswa.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    const itemsPayload = selectedItems.map((r) => {
      const inv = availableItems.find((a) => a.id === r.itemId);
      return {
        itemId: r.itemId,
        name: inv?.name ?? "",
        quantity: r.quantity,
      };
    });

    try {
      let response: Response;

      if (identityDocument && !isEditing) {
        const formData = new FormData();
        if (isTechnician) formData.append("borrower", trimmedBorrower);
        formData.append("items", JSON.stringify(itemsPayload));
        formData.append("dueDate", dueDate);
        formData.append("notes", notes.trim());
        formData.append("identityDocument", identityDocument);

        // Fallback backward-compatible fields
        formData.append("item", itemsPayload.map((it) => it.name).join(", "));
        formData.append("quantity", String(totalQuantity));

        response = await fetch("/api/loans", {
          method: "POST",
          body: formData,
        });
      } else {
        const payload = {
          ...(isTechnician ? { borrower: trimmedBorrower } : {}),
          items: itemsPayload,
          item: itemsPayload.map((it) => it.name).join(", "),
          quantity: totalQuantity,
          dueDate,
          notes: notes.trim(),
        };

        response = isEditing && loan
          ? await fetch(`/api/loans/${loan.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            })
          : await fetch("/api/loans", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || "Failed to save loan");
      }

      toast.add({
        title: isEditing ? "Loan updated" : "Loan added",
        description: isEditing
          ? "Data pinjaman berhasil diperbarui."
          : "Permohonan pinjaman berhasil diajukan.",
        type: "success",
        timeout: 4000,
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error("handleSubmit loan error:", err);
      const message =
        err instanceof Error ? err.message : "Failed to save loan";
      setError(message);
      toast.add({
        title: isEditing ? "Failed to update loan" : "Failed to add loan",
        description: message,
        type: "error",
        timeout: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const dialogTitle = isEditing
    ? isTechnician
      ? "Edit Loan"
      : "Edit Permohonan Pinjaman"
    : "Add Loan";

  const dialogDescription = isEditing
    ? isTechnician
      ? "Update loan details."
      : "Perbarui rincian barang, jumlah, atau jadwal pinjaman Anda."
    : "Ajukan permohonan peminjaman satu atau beberapa barang inventaris sekaligus.";

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
      <DialogHeader>
        <DialogTitle>{dialogTitle}</DialogTitle>
        <DialogDescription>{dialogDescription}</DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        <FieldGroup>
          {isTechnician ? (
            <Field>
              <FieldLabel htmlFor="loan-borrower">Borrower</FieldLabel>
              <select
                id="loan-borrower"
                value={borrower}
                onChange={(e) => setBorrower(e.target.value)}
                disabled={isSubmitting}
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {borrowerOptions.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}

          {/* Dynamic Multi-Items List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <FieldLabel className="text-sm font-semibold">
                Daftar Barang yang Dipinjam
              </FieldLabel>
              <span className="text-xs text-muted-foreground">
                {selectedItems.length} jenis barang dipilih
              </span>
            </div>

            {availableItems.length === 0 ? (
              <div className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
                Tidak ada barang inventaris yang tersedia saat ini.
              </div>
            ) : (
              <div className="space-y-2.5">
                {selectedItems.map((row, index) => {
                  const invItem = availableItems.find((a) => a.id === row.itemId);
                  const isDuplicate = duplicateItemIds.has(row.itemId);
                  const maxStock = invItem?.availableQuantity ?? 1;
                  const isExceeded = row.quantity > maxStock;

                  return (
                    <div
                      key={row.rowId}
                      className={`relative rounded-xl border p-3 transition-colors ${
                        isDuplicate || isExceeded
                          ? "border-destructive/50 bg-destructive/5"
                          : "border-border bg-muted/20"
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">
                          Barang #{index + 1}
                        </span>
                        {selectedItems.length > 1 ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-6 text-destructive hover:bg-destructive/10"
                            onClick={() => handleRemoveItem(row.rowId)}
                            disabled={isSubmitting}
                            title="Hapus baris barang ini"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        ) : null}
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="space-y-1 sm:col-span-2">
                          <label
                            htmlFor={`select-item-${row.rowId}`}
                            className="text-xs font-medium text-muted-foreground"
                          >
                            Pilih Barang
                          </label>
                          <select
                            id={`select-item-${row.rowId}`}
                            value={row.itemId}
                            onChange={(e) =>
                              handleItemChange(row.rowId, Number(e.target.value))
                            }
                            disabled={isSubmitting}
                            className={`flex h-9 w-full rounded-lg border ${
                              isDuplicate
                                ? "border-destructive focus-visible:ring-destructive"
                                : "border-input"
                            } bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:cursor-not-allowed disabled:opacity-50`}
                          >
                            {availableItems.map((inv) => (
                              <option key={inv.id} value={inv.id}>
                                {inv.name}
                                {inv.code ? ` (${inv.code})` : ""} - Tersedia:{" "}
                                {inv.availableQuantity} unit
                              </option>
                            ))}
                          </select>
                          {isDuplicate ? (
                            <p className="text-[11px] font-medium text-destructive">
                              Barang ini sudah dipilih di baris lain.
                            </p>
                          ) : (
                            <p className="text-[11px] text-muted-foreground">
                              Stok tersedia: {maxStock} unit
                            </p>
                          )}
                        </div>

                        <div className="space-y-1">
                          <label
                            htmlFor={`input-qty-${row.rowId}`}
                            className="text-xs font-medium text-muted-foreground"
                          >
                            Jumlah (Unit)
                          </label>
                          <Input
                            id={`input-qty-${row.rowId}`}
                            type="number"
                            min={1}
                            max={maxStock}
                            value={row.quantity}
                            onChange={(e) =>
                              handleQuantityChange(
                                row.rowId,
                                Number(e.target.value) || 1
                              )
                            }
                            disabled={isSubmitting}
                            className={`h-9 text-xs ${
                              isExceeded
                                ? "border-destructive text-destructive focus-visible:ring-destructive"
                                : ""
                            }`}
                          />
                          {isExceeded ? (
                            <p className="text-[11px] font-medium text-destructive">
                              Melebihi stok ({maxStock})
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddItem}
                    disabled={
                      isSubmitting ||
                      availableItems.length === 0 ||
                      selectedItems.length >= availableItems.length
                    }
                    className="h-8 gap-1.5 border-dashed text-xs"
                  >
                    <Plus className="size-3.5" />
                    {selectedItems.length >= availableItems.length
                      ? "Semua Barang Sudah Dipilih"
                      : "Tambah Barang Lain"}
                  </Button>

                  <div className="rounded-lg bg-muted px-3 py-1 text-xs font-medium text-foreground">
                    Total: <span className="font-bold">{totalQuantity}</span> unit (
                    {selectedItems.length} jenis barang)
                  </div>
                </div>
              </div>
            )}
          </div>

          <Field>
            <FieldLabel htmlFor="loan-duedate">Due Date (Batas Kembali)</FieldLabel>
            <Input
              id="loan-duedate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={isSubmitting}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="loan-notes">Notes</FieldLabel>
            <textarea
              id="loan-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Keperluan peminjaman, rincian praktikum, dsb..."
              rows={3}
              disabled={isSubmitting}
              className="flex min-h-20 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/60 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </Field>

          {!isEditing && userRole === "MAHASISWA" ? (
            <Field>
              <FieldLabel htmlFor="loan-ktm">Foto KTM (Bukti Identitas)</FieldLabel>
              <Input
                id="loan-ktm"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) =>
                  setIdentityDocument(e.target.files?.[0] ?? null)
                }
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Wajib melampirkan foto KTM (JPG, PNG, atau WebP, maks. 5 MB)
              </p>
            </Field>
          ) : null}

          {error ? (
            <p className="text-sm font-medium text-destructive">{error}</p>
          ) : null}
        </FieldGroup>

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
            type="submit"
            disabled={
              isSubmitting ||
              availableItems.length === 0 ||
              duplicateItemIds.size > 0
            }
          >
            {isSubmitting
              ? "Menyimpan..."
              : isEditing
              ? "Simpan Perubahan"
              : "Ajukan Peminjaman"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

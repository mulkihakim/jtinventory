"use client";

import { useState } from "react";

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
import type { InventoryItem, ItemCondition } from "./item-table";

type ItemDialogProps = {
  open: boolean;
  item: InventoryItem | null;
  categoryOptions: string[];
  maintainerOptions: string[];
  onClose: () => void;
  onSuccess: () => void;
};

export function ItemDialog({
  open,
  item,
  categoryOptions,
  maintainerOptions,
  onClose,
  onSuccess,
}: ItemDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <ItemDialogForm
        key={item ? `edit-${item.id}` : "create"}
        item={item}
        categoryOptions={categoryOptions}
        maintainerOptions={maintainerOptions}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </Dialog>
  );
}

function ItemDialogForm({
  item,
  categoryOptions,
  maintainerOptions,
  onClose,
  onSuccess,
}: {
  item: InventoryItem | null;
  categoryOptions: string[];
  maintainerOptions: string[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [code, setCode] = useState(item?.code ?? "");
  const [name, setName] = useState(item?.name ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [category, setCategory] = useState(item?.category ?? categoryOptions[0] ?? "");
  const [maintainer, setMaintainer] = useState(item?.maintainer ?? maintainerOptions[0] ?? "");
  const [quantity, setQuantity] = useState(item?.quantity ?? 1);
  const [availableQuantity, setAvailableQuantity] = useState(item?.availableQuantity ?? 1);
  const [condition, setCondition] = useState<ItemCondition>(item?.condition ?? "GOOD");
  const [isActive, setIsActive] = useState(item?.isActive ?? true);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = Boolean(item);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedCode = code.trim();
    const trimmedName = name.trim();
    const trimmedCategory = category.trim();
    const trimmedMaintainer = maintainer.trim();

    if (!trimmedCode || !trimmedName) {
      setError("Kode dan nama item wajib diisi.");
      return;
    }

    if (!trimmedCategory) {
      setError("Pilih kategori terlebih dahulu.");
      return;
    }

    if (!trimmedMaintainer) {
      setError("Pilih maintainer terlebih dahulu.");
      return;
    }

    if (trimmedCode.length < 3 || trimmedName.length < 2) {
      setError("Kode minimal 3 karakter dan nama minimal 2 karakter.");
      return;
    }

    const qty = Math.max(0, Number(quantity) || 0);
    const availQty = Math.min(Math.max(0, Number(availableQuantity) || 0), qty);

    if (availQty > qty) {
      setError("Jumlah tersedia tidak boleh lebih besar dari jumlah total.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const payload = {
        code: trimmedCode,
        name: trimmedName,
        description: description.trim(),
        category: trimmedCategory,
        maintainer: trimmedMaintainer,
        quantity: qty,
        availableQuantity: availQty,
        condition,
        isActive,
      };

      const response = isEditing && item
        ? await fetch(`/api/items/${item.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/items", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || "Failed to save item");
      }

      toast.add({
        title: isEditing ? "Item updated" : "Item added",
        description: isEditing
          ? `Item "${trimmedName}" has been updated.`
          : `Item "${trimmedName}" has been added.`,
        type: "success",
        timeout: 4000,
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error("handleSubmit error:", err);
      const message = err instanceof Error ? err.message : "Failed to save item";
      setError(message);
      toast.add({
        title: isEditing ? "Failed to update item" : "Failed to add item",
        description: message,
        type: "error",
        timeout: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{isEditing ? "Edit Item" : "Add Item"}</DialogTitle>
        <DialogDescription>
          {isEditing
            ? "Update item information."
            : "Create a new inventory item."}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="item-code">Item Code</FieldLabel>
            <Input
              id="item-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. ITM-004"
              disabled={isSubmitting}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="item-name">Item Name</FieldLabel>
            <Input
              id="item-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Laptop Lenovo"
              disabled={isSubmitting}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="item-desc">Description</FieldLabel>
            <textarea
              id="item-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Item description..."
              rows={3}
              disabled={isSubmitting}
              className="flex min-h-20 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/60 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="item-category">Category</FieldLabel>
              <select
                id="item-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={isSubmitting}
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {categoryOptions.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </Field>

            <Field>
              <FieldLabel htmlFor="item-maintainer">Maintainer</FieldLabel>
              <select
                id="item-maintainer"
                value={maintainer}
                onChange={(e) => setMaintainer(e.target.value)}
                disabled={isSubmitting}
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {maintainerOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="item-qty">Quantity</FieldLabel>
              <Input
                id="item-qty"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                disabled={isSubmitting}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="item-avail-qty">Available Quantity</FieldLabel>
              <Input
                id="item-avail-qty"
                type="number"
                min={0}
                max={quantity}
                value={availableQuantity}
                onChange={(e) => setAvailableQuantity(Math.max(0, Number(e.target.value) || 0))}
                disabled={isSubmitting}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="item-condition">Condition</FieldLabel>
              <select
                id="item-condition"
                value={condition}
                onChange={(e) => setCondition(e.target.value as ItemCondition)}
                disabled={isSubmitting}
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="GOOD">GOOD</option>
                <option value="DAMAGED">DAMAGED</option>
                <option value="MAINTENANCE">MAINTENANCE</option>
              </select>
            </Field>

            <Field className="flex flex-row items-center gap-2 pt-6">
              <input
                id="item-active"
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                disabled={isSubmitting}
                className="size-4 rounded border border-input accent-primary"
              />
              <FieldLabel htmlFor="item-active" className="cursor-pointer mb-0">
                Active in Inventory
              </FieldLabel>
            </Field>
          </div>

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
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? "Saving..."
              : isEditing
              ? "Save Changes"
              : "Add Item"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

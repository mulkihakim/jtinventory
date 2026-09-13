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
import type { Category } from "./category-table";

type CategoryDialogProps = {
  open: boolean;
  category: Category | null;
  onClose: () => void;
  onSuccess: () => void;
};

export function CategoryDialog({
  open,
  category,
  onClose,
  onSuccess,
}: CategoryDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <CategoryDialogForm
        key={category ? `edit-${category.id}` : "create"}
        category={category}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </Dialog>
  );
}

function CategoryDialogForm({
  category,
  onClose,
  onSuccess,
}: {
  category: Category | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = Boolean(category);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();
    const trimmedDescription = description.trim();

    if (!trimmedName) {
      setError("Nama kategori wajib diisi.");
      return;
    }

    if (trimmedName.length < 2) {
      setError("Nama kategori minimal 2 karakter.");
      return;
    }

    if (trimmedDescription.length > 255) {
      setError("Deskripsi maksimal 255 karakter.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const payload = {
        name: trimmedName,
        description: trimmedDescription,
      };

      const response = isEditing && category
        ? await fetch(`/api/categories/${category.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/categories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || "Failed to save category");
      }

      toast.add({
        title: isEditing ? "Category updated" : "Category added",
        description: isEditing
          ? `Category "${trimmedName}" has been updated.`
          : `Category "${trimmedName}" has been added.`,
        type: "success",
        timeout: 4000,
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error("handleSubmit error:", err);
      const message = err instanceof Error ? err.message : "Failed to save category";
      setError(message);
      toast.add({
        title: isEditing ? "Failed to update category" : "Failed to add category",
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
        <DialogTitle>{isEditing ? "Edit Category" : "Add Category"}</DialogTitle>
        <DialogDescription>
          {isEditing
            ? "Update the category information."
            : "Create a new inventory category."}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="category-name">Name</FieldLabel>
            <Input
              id="category-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Elektronik"
              disabled={isSubmitting}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="category-desc">Description</FieldLabel>
            <textarea
              id="category-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Category description..."
              rows={4}
              disabled={isSubmitting}
              className="flex min-h-24 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/60 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </Field>

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
              : "Add Category"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

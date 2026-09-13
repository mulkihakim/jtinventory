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
import type { UserRecord, UserRole } from "./user-table";

type UserDialogProps = {
  open: boolean;
  user: UserRecord | null;
  onClose: () => void;
  onSuccess: () => void;
};

export function UserDialog({
  open,
  user,
  onClose,
  onSuccess,
}: UserDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <UserDialogForm
        key={user ? `edit-${user.id}` : "create"}
        user={user}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </Dialog>
  );
}

function UserDialogForm({
  user,
  onClose,
  onSuccess,
}: {
  user: UserRecord | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [identityNumber, setIdentityNumber] = useState(user?.identityNumber ?? "");
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [role, setRole] = useState<UserRole>(user?.role ?? "MAHASISWA");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = Boolean(user);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedIdentity = identityNumber.trim();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedIdentity || !trimmedName || !trimmedEmail) {
      setError("Identity number, nama, dan email wajib diisi.");
      return;
    }

    if (trimmedName.length < 2) {
      setError("Nama minimal 2 karakter.");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(trimmedEmail)) {
      setError("Format email tidak valid.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const payload = {
        identityNumber: trimmedIdentity,
        name: trimmedName,
        email: trimmedEmail,
        role,
      };

      const response = isEditing && user
        ? await fetch(`/api/users/${user.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || "Failed to save user");
      }

      toast.add({
        title: isEditing ? "User updated" : "User added",
        description: isEditing
          ? `User "${trimmedName}" has been updated.`
          : `User "${trimmedName}" has been added.`,
        type: "success",
        timeout: 4000,
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error("handleSubmit error:", err);
      const message = err instanceof Error ? err.message : "Failed to save user";
      setError(message);
      toast.add({
        title: isEditing ? "Failed to update user" : "Failed to add user",
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
        <DialogTitle>{isEditing ? "Edit User" : "Add User"}</DialogTitle>
        <DialogDescription>
          {isEditing
            ? "Update user information."
            : "Create a new user record."}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="user-identity">Identity Number</FieldLabel>
            <Input
              id="user-identity"
              value={identityNumber}
              onChange={(e) => setIdentityNumber(e.target.value)}
              placeholder="e.g. 202310001"
              disabled={isSubmitting}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="user-name">Name</FieldLabel>
            <Input
              id="user-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ayu Mahasiswa"
              disabled={isSubmitting}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="user-email">Email</FieldLabel>
            <Input
              id="user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. user@example.com"
              disabled={isSubmitting}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="user-role">Role</FieldLabel>
            <select
              id="user-role"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              disabled={isSubmitting}
              className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="MAHASISWA">MAHASISWA</option>
              <option value="DOSEN">DOSEN</option>
              <option value="TEKNISI">TEKNISI</option>
            </select>
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
              : "Add User"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

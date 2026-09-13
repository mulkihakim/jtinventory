"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import {
  UserRecord,
  UserSortConfig,
  UserSortKey,
  UserTable,
} from "./components/user-table";
import { UserDialog } from "./components/user-dialog";
import { UserDeleteDialog } from "./components/user-delete-dialog";

export default function UsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [sortConfig, setSortConfig] = useState<UserSortConfig>({
    key: "name",
    direction: "asc",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null);
  const pageSize = 5;

  async function loadUsers() {
    try {
      const response = await fetch("/api/users");
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }
      const data = (await response.json()) as UserRecord[];
      setUsers(data);
    } catch (error) {
      console.error("loadUsers error:", error);
    }
  }

  useEffect(() => {
    let isMounted = true;

    fetch("/api/users")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch users");
        return res.json() as Promise<UserRecord[]>;
      })
      .then((data) => {
        if (isMounted) {
          setUsers(data);
        }
      })
      .catch((err) => console.error("loadUsers error:", err));

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) {
      return users;
    }
    return users.filter((user) => {
      const haystack = [
        user.identityNumber,
        user.name,
        user.email,
        user.role,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }, [users, search]);

  const sortedUsers = useMemo(() => {
    const data = [...filteredUsers];
    data.sort((a, b) => {
      const valueA = String(a[sortConfig.key]).toLowerCase();
      const valueB = String(b[sortConfig.key]).toLowerCase();
      const direction = sortConfig.direction === "asc" ? 1 : -1;
      return valueA.localeCompare(valueB) * direction;
    });
    return data;
  }, [filteredUsers, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / pageSize));
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedUsers.slice(start, start + pageSize);
  }, [currentPage, sortedUsers]);

  function handleSort(key: UserSortKey) {
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
    setEditingUser(null);
    setIsDialogOpen(true);
  }

  function openEditDialog(user: UserRecord) {
    setEditingUser(user);
    setIsDialogOpen(true);
  }

  async function confirmDeleteUser() {
    if (!deleteTarget) return;

    try {
      const response = await fetch(`/api/users/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const message = errorData?.message || "Failed to delete user";
        toast.add({
          title: "Delete failed",
          description: message,
          type: "error",
          timeout: 5000,
        });
        return;
      }

      await loadUsers();
      toast.add({
        title: "User deleted",
        description: `User "${deleteTarget.name}" has been removed.`,
        type: "success",
        timeout: 4000,
      });
    } catch (error) {
      console.error("handleDelete error:", error);
      const message = error instanceof Error ? error.message : "Failed to delete user";
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="text-muted-foreground">Manage account and role data.</p>
        </div>

        <Button onClick={openAddDialog}>
          <Plus className="size-4" />
          Add User
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
          placeholder="Search users..."
          className="pl-9"
        />
      </div>

      <UserTable
        users={paginatedUsers}
        totalCount={sortedUsers.length}
        sortConfig={sortConfig}
        onSort={handleSort}
        onEdit={openEditDialog}
        onDelete={(user) => setDeleteTarget(user)}
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
      />

      <UserDialog
        open={isDialogOpen}
        user={editingUser}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={loadUsers}
      />

      <UserDeleteDialog
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteUser}
      />
    </div>
  );
}

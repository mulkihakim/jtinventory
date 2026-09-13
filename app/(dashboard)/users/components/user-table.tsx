"use client";

import { ArrowUpDown, ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";

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

export type UserRole = "MAHASISWA" | "DOSEN" | "TEKNISI";

export type UserRecord = {
  id: number;
  identityNumber: string;
  name: string;
  email: string;
  role: UserRole;
};

export type UserSortKey = keyof Pick<
  UserRecord,
  "identityNumber" | "name" | "email" | "role"
>;

export type UserSortConfig = {
  key: UserSortKey;
  direction: "asc" | "desc";
};

const roleStyles: Record<UserRole, "default" | "secondary" | "outline"> = {
  MAHASISWA: "secondary",
  DOSEN: "default",
  TEKNISI: "outline",
};

type UserTableProps = {
  users: UserRecord[];
  totalCount: number;
  sortConfig: UserSortConfig;
  onSort: (key: UserSortKey) => void;
  onEdit: (user: UserRecord) => void;
  onDelete: (user: UserRecord) => void;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (page: number) => void;
};

export function UserTable({
  users,
  totalCount,
  sortConfig,
  onSort,
  onEdit,
  onDelete,
  currentPage,
  totalPages,
  pageSize,
  onPageChange,
}: UserTableProps) {
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
                      onClick={() => onSort("identityNumber")}
                      className="inline-flex items-center gap-2 font-medium text-foreground"
                    >
                      Identity Number
                      <ArrowUpDown
                        className={`size-3.5 ${
                          sortConfig.key === "identityNumber"
                            ? "text-foreground font-bold"
                            : "text-muted-foreground"
                        }`}
                      />
                    </button>
                  </TableHead>
                  <TableHead className="px-3 py-2.5 text-left">
                    <button
                      type="button"
                      onClick={() => onSort("name")}
                      className="inline-flex items-center gap-2 font-medium text-foreground"
                    >
                      Name
                      <ArrowUpDown
                        className={`size-3.5 ${
                          sortConfig.key === "name"
                            ? "text-foreground font-bold"
                            : "text-muted-foreground"
                        }`}
                      />
                    </button>
                  </TableHead>
                  <TableHead className="px-3 py-2.5 text-left">
                    <button
                      type="button"
                      onClick={() => onSort("email")}
                      className="inline-flex items-center gap-2 font-medium text-foreground"
                    >
                      Email
                      <ArrowUpDown
                        className={`size-3.5 ${
                          sortConfig.key === "email"
                            ? "text-foreground font-bold"
                            : "text-muted-foreground"
                        }`}
                      />
                    </button>
                  </TableHead>
                  <TableHead className="px-3 py-2.5 text-left">
                    <button
                      type="button"
                      onClick={() => onSort("role")}
                      className="inline-flex items-center gap-2 font-medium text-foreground"
                    >
                      Role
                      <ArrowUpDown
                        className={`size-3.5 ${
                          sortConfig.key === "role"
                            ? "text-foreground font-bold"
                            : "text-muted-foreground"
                        }`}
                      />
                    </button>
                  </TableHead>
                  <TableHead className="w-32 px-3 py-2.5 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center">
                      <p className="font-medium">No users found</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Try another search keyword.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id} className="border-b last:border-b-0">
                      <TableCell className="px-3 py-2.5 font-medium">
                        {user.identityNumber}
                      </TableCell>
                      <TableCell className="px-3 py-2.5">{user.name}</TableCell>
                      <TableCell className="px-3 py-2.5">{user.email}</TableCell>
                      <TableCell className="px-3 py-2.5">
                        <Badge variant={roleStyles[user.role]}>{user.role}</Badge>
                      </TableCell>
                      <TableCell className="px-3 py-2.5">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEdit(user)}
                            aria-label={`Edit ${user.name}`}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDelete(user)}
                            aria-label={`Delete ${user.name}`}
                          >
                            <Trash2 className="size-4" />
                          </Button>
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

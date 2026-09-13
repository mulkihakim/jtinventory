"use client";

import { ArrowUpDown, ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";

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

export type Category = {
  id: number;
  name: string;
  description: string;
};

export type CategorySortKey = "name" | "description";

export type CategorySortConfig = {
  key: CategorySortKey;
  direction: "asc" | "desc";
};

type CategoryTableProps = {
  categories: Category[];
  totalCount: number;
  sortConfig: CategorySortConfig;
  onSort: (key: CategorySortKey) => void;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (page: number) => void;
};

export function CategoryTable({
  categories,
  totalCount,
  sortConfig,
  onSort,
  onEdit,
  onDelete,
  currentPage,
  totalPages,
  pageSize,
  onPageChange,
}: CategoryTableProps) {
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
                      onClick={() => onSort("name")}
                      className="inline-flex items-center gap-2 font-medium text-foreground"
                    >
                      Name
                      <ArrowUpDown className={`size-3.5 ${sortConfig.key === "name" ? "text-foreground font-bold" : "text-muted-foreground"}`} />
                    </button>
                  </TableHead>
                  <TableHead className="px-3 py-2.5 text-left">
                    <button
                      type="button"
                      onClick={() => onSort("description")}
                      className="inline-flex items-center gap-2 font-medium text-foreground"
                    >
                      Description
                      <ArrowUpDown className={`size-3.5 ${sortConfig.key === "description" ? "text-foreground font-bold" : "text-muted-foreground"}`} />
                    </button>
                  </TableHead>
                  <TableHead className="w-32 px-3 py-2.5 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-32 text-center">
                      <p className="font-medium">No categories found</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Try another search keyword.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  categories.map((category) => (
                    <TableRow key={category.id} className="border-b last:border-b-0">
                      <TableCell className="px-3 py-2.5 font-medium">
                        {category.name}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-muted-foreground">
                        {category.description || "-"}
                      </TableCell>
                      <TableCell className="px-3 py-2.5">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEdit(category)}
                            aria-label={`Edit ${category.name}`}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDelete(category)}
                            aria-label={`Delete ${category.name}`}
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

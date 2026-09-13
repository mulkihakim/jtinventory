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

export type ItemCondition = "GOOD" | "DAMAGED" | "MAINTENANCE";

export type InventoryItem = {
  id: number;
  code: string;
  name: string;
  description: string;
  category: string;
  maintainer: string;
  quantity: number;
  availableQuantity: number;
  condition: ItemCondition;
  isActive: boolean;
};

export type ItemSortKey = keyof Pick<
  InventoryItem,
  | "code"
  | "name"
  | "category"
  | "maintainer"
  | "quantity"
  | "availableQuantity"
  | "condition"
>;

export type ItemSortConfig = {
  key: ItemSortKey;
  direction: "asc" | "desc";
};

const conditionStyles: Record<
  ItemCondition,
  "default" | "secondary" | "destructive"
> = {
  GOOD: "default",
  DAMAGED: "destructive",
  MAINTENANCE: "secondary",
};

type ItemTableProps = {
  items: InventoryItem[];
  totalCount: number;
  sortConfig: ItemSortConfig;
  onSort: (key: ItemSortKey) => void;
  onEdit: (item: InventoryItem) => void;
  onDelete: (item: InventoryItem) => void;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (page: number) => void;
};

export function ItemTable({
  items,
  totalCount,
  sortConfig,
  onSort,
  onEdit,
  onDelete,
  currentPage,
  totalPages,
  pageSize,
  onPageChange,
}: ItemTableProps) {
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
                      onClick={() => onSort("code")}
                      className="inline-flex items-center gap-2 font-medium text-foreground"
                    >
                      Code
                      <ArrowUpDown
                        className={`size-3.5 ${
                          sortConfig.key === "code"
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
                      onClick={() => onSort("category")}
                      className="inline-flex items-center gap-2 font-medium text-foreground"
                    >
                      Category
                      <ArrowUpDown
                        className={`size-3.5 ${
                          sortConfig.key === "category"
                            ? "text-foreground font-bold"
                            : "text-muted-foreground"
                        }`}
                      />
                    </button>
                  </TableHead>
                  <TableHead className="px-3 py-2.5 text-left">
                    <button
                      type="button"
                      onClick={() => onSort("maintainer")}
                      className="inline-flex items-center gap-2 font-medium text-foreground"
                    >
                      Maintainer
                      <ArrowUpDown
                        className={`size-3.5 ${
                          sortConfig.key === "maintainer"
                            ? "text-foreground font-bold"
                            : "text-muted-foreground"
                        }`}
                      />
                    </button>
                  </TableHead>
                  <TableHead className="px-3 py-2.5 text-left">
                    <button
                      type="button"
                      onClick={() => onSort("availableQuantity")}
                      className="inline-flex items-center gap-2 font-medium text-foreground"
                    >
                      Stock
                      <ArrowUpDown
                        className={`size-3.5 ${
                          sortConfig.key === "availableQuantity"
                            ? "text-foreground font-bold"
                            : "text-muted-foreground"
                        }`}
                      />
                    </button>
                  </TableHead>
                  <TableHead className="px-3 py-2.5 text-left">
                    <button
                      type="button"
                      onClick={() => onSort("condition")}
                      className="inline-flex items-center gap-2 font-medium text-foreground"
                    >
                      Condition
                      <ArrowUpDown
                        className={`size-3.5 ${
                          sortConfig.key === "condition"
                            ? "text-foreground font-bold"
                            : "text-muted-foreground"
                        }`}
                      />
                    </button>
                  </TableHead>
                  <TableHead className="px-3 py-2.5 text-left">Status</TableHead>
                  <TableHead className="w-32 px-3 py-2.5 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center">
                      <p className="font-medium">No items found</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Try another search keyword.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item.id} className="border-b last:border-b-0">
                      <TableCell className="px-3 py-2.5 font-medium">
                        {item.code}
                      </TableCell>
                      <TableCell className="px-3 py-2.5">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.description || "-"}
                        </div>
                      </TableCell>
                      <TableCell className="px-3 py-2.5">{item.category}</TableCell>
                      <TableCell className="px-3 py-2.5">{item.maintainer}</TableCell>
                      <TableCell className="px-3 py-2.5">
                        {item.availableQuantity}/{item.quantity}
                      </TableCell>
                      <TableCell className="px-3 py-2.5">
                        <Badge variant={conditionStyles[item.condition]}>
                          {item.condition}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-3 py-2.5">
                        <Badge variant={item.isActive ? "default" : "outline"}>
                          {item.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-3 py-2.5">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEdit(item)}
                            aria-label={`Edit ${item.name}`}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDelete(item)}
                            aria-label={`Delete ${item.name}`}
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

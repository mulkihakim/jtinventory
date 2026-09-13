"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import {
  InventoryItem,
  ItemSortConfig,
  ItemSortKey,
  ItemTable,
} from "./components/item-table";
import { ItemDialog } from "./components/item-dialog";
import { ItemDeleteDialog } from "./components/item-delete-dialog";

type CategoryOption = {
  id: number;
  name: string;
  description: string;
};

export default function ItemsPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [maintainerOptions, setMaintainerOptions] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [sortConfig, setSortConfig] = useState<ItemSortConfig>({
    key: "name",
    direction: "asc",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);
  const pageSize = 5;

  async function loadItems() {
    try {
      const response = await fetch("/api/items");
      if (!response.ok) {
        throw new Error("Failed to fetch items");
      }
      const data = (await response.json()) as InventoryItem[];
      setItems(data);
    } catch (error) {
      console.error("loadItems error:", error);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      try {
        const [categoriesResponse, usersResponse, itemsResponse] =
          await Promise.all([
            fetch("/api/categories"),
            fetch("/api/users"),
            fetch("/api/items"),
          ]);

        if (!categoriesResponse.ok || !usersResponse.ok || !itemsResponse.ok) {
          throw new Error("Failed to load inventory data");
        }

        const categoriesData =
          (await categoriesResponse.json()) as CategoryOption[];
        const usersData = (await usersResponse.json()) as Array<{
          name: string;
        }>;
        const itemsData = (await itemsResponse.json()) as InventoryItem[];

        if (!isMounted) return;

        setCategoryOptions(
          categoriesData.map((c) => c.name.trim()).filter(Boolean),
        );
        setMaintainerOptions(
          usersData.map((u) => u.name.trim()).filter(Boolean),
        );
        setItems(itemsData);
      } catch (error) {
        console.error("Failed to load initial data:", error);
      }
    }

    void loadInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) {
      return items;
    }
    return items.filter((item) => {
      const haystack = [
        item.code,
        item.name,
        item.description,
        item.category,
        item.maintainer,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }, [items, search]);

  const sortedItems = useMemo(() => {
    const data = [...filteredItems];
    data.sort((a, b) => {
      const valueA = String(a[sortConfig.key]).toLowerCase();
      const valueB = String(b[sortConfig.key]).toLowerCase();
      const direction = sortConfig.direction === "asc" ? 1 : -1;
      return valueA.localeCompare(valueB) * direction;
    });
    return data;
  }, [filteredItems, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sortedItems.length / pageSize));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedItems.slice(start, start + pageSize);
  }, [currentPage, sortedItems]);

  function handleSort(key: ItemSortKey) {
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
    setEditingItem(null);
    setIsDialogOpen(true);
  }

  function openEditDialog(item: InventoryItem) {
    setEditingItem(item);
    setIsDialogOpen(true);
  }

  async function confirmDeleteItem() {
    if (!deleteTarget) return;

    try {
      const response = await fetch(`/api/items/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const message = errorData?.message || "Failed to delete item";
        toast.add({
          title: "Delete failed",
          description: message,
          type: "error",
          timeout: 5000,
        });
        return;
      }

      await loadItems();
      toast.add({
        title: "Item deleted",
        description: `Item "${deleteTarget.name}" has been removed.`,
        type: "success",
        timeout: 4000,
      });
    } catch (error) {
      console.error("handleDelete error:", error);
      const message =
        error instanceof Error ? error.message : "Failed to delete item";
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
          <h1 className="text-2xl font-semibold tracking-tight">Items</h1>
          <p className="text-muted-foreground">Manage inventory items.</p>
        </div>

        <Button onClick={openAddDialog}>
          <Plus className="size-4" />
          Add Item
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
          placeholder="Search items..."
          className="pl-9"
        />
      </div>

      <ItemTable
        items={paginatedItems}
        totalCount={sortedItems.length}
        sortConfig={sortConfig}
        onSort={handleSort}
        onEdit={openEditDialog}
        onDelete={(item) => setDeleteTarget(item)}
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
      />

      <ItemDialog
        open={isDialogOpen}
        item={editingItem}
        categoryOptions={categoryOptions}
        maintainerOptions={maintainerOptions}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={loadItems}
      />

      <ItemDeleteDialog
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteItem}
      />
    </div>
  );
}

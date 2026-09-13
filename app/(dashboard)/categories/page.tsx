"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import {
  Category,
  CategorySortConfig,
  CategorySortKey,
  CategoryTable,
} from "./components/category-table";
import { CategoryDialog } from "./components/category-dialog";
import { CategoryDeleteDialog } from "./components/category-delete-dialog";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [sortConfig, setSortConfig] = useState<CategorySortConfig>({
    key: "name",
    direction: "asc",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const pageSize = 5;

  async function loadCategories() {
    try {
      const response = await fetch("/api/categories");
      if (!response.ok) {
        throw new Error("Failed to fetch categories");
      }
      const data = (await response.json()) as Category[];
      setCategories(data);
    } catch (error) {
      console.error("loadCategories error:", error);
    }
  }

  useEffect(() => {
    let isMounted = true;

    fetch("/api/categories")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch categories");
        return res.json() as Promise<Category[]>;
      })
      .then((data) => {
        if (isMounted) {
          setCategories(data);
        }
      })
      .catch((err) => console.error("loadCategories error:", err));

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredCategories = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) {
      return categories;
    }
    return categories.filter(
      (category) =>
        category.name.toLowerCase().includes(keyword) ||
        category.description.toLowerCase().includes(keyword),
    );
  }, [categories, search]);

  const sortedCategories = useMemo(() => {
    const data = [...filteredCategories];
    data.sort((a, b) => {
      const valueA = a[sortConfig.key].toLowerCase();
      const valueB = b[sortConfig.key].toLowerCase();
      const direction = sortConfig.direction === "asc" ? 1 : -1;
      return valueA.localeCompare(valueB) * direction;
    });
    return data;
  }, [filteredCategories, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sortedCategories.length / pageSize));
  const paginatedCategories = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedCategories.slice(start, start + pageSize);
  }, [currentPage, sortedCategories]);

  function handleSort(key: CategorySortKey) {
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
    setEditingCategory(null);
    setIsDialogOpen(true);
  }

  function openEditDialog(category: Category) {
    setEditingCategory(category);
    setIsDialogOpen(true);
  }

  async function confirmDeleteCategory() {
    if (!deleteTarget) return;

    try {
      const response = await fetch(`/api/categories/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const message = errorData?.message || "Failed to delete category";
        toast.add({
          title: "Delete failed",
          description: message,
          type: "error",
          timeout: 5000,
        });
        return;
      }

      await loadCategories();
      toast.add({
        title: "Category deleted",
        description: `Category "${deleteTarget.name}" has been removed.`,
        type: "success",
        timeout: 4000,
      });
    } catch (error) {
      console.error("handleDelete error:", error);
      const message = error instanceof Error ? error.message : "Failed to delete category";
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
          <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
          <p className="text-muted-foreground">Manage inventory categories.</p>
        </div>

        <Button onClick={openAddDialog}>
          <Plus className="size-4" />
          Add Category
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
          placeholder="Search categories..."
          className="pl-9"
        />
      </div>

      <CategoryTable
        categories={paginatedCategories}
        totalCount={sortedCategories.length}
        sortConfig={sortConfig}
        onSort={handleSort}
        onEdit={openEditDialog}
        onDelete={(category) => setDeleteTarget(category)}
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
      />

      <CategoryDialog
        open={isDialogOpen}
        category={editingCategory}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={loadCategories}
      />

      <CategoryDeleteDialog
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteCategory}
      />
    </div>
  );
}
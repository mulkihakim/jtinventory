import { NextResponse } from "next/server";

import { getAuthenticatedUser, requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await getAuthenticatedUser();

    if (!currentUser) {
      return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    }

    const roleCheck = requireRole(currentUser, ["TEKNISI"], "Only technicians can update categories.");

    if (roleCheck) {
      return roleCheck;
    }

    const { id } = await params;
    const categoryId = Number(id);

    if (Number.isNaN(categoryId)) {
      return NextResponse.json(
        { message: "Invalid category id" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const description = String(body.description ?? "").trim();

    if (!name) {
      return NextResponse.json(
        { message: "Category name is required" },
        { status: 400 },
      );
    }

    const category = await prisma.category.update({
      where: { id: categoryId },
      data: {
        name,
        description,
      },
    });

    return NextResponse.json({
      id: category.id,
      name: category.name,
      description: category.description ?? "",
    });
  } catch (error) {
    console.error("PUT /api/categories/[id] error:", error);

    return NextResponse.json(
      { message: "Failed to update category" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await getAuthenticatedUser();

    if (!currentUser) {
      return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    }

    const roleCheck = requireRole(currentUser, ["TEKNISI"], "Only technicians can delete categories.");

    if (roleCheck) {
      return roleCheck;
    }

    const { id } = await params;
    const categoryId = Number(id);

    if (Number.isNaN(categoryId)) {
      return NextResponse.json(
        { message: "Invalid category id" },
        { status: 400 },
      );
    }

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true, name: true },
    });

    if (!category) {
      return NextResponse.json(
        { message: "Category not found" },
        { status: 404 },
      );
    }

    const relatedItems = await prisma.item.count({
      where: { category_id: categoryId },
    });

    if (relatedItems > 0) {
      return NextResponse.json(
        {
          message: `Cannot delete category "${category.name}" because it is still used by ${relatedItems} item(s) in the inventory.`,
        },
        { status: 409 },
      );
    }

    await prisma.category.delete({
      where: { id: categoryId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/categories/[id] error:", error);

    return NextResponse.json(
      { message: "Failed to delete category" },
      { status: 500 },
    );
  }
}

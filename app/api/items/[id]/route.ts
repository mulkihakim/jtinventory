import { NextResponse } from "next/server";

import { getAuthenticatedUser, requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

function normalizeCondition(value: string) {
  const normalized = String(value ?? "GOOD").trim().toUpperCase();

  if (normalized === "DAMAGED" || normalized === "MAINTENANCE") {
    return normalized;
  }

  return "GOOD";
}

function mapItem(item: {
  id: number;
  code: string;
  name: string;
  description: string | null;
  quantity: number;
  available_quantity: number;
  condition: "GOOD" | "DAMAGED" | "MAINTENANCE";
  is_active: boolean;
  category: { name: string };
  maintainer: { name: string };
}) {
  return {
    id: item.id,
    code: item.code,
    name: item.name,
    description: item.description ?? "",
    category: item.category.name,
    maintainer: item.maintainer.name,
    quantity: item.quantity,
    availableQuantity: item.available_quantity,
    condition: item.condition,
    isActive: item.is_active,
  };
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await getAuthenticatedUser();

    if (!currentUser) {
      return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    }

    const roleCheck = requireRole(currentUser, ["TEKNISI"], "Only technicians can update inventory items.");

    if (roleCheck) {
      return roleCheck;
    }

    const { id } = await params;
    const itemId = Number(id);

    if (Number.isNaN(itemId)) {
      return NextResponse.json(
        { message: "Invalid item id" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const code = String(body.code ?? "").trim();
    const name = String(body.name ?? "").trim();
    const categoryName = String(body.category ?? "").trim();
    const maintainerName = String(body.maintainer ?? "").trim();

    if (!code || !name || !categoryName || !maintainerName) {
      return NextResponse.json(
        { message: "Code, name, category, and maintainer are required" },
        { status: 400 },
      );
    }

    const category = await prisma.category.findFirst({
      where: {
        name: { equals: categoryName, mode: "insensitive" },
      },
    });

    if (!category) {
      return NextResponse.json(
        { message: `Category "${categoryName}" not found` },
        { status: 404 },
      );
    }

    const maintainer = await prisma.user.findFirst({
      where: {
        name: { equals: maintainerName, mode: "insensitive" },
        role: "TEKNISI",
      },
    });

    if (!maintainer) {
      return NextResponse.json(
        { message: `Maintainer "${maintainerName}" not found` },
        { status: 404 },
      );
    }

    const quantity = Number(body.quantity);
    const availableQuantity = Number(body.availableQuantity);

    if (!Number.isInteger(quantity) || quantity < 1) {
      return NextResponse.json(
        { message: "Quantity must be a positive integer" },
        { status: 400 },
      );
    }

    if (!Number.isInteger(availableQuantity) || availableQuantity < 0 || availableQuantity > quantity) {
      return NextResponse.json(
        { message: "Available quantity must be between 0 and quantity" },
        { status: 400 },
      );
    }

    if (typeof body.isActive !== "boolean") {
      return NextResponse.json(
        { message: "isActive must be a boolean" },
        { status: 400 },
      );
    }

    const item = await prisma.item.update({
      where: { id: itemId },
      data: {
        code,
        name,
        description: String(body.description ?? "").trim(),
        category_id: category.id,
        maintainer_id: maintainer.id,
        quantity,
        available_quantity: availableQuantity,
        condition: normalizeCondition(body.condition),
        is_active: body.isActive,
      },
      include: {
        category: true,
        maintainer: true,
      },
    });

    return NextResponse.json(mapItem(item));
  } catch (error) {
    console.error("PUT /api/items/[id] error:", error);

    return NextResponse.json(
      { message: "Failed to update item" },
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

    const roleCheck = requireRole(currentUser, ["TEKNISI"], "Only technicians can delete inventory items.");

    if (roleCheck) {
      return roleCheck;
    }

    const { id } = await params;
    const itemId = Number(id);

    if (Number.isNaN(itemId)) {
      return NextResponse.json(
        { message: "Invalid item id" },
        { status: 400 },
      );
    }

    const item = await prisma.item.findUnique({
      where: { id: itemId },
      select: { id: true, name: true },
    });

    if (!item) {
      return NextResponse.json(
        { message: "Item not found" },
        { status: 404 },
      );
    }

    const relatedLoanItems = await prisma.loanItem.count({
      where: { item_id: itemId },
    });

    if (relatedLoanItems > 0) {
      return NextResponse.json(
        {
          message: `Cannot delete item "${item.name}" because it is still used in ${relatedLoanItems} loan record(s).`,
        },
        { status: 409 },
      );
    }

    await prisma.item.delete({
      where: { id: itemId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/items/[id] error:", error);

    return NextResponse.json(
      { message: "Failed to delete item" },
      { status: 500 },
    );
  }
}

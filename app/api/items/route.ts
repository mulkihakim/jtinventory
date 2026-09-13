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

export async function GET() {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    }

    const roleCheck = requireRole(user, ["MAHASISWA", "DOSEN", "TEKNISI"], "Only authenticated users can view inventory.");

    if (roleCheck) {
      return roleCheck;
    }

    const items = await prisma.item.findMany({
      where: user.role === "TEKNISI"
        ? undefined
        : {
            is_active: true,
            condition: "GOOD",
            available_quantity: { gt: 0 },
          },
      orderBy: {
        id: "asc",
      },
      include: {
        category: true,
        maintainer: true,
      },
    });

    return NextResponse.json(items.map(mapItem));
  } catch (error) {
    console.error("GET /api/items error:", error);

    return NextResponse.json(
      { message: "Failed to fetch items" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getAuthenticatedUser();

    if (!currentUser) {
      return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    }

    const roleCheck = requireRole(currentUser, ["TEKNISI"], "Only technicians can create inventory items.");

    if (roleCheck) {
      return roleCheck;
    }

    const body = await request.json();
    const code = String(body.code ?? "").trim();
    const name = String(body.name ?? "").trim();
    const categoryName = String(body.category ?? "").trim();
    const maintainerName = String(body.maintainer ?? "").trim();
    const description = String(body.description ?? "").trim();

    if (!code || !name || !categoryName || !maintainerName) {
      return NextResponse.json(
        { message: "Code, name, category, and maintainer are required" },
        { status: 400 },
      );
    }

    const category = await prisma.category.findFirst({
      where: {
        name: {
          equals: categoryName,
          mode: "insensitive",
        },
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
        name: {
          equals: maintainerName,
          mode: "insensitive",
        },
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

    const item = await prisma.item.create({
      data: {
        code,
        name,
        description,
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

    return NextResponse.json(mapItem(item), { status: 201 });
  } catch (error) {
    console.error("POST /api/items error:", error);

    return NextResponse.json(
      { message: "Failed to create item" },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";

import { getAuthenticatedUser, requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    }

    const roleCheck = requireRole(user, ["TEKNISI"], "Only technicians can access category data.");

    if (roleCheck) {
      return roleCheck;
    }

    const categories = await prisma.category.findMany({
      orderBy: {
        id: "asc",
      },
    });

    return NextResponse.json(
      categories.map((category) => ({
        id: category.id,
        name: category.name,
        description: category.description ?? "",
      })),
    );
  } catch (error) {
    console.error("GET /api/categories error:", error);

    return NextResponse.json(
      { message: "Failed to fetch categories" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    }

    const roleCheck = requireRole(user, ["TEKNISI"], "Only technicians can create categories.");

    if (roleCheck) {
      return roleCheck;
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

    const category = await prisma.category.create({
      data: {
        name,
        description,
      },
    });

    return NextResponse.json(
      {
        id: category.id,
        name: category.name,
        description: category.description ?? "",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/categories error:", error);

    return NextResponse.json(
      { message: "Failed to create category" },
      { status: 500 },
    );
  }
}

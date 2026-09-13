import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { getAuthenticatedUser, requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

function mapUser(user: {
  id: number;
  identity_number: string;
  name: string;
  email: string;
  role: "MAHASISWA" | "DOSEN" | "TEKNISI";
}) {
  return {
    id: user.id,
    identityNumber: user.identity_number,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

export async function GET() {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    }

    const roleCheck = requireRole(user, ["TEKNISI"], "Only technicians can access user records.");

    if (roleCheck) {
      return roleCheck;
    }

    const users = await prisma.user.findMany({
      orderBy: {
        id: "asc",
      },
    });

    return NextResponse.json(users.map(mapUser));
  } catch (error) {
    console.error("GET /api/users error:", error);

    return NextResponse.json(
      { message: "Failed to fetch users" },
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

    const roleCheck = requireRole(user, ["TEKNISI"], "Only technicians can create user records.");

    if (roleCheck) {
      return roleCheck;
    }

    const body = await request.json();
    const identityNumber = String(body.identityNumber ?? "").trim();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim();
    const role = String(body.role ?? "MAHASISWA").trim().toUpperCase();

    if (!identityNumber || !name || !email) {
      return NextResponse.json(
        { message: "Identity number, name, and email are required" },
        { status: 400 },
      );
    }

    if (!["MAHASISWA", "DOSEN", "TEKNISI"].includes(role)) {
      return NextResponse.json(
        { message: "Role must be MAHASISWA, DOSEN, or TEKNISI" },
        { status: 400 },
      );
    }

    const createdUser = await prisma.user.create({
      data: {
        identity_number: identityNumber,
        name,
        email,
        password_hash: await bcrypt.hash("password123", 10),
        role: role as "MAHASISWA" | "DOSEN" | "TEKNISI",
      },
    });

    return NextResponse.json(mapUser(createdUser), { status: 201 });
  } catch (error) {
    console.error("POST /api/users error:", error);

    return NextResponse.json(
      { message: "Failed to create user" },
      { status: 500 },
    );
  }
}

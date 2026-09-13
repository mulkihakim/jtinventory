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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const userId = Number(id);

    if (Number.isNaN(userId)) {
      return NextResponse.json(
        { message: "Invalid user id" },
        { status: 400 },
      );
    }

    const currentUser = await getAuthenticatedUser();

    if (!currentUser) {
      return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    }

    const isSelfUpdate = currentUser.id === userId;
    const canManageUser = currentUser.role === "TEKNISI";

    if (!isSelfUpdate && !canManageUser) {
      return NextResponse.json(
        { message: "You do not have permission to update this user." },
        { status: 403 },
      );
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

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!existingUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const nextRole = isSelfUpdate ? existingUser.role : (role as "MAHASISWA" | "DOSEN" | "TEKNISI");

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        identity_number: identityNumber,
        name,
        email,
        role: nextRole,
      },
    });

    return NextResponse.json(mapUser(user));
  } catch (error) {
    console.error("PUT /api/users/[id] error:", error);

    return NextResponse.json(
      { message: "Failed to update user" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const userId = Number(id);

    if (Number.isNaN(userId)) {
      return NextResponse.json(
        { message: "Invalid user id" },
        { status: 400 },
      );
    }

    const currentUser = await getAuthenticatedUser();

    if (!currentUser) {
      return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    }

    const roleCheck = requireRole(currentUser, ["TEKNISI"], "Only technicians can delete users.");

    if (roleCheck) {
      return roleCheck;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true },
    });

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 },
      );
    }

    if (userId === currentUser.id) {
      return NextResponse.json(
        { message: "You cannot delete your own account." },
        { status: 400 },
      );
    }

    const relatedMaintainedItems = await prisma.item.count({
      where: { maintainer_id: userId },
    });

    const relatedLoans = await prisma.loan.count({
      where: { user_id: userId },
    });

    const relatedApprovedLoans = await prisma.loan.count({
      where: { approved_by: userId },
    });

    const blockedRelations = [
      relatedMaintainedItems > 0 ? `${relatedMaintainedItems} maintained item(s)` : null,
      relatedLoans > 0 ? `${relatedLoans} loan record(s)` : null,
      relatedApprovedLoans > 0 ? `${relatedApprovedLoans} approved loan(s)` : null,
    ].filter(Boolean).join(", ");

    if (blockedRelations) {
      return NextResponse.json(
        {
          message: `Cannot delete user "${user.name}" because the account is still linked to ${blockedRelations}.`,
        },
        { status: 409 },
      );
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/users/[id] error:", error);

    return NextResponse.json(
      { message: "Failed to delete user" },
      { status: 500 },
    );
  }
}

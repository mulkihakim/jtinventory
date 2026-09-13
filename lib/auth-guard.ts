import { NextResponse } from "next/server";

import type { UserRole } from "@/app/generated/prisma/client";
import { auth } from "@/lib/auth";

export type SessionUser = {
  id: number;
  role: UserRole;
  email: string | null;
};

export async function getAuthenticatedUser(): Promise<SessionUser | null> {
  const session = await auth();

  if (!session?.user?.id || !session.user.role) {
    return null;
  }

  const userId = Number(session.user.id);

  if (Number.isNaN(userId)) {
    return null;
  }

  if (!["MAHASISWA", "DOSEN", "TEKNISI"].includes(session.user.role)) {
    return null;
  }

  return {
    id: userId,
    role: session.user.role as UserRole,
    email: session.user.email ?? null,
  };
}

export async function requireAuthenticatedUser() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return {
      user: null,
      response: unauthorizedResponse(),
    };
  }

  return { user, response: null };
}

export function requireRole(
  user: SessionUser | null,
  allowedRoles: UserRole[],
  message = "You do not have permission to perform this action.",
) {
  if (!user) {
    return unauthorizedResponse();
  }

  if (!allowedRoles.includes(user.role)) {
    return forbiddenResponse(message);
  }

  return null;
}

export function unauthorizedResponse(message = "Authentication required.") {
  return NextResponse.json({ message }, { status: 401 });
}

export function forbiddenResponse(
  message = "You do not have permission to perform this action.",
) {
  return NextResponse.json({ message }, { status: 403 });
}

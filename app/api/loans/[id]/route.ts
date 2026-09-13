import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

type LoanStatus = "PENDING" | "APPROVED" | "BORROWED" | "RETURNED" | "REJECTED";

function normalizeStatus(value: unknown): LoanStatus {
  const status = String(value ?? "PENDING").trim().toUpperCase();
  return ["PENDING", "APPROVED", "BORROWED", "RETURNED", "REJECTED"].includes(status)
    ? (status as LoanStatus)
    : "PENDING";
}

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function mapLoan(loan: {
  id: number;
  user: { name: string; identity_number?: string; email?: string; role?: string };
  status: LoanStatus;
  requested_at: Date;
  approved_at?: Date | null;
  borrowed_at?: Date | null;
  returned_at?: Date | null;
  due_date: Date | null;
  notes: string | null;
  identity_document_url: string | null;
  rejection_reason?: string | null;
  return_notes?: string | null;
  loan_items: Array<{ quantity: number; item: { name: string; code?: string } }>;
}) {
  const isOverdue = Boolean(
    loan.due_date &&
    loan.status === "BORROWED" &&
    new Date(loan.due_date).setHours(23, 59, 59, 999) < Date.now()
  );
  const daysOverdue = isOverdue && loan.due_date
    ? Math.max(1, Math.ceil((Date.now() - new Date(loan.due_date).setHours(23, 59, 59, 999)) / (1000 * 60 * 60 * 24)))
    : 0;

  return {
    id: loan.id,
    borrower: loan.user.name,
    borrowerIdentityNumber: loan.user.identity_number ?? "",
    borrowerEmail: loan.user.email ?? "",
    borrowerRole: loan.user.role ?? "",
    item: loan.loan_items.map((entry) => entry.item.name).join(", ") || "-",
    items: loan.loan_items.map((entry) => ({
      name: entry.item.name,
      code: entry.item.code ?? "",
      quantity: entry.quantity,
    })),
    quantity: loan.loan_items.reduce((sum, entry) => sum + entry.quantity, 0),
    dueDate: loan.due_date ? loan.due_date.toISOString().slice(0, 10) : "",
    status: loan.status,
    requestedAt: loan.requested_at.toISOString().slice(0, 10),
    approvedAt: loan.approved_at ? loan.approved_at.toISOString().slice(0, 10) : "",
    borrowedAt: loan.borrowed_at ? loan.borrowed_at.toISOString().slice(0, 10) : "",
    returnedAt: loan.returned_at ? loan.returned_at.toISOString().slice(0, 10) : "",
    notes: loan.notes ?? "",
    identityDocumentUrl: loan.identity_document_url ?? "",
    rejectionReason: loan.rejection_reason ?? "",
    returnNotes: loan.return_notes ?? "",
    isOverdue,
    daysOverdue,
  };
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) {
      return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    }

    const loanId = parseId((await params).id);
    if (!loanId) return NextResponse.json({ message: "Invalid loan id" }, { status: 400 });

    const isTechnician = currentUser.role === "TEKNISI";
    const body = await request.json();
    const dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (dueDate && Number.isNaN(dueDate.getTime())) {
      return NextResponse.json({ message: "Invalid due date" }, { status: 400 });
    }

    const existingLoan = await prisma.loan.findUnique({
      where: { id: loanId },
      include: { user: true, loan_items: true },
    });

    if (!existingLoan) return NextResponse.json({ message: "Loan not found" }, { status: 404 });

    if (!isTechnician && existingLoan.user_id !== currentUser.id) {
      return NextResponse.json({ message: "You can only edit your own loan requests." }, { status: 403 });
    }

    if (existingLoan.status !== "PENDING") {
      return NextResponse.json({ message: "Only pending loans can be edited." }, { status: 409 });
    }

    let borrowerId = existingLoan.user_id;
    if (isTechnician && body.borrower) {
      const borrowerName = String(body.borrower).trim();
      const borrower = await prisma.user.findFirst({
        where: { name: { equals: borrowerName, mode: "insensitive" } },
      });
      if (!borrower) return NextResponse.json({ message: `Borrower "${borrowerName}" not found` }, { status: 404 });
      borrowerId = borrower.id;
    }

    let rawItems = body.items;
    if (!rawItems && body.item) {
      rawItems = [
        {
          item: String(body.item ?? "").trim(),
          quantity: Number(body.quantity ?? 1),
        },
      ];
    }

    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return NextResponse.json({ message: "At least one item is required for the loan." }, { status: 400 });
    }

    type ParsedItemInput = {
      itemId?: number;
      item?: string;
      quantity: number;
    };

    const itemsToValidate: ParsedItemInput[] = [];
    for (const entry of rawItems) {
      if (typeof entry !== "object" || entry === null) {
        return NextResponse.json({ message: "Invalid item entry" }, { status: 400 });
      }

      const itemObj = entry as Record<string, unknown>;
      const itemId = typeof itemObj.itemId === "number"
        ? itemObj.itemId
        : typeof itemObj.id === "number"
        ? itemObj.id
        : undefined;
      const itemName = String(itemObj.item ?? itemObj.name ?? "").trim();
      const quantity = Number(itemObj.quantity);

      if (!itemId && !itemName) {
        return NextResponse.json({ message: "Item identification is required for each item." }, { status: 400 });
      }

      if (!Number.isInteger(quantity) || quantity < 1) {
        return NextResponse.json(
          { message: `Loan quantity must be at least 1 for ${itemName || "item"}` },
          { status: 400 },
        );
      }

      itemsToValidate.push({ itemId, item: itemName, quantity });
    }

    const validatedItems: Array<{
      item: { id: number; name: string; available_quantity: number };
      quantity: number;
    }> = [];
    const seenItemIds = new Set<number>();

    for (const input of itemsToValidate) {
      const dbItem = input.itemId
        ? await prisma.item.findUnique({ where: { id: input.itemId } })
        : await prisma.item.findFirst({
            where: { name: { equals: input.item, mode: "insensitive" } },
          });

      if (!dbItem) {
        return NextResponse.json({ message: `Item "${input.item || input.itemId}" not found` }, { status: 404 });
      }

      if (seenItemIds.has(dbItem.id)) {
        return NextResponse.json(
          { message: `Barang "${dbItem.name}" dipilih lebih dari satu kali. Silakan gabungkan jumlahnya.` },
          { status: 400 },
        );
      }
      seenItemIds.add(dbItem.id);

      if (!dbItem.is_active || dbItem.condition !== "GOOD" || dbItem.available_quantity <= 0) {
        return NextResponse.json({ message: `Barang "${dbItem.name}" tidak tersedia untuk dipinjam.` }, { status: 400 });
      }

      if (input.quantity > dbItem.available_quantity) {
        return NextResponse.json(
          { message: `Jumlah pinjam (${input.quantity}) melebihi stok yang tersedia (${dbItem.available_quantity}) untuk "${dbItem.name}".` },
          { status: 400 },
        );
      }

      validatedItems.push({ item: dbItem, quantity: input.quantity });
    }

    if (body.status && normalizeStatus(body.status) !== existingLoan.status) {
      if (!isTechnician) {
        return NextResponse.json({ message: "Borrowers cannot change loan status directly." }, { status: 403 });
      }
      return NextResponse.json({ message: "Use the loan workflow endpoint to change loan status." }, { status: 400 });
    }

    const loan = await prisma.$transaction(async (tx) => {
      await tx.loanItem.deleteMany({ where: { loan_id: loanId } });
      return tx.loan.update({
        where: { id: loanId },
        data: {
          user_id: borrowerId,
          due_date: dueDate,
          notes: String(body.notes ?? "").trim() || null,
          loan_items: {
            create: validatedItems.map((entry) => ({
              item_id: entry.item.id,
              quantity: entry.quantity,
            })),
          },
        },
        include: { user: true, loan_items: { include: { item: true } } },
      });
    });

    return NextResponse.json(mapLoan(loan));
  } catch (error) {
    console.error("PUT /api/loans/[id] error:", error);
    return NextResponse.json({ message: error instanceof Error ? error.message : "Failed to update loan" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) {
      return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    }

    const loanId = parseId((await params).id);
    if (!loanId) return NextResponse.json({ message: "Invalid loan id" }, { status: 400 });

    const body = await request.json();
    const action = String(body.action ?? "").trim().toUpperCase();
    const note = String(body.note ?? "").trim();

    if (currentUser.role !== "TEKNISI" && action !== "RETURN") {
      return NextResponse.json({ message: "Only technicians can perform this action." }, { status: 403 });
    }

    const loan = await prisma.$transaction(async (tx) => {
      const existingLoan = await tx.loan.findUnique({
        where: { id: loanId },
        include: { loan_items: { include: { item: true } } },
      });
      if (!existingLoan) throw new Error("Loan not found");

      if (currentUser.role !== "TEKNISI" && existingLoan.user_id !== currentUser.id) {
        throw new Error("You can only return items from your own loan.");
      }

      if (action === "APPROVE" || action === "REJECT") {
        if (existingLoan.status !== "PENDING") throw new Error(`Only pending loans can be ${action.toLowerCase()}d.`);
        return tx.loan.update({
          where: { id: loanId },
          data: action === "APPROVE"
            ? { status: "APPROVED", approved_at: new Date(), approved_by: currentUser.id, notes: note || existingLoan.notes }
            : { status: "REJECTED", approved_by: currentUser.id, rejection_reason: note || "No reason provided." },
          include: { user: true, loan_items: { include: { item: true } } },
        });
      }

      if (action === "BORROW") {
        if (existingLoan.status !== "APPROVED") throw new Error("Only approved loans can be processed as borrowed.");
        for (const entry of existingLoan.loan_items) {
          const item = await tx.item.findUnique({ where: { id: entry.item_id } });
          if (!item || !item.is_active || item.condition !== "GOOD" || entry.quantity > item.available_quantity) {
            throw new Error(`Item "${entry.item.name}" is not available for borrowing.`);
          }
          await tx.item.update({ where: { id: item.id }, data: { available_quantity: item.available_quantity - entry.quantity } });
        }
        return tx.loan.update({
          where: { id: loanId },
          data: { status: "BORROWED", borrowed_at: new Date(), approved_by: currentUser.id, notes: note || existingLoan.notes },
          include: { user: true, loan_items: { include: { item: true } } },
        });
      }

      if (action === "RETURN") {
        if (existingLoan.status !== "BORROWED") throw new Error("Only borrowed loans can be returned.");
        for (const entry of existingLoan.loan_items) {
          await tx.item.update({ where: { id: entry.item_id }, data: { available_quantity: { increment: entry.quantity } } });
        }
        return tx.loan.update({
          where: { id: loanId },
          data: {
            status: "RETURNED",
            returned_at: new Date(),
            approved_by: currentUser.role === "TEKNISI" ? currentUser.id : existingLoan.approved_by,
            return_notes: note || (currentUser.role !== "TEKNISI" ? "Dikembalikan oleh peminjam." : ""),
          },
          include: { user: true, loan_items: { include: { item: true } } },
        });
      }

      throw new Error("Unsupported loan action.");
    });

    return NextResponse.json({ success: true, message: `Loan marked as ${loan.status.toLowerCase()}.`, loan: mapLoan(loan) });
  } catch (error) {
    console.error("PATCH /api/loans/[id] error:", error);
    return NextResponse.json({ message: error instanceof Error ? error.message : "Failed to update loan workflow" }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) {
      return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    }

    const loanId = parseId((await params).id);
    if (!loanId) return NextResponse.json({ message: "Invalid loan id" }, { status: 400 });

    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      select: { id: true, user_id: true, status: true },
    });

    if (!loan) return NextResponse.json({ message: "Loan not found" }, { status: 404 });

    if (currentUser.role !== "TEKNISI" && loan.user_id !== currentUser.id) {
      return NextResponse.json({ message: "You can only delete your own loan requests." }, { status: 403 });
    }

    if (loan.status !== "PENDING" && loan.status !== "REJECTED") {
      return NextResponse.json({ message: "Only pending or rejected loans can be deleted or cancelled." }, { status: 409 });
    }

    await prisma.loan.delete({ where: { id: loanId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/loans/[id] error:", error);
    return NextResponse.json({ message: "Failed to delete loan" }, { status: 500 });
  }
}

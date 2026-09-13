import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { getAuthenticatedUser, requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

function mapLoan(loan: {
  id: number;
  user: { name: string; identity_number?: string; email?: string; role?: string };
  status: "PENDING" | "APPROVED" | "BORROWED" | "RETURNED" | "REJECTED";
  requested_at: Date;
  approved_at?: Date | null;
  borrowed_at?: Date | null;
  returned_at?: Date | null;
  due_date: Date | null;
  notes: string | null;
  rejection_reason?: string | null;
  return_notes?: string | null;
  identity_document_url: string | null;
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

export async function GET() {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    }

    const filters = {
      where: user.role === "TEKNISI" ? {} : { user_id: user.id },
      orderBy: { id: "asc" as const },
      include: {
        user: true,
        loan_items: { include: { item: true } },
      },
    };

    const loans = await prisma.loan.findMany(filters);

    return NextResponse.json(loans.map(mapLoan));
  } catch (error) {
    console.error("GET /api/loans error:", error);

    return NextResponse.json(
      { message: "Failed to fetch loans" },
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

    const roleCheck = requireRole(
      currentUser,
      ["MAHASISWA", "DOSEN", "TEKNISI"],
      "Only authenticated users can create loan requests."
    );

    if (roleCheck) {
      return roleCheck;
    }

    const contentType = request.headers.get("content-type") || "";
    let borrowerName = "";
    let rawItems: unknown = null;
    let dueDateRaw = "";
    let notes = "";
    let identityDocument: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      borrowerName = String(formData.get("borrower") ?? "").trim();
      dueDateRaw = String(formData.get("dueDate") ?? "").trim();
      notes = String(formData.get("notes") ?? "").trim();

      const idDoc = formData.get("identityDocument");
      if (idDoc instanceof File) {
        identityDocument = idDoc;
      } else if (idDoc !== null && idDoc !== undefined && idDoc !== "") {
        return NextResponse.json({ message: "Invalid KTM file" }, { status: 400 });
      }

      const itemsField = formData.get("items");
      if (typeof itemsField === "string" && itemsField.trim()) {
        try {
          rawItems = JSON.parse(itemsField);
        } catch {
          return NextResponse.json({ message: "Invalid items format" }, { status: 400 });
        }
      } else if (formData.get("item")) {
        rawItems = [
          {
            item: String(formData.get("item") ?? "").trim(),
            quantity: Number(formData.get("quantity") ?? 1),
          },
        ];
      }
    } else {
      const body = await request.json().catch(() => ({}));
      borrowerName = String(body.borrower ?? "").trim();
      dueDateRaw = String(body.dueDate ?? "").trim();
      notes = String(body.notes ?? "").trim();

      if (body.items) {
        rawItems = body.items;
      } else if (body.item) {
        rawItems = [
          {
            item: String(body.item ?? "").trim(),
            quantity: Number(body.quantity ?? 1),
          },
        ];
      }
    }

    let targetUserId = currentUser.id;
    if (currentUser.role === "TEKNISI" && borrowerName) {
      const borrower = await prisma.user.findFirst({
        where: { name: { equals: borrowerName, mode: "insensitive" } },
      });

      if (!borrower) {
        return NextResponse.json({ message: `Borrower "${borrowerName}" not found` }, { status: 404 });
      }

      targetUserId = borrower.id;
    }

    if (currentUser.role === "MAHASISWA" && !(identityDocument instanceof File)) {
      return NextResponse.json(
        { message: "KTM image is required for student loan requests" },
        { status: 400 },
      );
    }

    if (identityDocument instanceof File) {
      const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

      if (!allowedTypes.has(identityDocument.type)) {
        return NextResponse.json(
          { message: "KTM file must be JPG, JPEG, PNG, or WebP" },
          { status: 400 },
        );
      }

      if (identityDocument.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { message: "KTM file size must not exceed 5 MB" },
          { status: 400 },
        );
      }
    }

    const dueDateValue = dueDateRaw ? new Date(dueDateRaw) : null;
    if (dueDateValue && Number.isNaN(dueDateValue.getTime())) {
      return NextResponse.json(
        { message: "Invalid due date" },
        { status: 400 },
      );
    }

    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return NextResponse.json(
        { message: "At least one item is required for the loan request." },
        { status: 400 },
      );
    }

    type ParsedItemInput = {
      itemId?: number;
      item?: string;
      quantity: number;
    };

    const itemsToValidate: ParsedItemInput[] = [];
    for (const entry of rawItems) {
      if (typeof entry !== "object" || entry === null) {
        return NextResponse.json({ message: "Invalid item entry in list" }, { status: 400 });
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
        return NextResponse.json(
          { message: "Item identification is required for each item." },
          { status: 400 },
        );
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
        return NextResponse.json(
          { message: `Item "${input.item || input.itemId}" not found` },
          { status: 404 },
        );
      }

      if (seenItemIds.has(dbItem.id)) {
        return NextResponse.json(
          { message: `Barang "${dbItem.name}" dipilih lebih dari satu kali. Silakan gabungkan jumlahnya.` },
          { status: 400 },
        );
      }
      seenItemIds.add(dbItem.id);

      if (!dbItem.is_active || dbItem.condition !== "GOOD") {
        return NextResponse.json(
          { message: `Barang "${dbItem.name}" tidak tersedia untuk peminjaman.` },
          { status: 400 },
        );
      }

      if (input.quantity > dbItem.available_quantity) {
        return NextResponse.json(
          { message: `Jumlah pinjam (${input.quantity}) melebihi stok yang tersedia (${dbItem.available_quantity}) untuk "${dbItem.name}".` },
          { status: 400 },
        );
      }

      validatedItems.push({ item: dbItem, quantity: input.quantity });
    }

    let savedFilePath: string | null = null;

    try {
      let identityDocumentUrl: string | null = null;

      if (identityDocument instanceof File) {
        const extensionByType: Record<string, string> = {
          "image/jpeg": ".jpg",
          "image/png": ".png",
          "image/webp": ".webp",
        };
        const relativeDirectory = path.join("public", "uploads", "identity-documents", String(targetUserId));
        const absoluteDirectory = path.join(process.cwd(), relativeDirectory);
        const fileName = `${randomUUID()}${extensionByType[identityDocument.type]}`;

        await mkdir(absoluteDirectory, { recursive: true });
        savedFilePath = path.join(absoluteDirectory, fileName);
        await writeFile(savedFilePath, Buffer.from(await identityDocument.arrayBuffer()));
        identityDocumentUrl = `/uploads/identity-documents/${targetUserId}/${fileName}`;
      }

      // All new loans always start as PENDING regardless of role.
      // Status transitions happen via PATCH workflow actions (APPROVE, BORROW, RETURN).
      const finalStatus = "PENDING" as const;

      const loan = await prisma.$transaction(async (tx) => {
        const createdLoan = await tx.loan.create({
          data: {
            user_id: targetUserId,
            status: finalStatus,
            due_date: dueDateValue,
            identity_document_url: identityDocumentUrl,
            notes: notes || null,
            loan_items: {
              create: validatedItems.map((entry) => ({
                item_id: entry.item.id,
                quantity: entry.quantity,
              })),
            },
          },
          include: {
            user: true,
            loan_items: { include: { item: true } },
          },
        });

        return createdLoan;
      });

      return NextResponse.json(mapLoan(loan), { status: 201 });
    } catch (error) {
      if (savedFilePath) {
        await unlink(savedFilePath).catch(() => undefined);
      }

      throw error;
    }
  } catch (error) {
    console.error("POST /api/loans error:", error);

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to create loan" },
      { status: 500 },
    );
  }
}

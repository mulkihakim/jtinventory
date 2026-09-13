import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PUT } from "@/app/api/loans/[id]/route";

function makeSession(role: "MAHASISWA" | "DOSEN" | "TEKNISI", id = "1") {
  return { user: { id, role, email: `${role.toLowerCase()}@test.com` }, expires: "" };
}

function makePendingLoan(userId = 1) {
  return {
    id: 1,
    user_id: userId,
    status: "PENDING",
    requested_at: new Date(),
    user: { name: "Test", identity_number: "123", email: "a@b.com", role: "DOSEN" },
    loan_items: [],
  };
}

function makeItem(overrides: Partial<{
  available_quantity: number; is_active: boolean; condition: string;
}> = {}) {
  return {
    id: 1,
    name: "Laptop Dell",
    code: "LPT-001",
    is_active: true,
    condition: "GOOD",
    available_quantity: 5,
    quantity: 10,
    ...overrides,
  };
}

function makePutRequest(id: string, body: Record<string, unknown>) {
  return new NextRequest(`http://localhost/api/loans/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PUT /api/loans/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Auth ──────────────────────────────────────────────────────────────────

  it("returns 401 ketika tidak authenticated", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null);
    const req = makePutRequest("1", { items: [{ itemId: 1, quantity: 1 }], dueDate: "2026-10-01" });
    const res = await PUT(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 400 ketika loan id tidak valid", async () => {
    vi.mocked(auth).mockResolvedValueOnce(makeSession("TEKNISI"));
    const req = makePutRequest("abc", { items: [{ itemId: 1, quantity: 1 }] });
    const res = await PUT(req, { params: Promise.resolve({ id: "abc" }) });
    expect(res.status).toBe(400);
  });

  // ─── Ownership ────────────────────────────────────────────────────────────

  it("returns 403 ketika user mencoba edit loan orang lain", async () => {
    vi.mocked(auth).mockResolvedValueOnce(makeSession("DOSEN", "2")); // user id 2
    vi.mocked(prisma.loan.findUnique).mockResolvedValueOnce(
      makePendingLoan(1) as never, // loan milik user id 1
    );

    const req = makePutRequest("1", { items: [{ itemId: 1, quantity: 1 }], dueDate: "2026-10-01" });
    const res = await PUT(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.message).toContain("own");
  });

  // ─── Status constraint ────────────────────────────────────────────────────

  it("returns 409 ketika loan bukan PENDING (sudah APPROVED)", async () => {
    vi.mocked(auth).mockResolvedValueOnce(makeSession("DOSEN", "1"));
    vi.mocked(prisma.loan.findUnique).mockResolvedValueOnce({
      ...makePendingLoan(1),
      status: "APPROVED",
    } as never);

    const req = makePutRequest("1", { items: [{ itemId: 1, quantity: 1 }], dueDate: "2026-10-01" });
    const res = await PUT(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.message).toContain("pending");
  });

  // ─── B9: available_quantity = 0 saat edit ─────────────────────────────────

  it("B9: returns 400 ketika edit ke item dengan available_quantity = 0", async () => {
    vi.mocked(auth).mockResolvedValueOnce(makeSession("DOSEN", "1"));
    vi.mocked(prisma.loan.findUnique).mockResolvedValueOnce(makePendingLoan(1) as never);
    vi.mocked(prisma.item.findUnique).mockResolvedValueOnce(
      makeItem({ available_quantity: 0 }) as never, // stok habis
    );

    const req = makePutRequest("1", {
      items: [{ itemId: 1, quantity: 1 }],
      dueDate: "2026-10-01",
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("tidak tersedia");
  });

  it("B9: returns 400 ketika edit ke item inactive", async () => {
    vi.mocked(auth).mockResolvedValueOnce(makeSession("TEKNISI", "1"));
    vi.mocked(prisma.loan.findUnique).mockResolvedValueOnce(makePendingLoan(1) as never);
    vi.mocked(prisma.item.findUnique).mockResolvedValueOnce(
      makeItem({ is_active: false }) as never,
    );

    const req = makePutRequest("1", {
      items: [{ itemId: 1, quantity: 1 }],
      dueDate: "2026-10-01",
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(400);
  });

  it("B9: returns 400 ketika quantity melebihi available_quantity saat edit", async () => {
    vi.mocked(auth).mockResolvedValueOnce(makeSession("DOSEN", "1"));
    vi.mocked(prisma.loan.findUnique).mockResolvedValueOnce(makePendingLoan(1) as never);
    vi.mocked(prisma.item.findUnique).mockResolvedValueOnce(
      makeItem({ available_quantity: 2 }) as never,
    );

    const req = makePutRequest("1", {
      items: [{ itemId: 1, quantity: 10 }], // minta 10, tersedia 2
      dueDate: "2026-10-01",
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("melebihi stok");
  });

  // ─── Successful edit ──────────────────────────────────────────────────────

  it("berhasil update loan PENDING milik sendiri", async () => {
    vi.mocked(auth).mockResolvedValueOnce(makeSession("DOSEN", "1"));
    vi.mocked(prisma.loan.findUnique).mockResolvedValueOnce(makePendingLoan(1) as never);
    vi.mocked(prisma.item.findUnique).mockResolvedValueOnce(makeItem() as never);

    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
      const txMock = {
        loanItem: { deleteMany: vi.fn() },
        loan: {
          update: vi.fn().mockResolvedValue({
            id: 1, user_id: 1, status: "PENDING",
            requested_at: new Date(), approved_at: null, approved_by: null,
            borrowed_at: null, due_date: new Date("2026-10-01"),
            returned_at: null, identity_document_url: null, notes: null,
            rejection_reason: null, return_notes: null,
            user: { name: "Dosen JT", identity_number: "D001", email: "d@t.com", role: "DOSEN" },
            loan_items: [{ quantity: 2, item: { name: "Laptop Dell", code: "LPT-001" } }],
          }),
        },
      };
      return fn(txMock as never);
    });

    const req = makePutRequest("1", {
      items: [{ itemId: 1, quantity: 2 }],
      dueDate: "2026-10-01",
      notes: "Untuk praktikum",
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(200);
  });
});

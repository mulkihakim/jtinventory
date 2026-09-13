import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PATCH, DELETE } from "@/app/api/loans/[id]/route";

function makeSession(role: "MAHASISWA" | "DOSEN" | "TEKNISI", id = "1") {
  return { user: { id, role, email: `${role.toLowerCase()}@test.com` }, expires: "" };
}

function makeLoan(status: string, userId = 1, loanId = 1) {
  return {
    id: loanId,
    user_id: userId,
    status,
    requested_at: new Date(),
    approved_at: null,
    approved_by: null,
    borrowed_at: null,
    due_date: new Date("2026-10-01"),
    returned_at: null,
    notes: null,
    rejection_reason: null,
    return_notes: null,
    identity_document_url: null,
    user: { name: "Test User", identity_number: "123", email: "u@t.com", role: "DOSEN" },
    loan_items: [
      {
        id: 1,
        loan_id: loanId,
        item_id: 1,
        quantity: 2,
        item: { id: 1, name: "Laptop Dell", code: "LPT-001" },
      },
    ],
  };
}

function makeItem(overrides: Partial<{ available_quantity: number; is_active: boolean; condition: string }> = {}) {
  return {
    id: 1, name: "Laptop Dell", code: "LPT-001",
    is_active: true, condition: "GOOD", available_quantity: 5, quantity: 10,
    ...overrides,
  };
}

function makePatchRequest(id: string, body: Record<string, unknown>) {
  return new NextRequest(`http://localhost/api/loans/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest(id: string) {
  return new NextRequest(`http://localhost/api/loans/${id}`, { method: "DELETE" });
}

// ─── PATCH workflow tests ──────────────────────────────────────────────────────

describe("PATCH /api/loans/[id] (workflow)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Auth ──────────────────────────────────────────────────────────────────

  it("returns 401 ketika tidak authenticated", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null);
    const req = makePatchRequest("1", { action: "APPROVE" });
    const res = await PATCH(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(401);
  });

  // ─── APPROVE ──────────────────────────────────────────────────────────────

  it("returns 403 ketika MAHASISWA mencoba APPROVE", async () => {
    vi.mocked(auth).mockResolvedValueOnce(makeSession("MAHASISWA", "2"));
    const req = makePatchRequest("1", { action: "APPROVE" });
    const res = await PATCH(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.message).toContain("technician");
  });

  it("returns 403 ketika DOSEN mencoba APPROVE", async () => {
    vi.mocked(auth).mockResolvedValueOnce(makeSession("DOSEN", "3"));
    const req = makePatchRequest("1", { action: "APPROVE" });
    const res = await PATCH(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(403);
  });

  it("APPROVE berhasil oleh TEKNISI pada loan PENDING", async () => {
    vi.mocked(auth).mockResolvedValueOnce(makeSession("TEKNISI", "1"));

    const pendingLoan = makeLoan("PENDING");
    const approvedLoan = { ...pendingLoan, status: "APPROVED", approved_at: new Date(), approved_by: 1 };

    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
      const txMock = {
        loan: {
          findUnique: vi.fn().mockResolvedValue(pendingLoan),
          update: vi.fn().mockResolvedValue(approvedLoan),
        },
        item: { findUnique: vi.fn(), update: vi.fn() },
      };
      return fn(txMock as never);
    });

    const req = makePatchRequest("1", { action: "APPROVE" });
    const res = await PATCH(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.loan.status).toBe("APPROVED");
  });

  it("APPROVE gagal jika loan sudah APPROVED (bukan PENDING)", async () => {
    vi.mocked(auth).mockResolvedValueOnce(makeSession("TEKNISI", "1"));

    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
      const txMock = {
        loan: {
          findUnique: vi.fn().mockResolvedValue(makeLoan("APPROVED")),
          update: vi.fn(),
        },
        item: { findUnique: vi.fn(), update: vi.fn() },
      };
      return fn(txMock as never).catch((e: Error) => { throw e; });
    });

    vi.mocked(prisma.$transaction).mockRejectedValueOnce(
      new Error("Only pending loans can be approvedd.")
    );

    const req = makePatchRequest("1", { action: "APPROVE" });
    const res = await PATCH(req, { params: Promise.resolve({ id: "1" }) });
    // PATCH mengembalikan 400 untuk error message dari business logic
    expect(res.status).toBe(400);
  });

  // ─── REJECT ───────────────────────────────────────────────────────────────

  it("REJECT berhasil oleh TEKNISI dengan rejection_reason", async () => {
    vi.mocked(auth).mockResolvedValueOnce(makeSession("TEKNISI", "1"));

    const pendingLoan = makeLoan("PENDING");
    const rejectedLoan = {
      ...pendingLoan, status: "REJECTED",
      approved_by: 1, rejection_reason: "Stok tidak cukup",
    };

    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
      const txMock = {
        loan: {
          findUnique: vi.fn().mockResolvedValue(pendingLoan),
          update: vi.fn().mockResolvedValue(rejectedLoan),
        },
        item: { findUnique: vi.fn(), update: vi.fn() },
      };
      return fn(txMock as never);
    });

    const req = makePatchRequest("1", { action: "REJECT", note: "Stok tidak cukup" });
    const res = await PATCH(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.loan.status).toBe("REJECTED");
  });

  // ─── BORROW ───────────────────────────────────────────────────────────────

  it("BORROW berhasil: loan APPROVED → BORROWED, stok berkurang", async () => {
    vi.mocked(auth).mockResolvedValueOnce(makeSession("TEKNISI", "1"));

    const approvedLoan = makeLoan("APPROVED");
    const borrowedLoan = { ...approvedLoan, status: "BORROWED", borrowed_at: new Date() };
    const itemBefore = makeItem({ available_quantity: 5 });

    const mockItemUpdate = vi.fn().mockResolvedValue({ ...itemBefore, available_quantity: 3 });

    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
      const txMock = {
        loan: {
          findUnique: vi.fn().mockResolvedValue(approvedLoan),
          update: vi.fn().mockResolvedValue(borrowedLoan),
        },
        item: {
          findUnique: vi.fn().mockResolvedValue(itemBefore),
          update: mockItemUpdate,
        },
      };
      return fn(txMock as never);
    });

    const req = makePatchRequest("1", { action: "BORROW" });
    const res = await PATCH(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.loan.status).toBe("BORROWED");

    // Verifikasi item.update dipanggil untuk decrement stok
    expect(mockItemUpdate).toHaveBeenCalled();
  });

  it("BORROW gagal jika loan bukan APPROVED", async () => {
    vi.mocked(auth).mockResolvedValueOnce(makeSession("TEKNISI", "1"));
    vi.mocked(prisma.$transaction).mockRejectedValueOnce(
      new Error("Only approved loans can be processed as borrowed.")
    );

    const req = makePatchRequest("1", { action: "BORROW" });
    const res = await PATCH(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("approved");
  });

  // ─── RETURN ───────────────────────────────────────────────────────────────

  it("RETURN berhasil: loan BORROWED → RETURNED, stok bertambah", async () => {
    vi.mocked(auth).mockResolvedValueOnce(makeSession("TEKNISI", "1"));

    const borrowedLoan = makeLoan("BORROWED");
    const returnedLoan = { ...borrowedLoan, status: "RETURNED", returned_at: new Date() };
    const mockItemUpdate = vi.fn().mockResolvedValue({ id: 1, available_quantity: 7 });

    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
      const txMock = {
        loan: {
          findUnique: vi.fn().mockResolvedValue(borrowedLoan),
          update: vi.fn().mockResolvedValue(returnedLoan),
        },
        item: { update: mockItemUpdate },
      };
      return fn(txMock as never);
    });

    const req = makePatchRequest("1", { action: "RETURN" });
    const res = await PATCH(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.loan.status).toBe("RETURNED");

    // Verifikasi increment stok dipanggil
    expect(mockItemUpdate).toHaveBeenCalled();
  });

  it("RETURN gagal jika loan bukan BORROWED", async () => {
    vi.mocked(auth).mockResolvedValueOnce(makeSession("TEKNISI", "1"));
    vi.mocked(prisma.$transaction).mockRejectedValueOnce(
      new Error("Only borrowed loans can be returned.")
    );

    const req = makePatchRequest("1", { action: "RETURN" });
    const res = await PATCH(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(400);
  });

  it("RETURN user biasa tidak bisa return loan orang lain", async () => {
    vi.mocked(auth).mockResolvedValueOnce(makeSession("DOSEN", "2")); // user 2
    vi.mocked(prisma.$transaction).mockRejectedValueOnce(
      new Error("You can only return items from your own loan.")
    );

    const req = makePatchRequest("1", { action: "RETURN" });
    const res = await PATCH(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("own loan");
  });
});

// ─── DELETE tests ─────────────────────────────────────────────────────────────

describe("DELETE /api/loans/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 ketika tidak authenticated", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null);
    const req = makeDeleteRequest("1");
    const res = await DELETE(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 409 ketika loan berstatus BORROWED (tidak bisa dihapus)", async () => {
    vi.mocked(auth).mockResolvedValueOnce(makeSession("TEKNISI", "1"));
    vi.mocked(prisma.loan.findUnique).mockResolvedValueOnce({
      id: 1, user_id: 2, status: "BORROWED",
    } as never);

    const req = makeDeleteRequest("1");
    const res = await DELETE(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.message).toContain("pending or rejected");
  });

  it("returns 403 ketika user biasa mencoba hapus loan orang lain", async () => {
    vi.mocked(auth).mockResolvedValueOnce(makeSession("DOSEN", "2")); // user 2
    vi.mocked(prisma.loan.findUnique).mockResolvedValueOnce({
      id: 1, user_id: 1, status: "PENDING", // loan milik user 1
    } as never);

    const req = makeDeleteRequest("1");
    const res = await DELETE(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.message).toContain("own");
  });

  it("TEKNISI dapat hapus loan PENDING milik siapapun", async () => {
    vi.mocked(auth).mockResolvedValueOnce(makeSession("TEKNISI", "1"));
    vi.mocked(prisma.loan.findUnique).mockResolvedValueOnce({
      id: 1, user_id: 5, status: "PENDING", // loan milik user lain
    } as never);
    vi.mocked(prisma.loan.delete).mockResolvedValueOnce({ id: 1 } as never);

    const req = makeDeleteRequest("1");
    const res = await DELETE(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("User dapat hapus loan REJECTED milik sendiri", async () => {
    vi.mocked(auth).mockResolvedValueOnce(makeSession("DOSEN", "3"));
    vi.mocked(prisma.loan.findUnique).mockResolvedValueOnce({
      id: 1, user_id: 3, status: "REJECTED",
    } as never);
    vi.mocked(prisma.loan.delete).mockResolvedValueOnce({ id: 1 } as never);

    const req = makeDeleteRequest("1");
    const res = await DELETE(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(200);
  });
});

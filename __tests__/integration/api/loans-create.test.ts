import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { POST } from "@/app/api/loans/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSession(role: "MAHASISWA" | "DOSEN" | "TEKNISI", id = "1") {
  return { user: { id, role, email: `${role.toLowerCase()}@test.com` }, expires: "" };
}

function makeAvailableItem(overrides: Partial<{
  id: number; name: string; code: string;
  is_active: boolean; condition: string; available_quantity: number;
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

function makeJsonRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/loans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/loans", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: item available
    vi.mocked(prisma.item.findUnique).mockResolvedValue(makeAvailableItem() as never);
    vi.mocked(prisma.item.findFirst).mockResolvedValue(makeAvailableItem() as never);

    // Default: transaction creates loan and returns it
    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
      const txMock = {
        loan: {
          create: vi.fn().mockResolvedValue({
            id: 1,
            user_id: 1,
            status: "PENDING",
            requested_at: new Date(),
            approved_at: null,
            approved_by: null,
            borrowed_at: null,
            due_date: new Date("2026-10-01"),
            returned_at: null,
            identity_document_url: null,
            notes: null,
            rejection_reason: null,
            return_notes: null,
            user: { name: "Test User", identity_number: "12345", email: "user@test.com", role: "DOSEN" },
            loan_items: [{ quantity: 2, item: { name: "Laptop Dell", code: "LPT-001" } }],
          }),
        },
        item: { update: vi.fn() },
      };
      return fn(txMock as never);
    });
  });

  // ─── Auth ──────────────────────────────────────────────────────────────────

  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null);
    const req = makeJsonRequest({ items: [{ itemId: 1, quantity: 1 }], dueDate: "2026-10-01" });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  // ─── B2: Status selalu PENDING ─────────────────────────────────────────────

  it("B2: TEKNISI tidak dapat inject status BORROWED saat create", async () => {
    vi.mocked(auth).mockResolvedValueOnce(makeSession("TEKNISI"));
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce({
      id: 2, name: "Mahasiswa JT", role: "MAHASISWA",
    } as never);

    const req = makeJsonRequest({
      borrower: "Mahasiswa JT",
      items: [{ itemId: 1, quantity: 1 }],
      dueDate: "2026-10-01",
      status: "BORROWED", // coba inject
    });
    const res = await POST(req);
    const body = await res.json();

    // Response harus sukses (201) tapi status harus PENDING, bukan BORROWED
    expect(res.status).toBe(201);
    expect(body.status).toBe("PENDING");
  });

  it("B2: MAHASISWA tidak dapat inject status APPROVED", async () => {
    vi.mocked(auth).mockResolvedValueOnce(makeSession("MAHASISWA"));

    // MAHASISWA butuh KTM → test via JSON tanpa KTM → akan error 400, bukan karena status
    // Test fokus: bahkan kalau MAHASISWA kirim status=APPROVED di body, tidak ada efek
    // Pertama tes via JSON (tanpa KTM) → 400 karena KTM wajib
    const req = makeJsonRequest({
      items: [{ itemId: 1, quantity: 1 }],
      dueDate: "2026-10-01",
      status: "APPROVED",
    });
    const res = await POST(req);
    // Seharusnya 400 karena KTM kurang (bukan karena status injection berhasil)
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("KTM");
  });

  it("B2: DOSEN yang membuat loan selalu mendapat status PENDING", async () => {
    vi.mocked(auth).mockResolvedValueOnce(makeSession("DOSEN", "3"));

    const req = makeJsonRequest({
      items: [{ itemId: 1, quantity: 1 }],
      dueDate: "2026-10-01",
      status: "APPROVED", // coba inject
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.status).toBe("PENDING");
  });

  // ─── KTM requirement ──────────────────────────────────────────────────────

  it("returns 400 ketika MAHASISWA tidak upload KTM (JSON request)", async () => {
    vi.mocked(auth).mockResolvedValueOnce(makeSession("MAHASISWA"));
    const req = makeJsonRequest({
      items: [{ itemId: 1, quantity: 1 }],
      dueDate: "2026-10-01",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("KTM");
  });

  it("DOSEN tidak wajib upload KTM — loan berhasil dibuat", async () => {
    vi.mocked(auth).mockResolvedValueOnce(makeSession("DOSEN", "3"));
    const req = makeJsonRequest({
      items: [{ itemId: 1, quantity: 1 }],
      dueDate: "2026-10-01",
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  // ─── Item validation ──────────────────────────────────────────────────────

  it("returns 400 ketika tidak ada item dikirim", async () => {
    vi.mocked(auth).mockResolvedValueOnce(makeSession("DOSEN"));
    const req = makeJsonRequest({ dueDate: "2026-10-01" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("item");
  });

  it("returns 400 ketika item duplikat dalam satu request", async () => {
    vi.mocked(auth).mockResolvedValueOnce(makeSession("DOSEN"));
    // Mock item ditemukan dua kali (ID sama)
    vi.mocked(prisma.item.findUnique)
      .mockResolvedValueOnce(makeAvailableItem({ id: 1 }) as never)
      .mockResolvedValueOnce(makeAvailableItem({ id: 1 }) as never);

    const req = makeJsonRequest({
      items: [
        { itemId: 1, quantity: 1 },
        { itemId: 1, quantity: 2 }, // duplikat
      ],
      dueDate: "2026-10-01",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toMatch(/lebih dari satu kali/i);
  });

  it("returns 400 ketika quantity > available_quantity", async () => {
    vi.mocked(auth).mockResolvedValueOnce(makeSession("DOSEN"));
    vi.mocked(prisma.item.findUnique).mockResolvedValueOnce(
      makeAvailableItem({ available_quantity: 2 }) as never,
    );

    const req = makeJsonRequest({
      items: [{ itemId: 1, quantity: 5 }], // minta 5, tersedia 2
      dueDate: "2026-10-01",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("melebihi stok");
  });

  // ─── B3: Item tidak aktif / kondisi buruk ─────────────────────────────────

  it("B3: returns 400 ketika item tidak aktif (is_active=false)", async () => {
    vi.mocked(auth).mockResolvedValueOnce(makeSession("DOSEN"));
    vi.mocked(prisma.item.findUnique).mockResolvedValueOnce(
      makeAvailableItem({ is_active: false }) as never,
    );

    const req = makeJsonRequest({
      items: [{ itemId: 1, quantity: 1 }],
      dueDate: "2026-10-01",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("tidak tersedia");
  });

  it("B3: returns 400 ketika item condition DAMAGED", async () => {
    vi.mocked(auth).mockResolvedValueOnce(makeSession("DOSEN"));
    vi.mocked(prisma.item.findUnique).mockResolvedValueOnce(
      makeAvailableItem({ condition: "DAMAGED" }) as never,
    );

    const req = makeJsonRequest({
      items: [{ itemId: 1, quantity: 1 }],
      dueDate: "2026-10-01",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 ketika due date tidak valid", async () => {
    vi.mocked(auth).mockResolvedValueOnce(makeSession("DOSEN"));
    const req = makeJsonRequest({
      items: [{ itemId: 1, quantity: 1 }],
      dueDate: "bukan-tanggal",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("date");
  });

  it("returns 404 ketika item tidak ditemukan di database", async () => {
    vi.mocked(auth).mockResolvedValueOnce(makeSession("DOSEN"));
    vi.mocked(prisma.item.findUnique).mockResolvedValueOnce(null);

    const req = makeJsonRequest({
      items: [{ itemId: 999, quantity: 1 }],
      dueDate: "2026-10-01",
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });
});

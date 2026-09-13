import { vi } from "vitest";

// ─── Environment Variables ───────────────────────────────────────────────────
process.env.AUTH_SECRET = "test-secret-for-vitest-only";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.NEXTAUTH_URL = "http://localhost:3000";
process.env.NEXTAUTH_SECRET = "test-secret-for-vitest-only";

// ─── Mock next-auth ───────────────────────────────────────────────────────────
// next-auth is mocked globally. Individual tests can override via:
//   vi.mocked(getServerSession).mockResolvedValueOnce({ user: { id: "1", role: "TEKNISI" } })
vi.mock("next-auth/next", () => ({
  getServerSession: vi.fn().mockResolvedValue(null),
}));

vi.mock("next-auth", () => ({
  default: vi.fn(),
}));

// ─── Mock lib/auth (wraps getServerSession) ──────────────────────────────────
vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue(null),
  authOptions: {},
  handler: vi.fn(),
}));

// ─── Mock lib/prisma ─────────────────────────────────────────────────────────
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    category: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    item: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    loan: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    loanItem: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

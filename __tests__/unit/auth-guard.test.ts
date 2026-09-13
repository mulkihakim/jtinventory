import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

// Import after mocks are set up in setup.ts
import {
  getAuthenticatedUser,
  requireAuthenticatedUser,
  requireRole,
  unauthorizedResponse,
  forbiddenResponse,
} from "@/lib/auth-guard";
import { auth } from "@/lib/auth";

describe("auth-guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── getAuthenticatedUser ─────────────────────────────────────────────────

  describe("getAuthenticatedUser", () => {
    it("returns null when session is null", async () => {
      vi.mocked(auth).mockResolvedValueOnce(null);
      const result = await getAuthenticatedUser();
      expect(result).toBeNull();
    });

    it("returns null when session has no user", async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: undefined, expires: "" } as any);
      const result = await getAuthenticatedUser();
      expect(result).toBeNull();
    });

    it("returns null when user id is missing", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: "", role: "MAHASISWA", email: "a@b.com" },
        expires: "",
      });
      const result = await getAuthenticatedUser();
      expect(result).toBeNull();
    });

    it("returns null when user id is not a number", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: "abc", role: "MAHASISWA", email: "a@b.com" },
        expires: "",
      });
      const result = await getAuthenticatedUser();
      expect(result).toBeNull();
    });

    it("returns null when role is invalid", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: "1", role: "ADMIN" as any, email: "a@b.com" },
        expires: "",
      });
      const result = await getAuthenticatedUser();
      expect(result).toBeNull();
    });

    it.each([["MAHASISWA"], ["DOSEN"], ["TEKNISI"]] as const)(
      "returns SessionUser for role %s",
      async (role) => {
        vi.mocked(auth).mockResolvedValueOnce({
          user: { id: "5", role, email: "user@test.com" },
          expires: "",
        });
        const result = await getAuthenticatedUser();
        expect(result).toEqual({ id: 5, role, email: "user@test.com" });
      },
    );

    it("sets email to null when not provided", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: "3", role: "DOSEN", email: undefined },
        expires: "",
      });
      const result = await getAuthenticatedUser();
      expect(result?.email).toBeNull();
    });
  });

  // ─── requireAuthenticatedUser ─────────────────────────────────────────────

  describe("requireAuthenticatedUser", () => {
    it("returns 401 response when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValueOnce(null);
      const { user, response } = await requireAuthenticatedUser();
      expect(user).toBeNull();
      expect(response).toBeInstanceOf(NextResponse);
      expect(response?.status).toBe(401);
    });

    it("returns user and null response when authenticated", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: "1", role: "TEKNISI", email: "tech@test.com" },
        expires: "",
      });
      const { user, response } = await requireAuthenticatedUser();
      expect(user?.role).toBe("TEKNISI");
      expect(response).toBeNull();
    });
  });

  // ─── requireRole ─────────────────────────────────────────────────────────

  describe("requireRole", () => {
    const teknisiUser = { id: 1, role: "TEKNISI" as const, email: "t@t.com" };
    const mahasiswaUser = { id: 2, role: "MAHASISWA" as const, email: "m@m.com" };

    it("returns null when user role is allowed", () => {
      const result = requireRole(teknisiUser, ["TEKNISI"]);
      expect(result).toBeNull();
    });

    it("returns 401 response when user is null", () => {
      const result = requireRole(null, ["TEKNISI"]);
      expect(result).toBeInstanceOf(NextResponse);
      expect(result?.status).toBe(401);
    });

    it("returns 403 response when role is not in allowed list", () => {
      const result = requireRole(mahasiswaUser, ["TEKNISI"]);
      expect(result).toBeInstanceOf(NextResponse);
      expect(result?.status).toBe(403);
    });

    it("returns null when multiple roles are allowed and user matches one", () => {
      const result = requireRole(mahasiswaUser, ["MAHASISWA", "DOSEN"]);
      expect(result).toBeNull();
    });

    it("uses custom forbidden message", async () => {
      const result = requireRole(mahasiswaUser, ["TEKNISI"], "Custom message");
      const body = await result?.json();
      expect(body?.message).toBe("Custom message");
    });
  });

  // ─── Response helpers ─────────────────────────────────────────────────────

  describe("unauthorizedResponse", () => {
    it("returns 401 with default message", async () => {
      const res = unauthorizedResponse();
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.message).toBe("Authentication required.");
    });

    it("returns 401 with custom message", async () => {
      const res = unauthorizedResponse("Custom unauth");
      const body = await res.json();
      expect(body.message).toBe("Custom unauth");
    });
  });

  describe("forbiddenResponse", () => {
    it("returns 403 with default message", async () => {
      const res = forbiddenResponse();
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.message).toBeDefined();
    });

    it("returns 403 with custom message", async () => {
      const res = forbiddenResponse("No access");
      const body = await res.json();
      expect(body.message).toBe("No access");
    });
  });
});

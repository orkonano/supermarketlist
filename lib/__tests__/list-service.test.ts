import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("../prisma", () => ({
  prisma: {
    list: { findUnique: vi.fn() },
    listMember: { findUnique: vi.fn(), create: vi.fn() },
  },
}));

import { ensureMember } from "../list-service";
import { prisma } from "../prisma";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import { ServiceError } from "../errors";

const OWNER_LIST = { id: "list-1", ownerId: "user-1", name: "Home", createdAt: new Date(), updatedAt: new Date() };

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// ensureMember
// ---------------------------------------------------------------------------

describe("ensureMember", () => {
  it("returns when the user has an explicit member record", async () => {
    vi.mocked(prisma.listMember.findUnique).mockResolvedValue({ listId: "list-1", userId: "user-1", joinedAt: new Date() });

    await expect(ensureMember("list-1", "user-1")).resolves.toBeUndefined();
    expect(vi.mocked(prisma.listMember.create)).not.toHaveBeenCalled();
  });

  it("throws PermissionDenied when user is neither a member nor the owner", async () => {
    vi.mocked(prisma.listMember.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.list.findUnique).mockResolvedValue({ ...OWNER_LIST, ownerId: "other-user" } as never);

    await expect(ensureMember("list-1", "user-1")).rejects.toThrow(ServiceError);
  });

  describe("self-heal path (owner without a member record)", () => {
    beforeEach(() => {
      vi.mocked(prisma.listMember.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.list.findUnique).mockResolvedValue(OWNER_LIST as never);
    });

    it("creates the missing member record and returns", async () => {
      vi.mocked(prisma.listMember.create).mockResolvedValue({ listId: "list-1", userId: "user-1", joinedAt: new Date() });

      await expect(ensureMember("list-1", "user-1")).resolves.toBeUndefined();
      expect(vi.mocked(prisma.listMember.create)).toHaveBeenCalledWith({
        data: { listId: "list-1", userId: "user-1" },
      });
    });

    it("ignores P2002 when the record was created concurrently", async () => {
      const p2002 = new PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "6.0.0",
      });
      vi.mocked(prisma.listMember.create).mockRejectedValue(p2002);

      await expect(ensureMember("list-1", "user-1")).resolves.toBeUndefined();
    });

    it("propagates unexpected errors from the self-heal create", async () => {
      const dbError = new Error("Connection timeout");
      vi.mocked(prisma.listMember.create).mockRejectedValue(dbError);

      await expect(ensureMember("list-1", "user-1")).rejects.toThrow("Connection timeout");
    });
  });
});

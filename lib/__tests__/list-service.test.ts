import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("../prisma", () => ({
  prisma: {
    list: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    listMember: { findUnique: vi.fn(), create: vi.fn() },
  },
}));

import { ensureMember, serviceGetList, serviceUpdateList, serviceDeleteList } from "../list-service";
import { prisma } from "../prisma";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import { ServiceError } from "../errors";

const OWNER_LIST = { id: "list-1", ownerId: "user-1", name: "Home", createdAt: new Date(), updatedAt: new Date() };
const FULL_LIST = {
  ...OWNER_LIST,
  owner: { name: "Alice" },
  members: [{ userId: "user-1" }],
  _count: { members: 1, items: 3 },
};

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

// ---------------------------------------------------------------------------
// serviceGetList
// ---------------------------------------------------------------------------

describe("serviceGetList", () => {
  it("returns null when the list does not exist", async () => {
    vi.mocked(prisma.list.findUnique).mockResolvedValue(null);

    const result = await serviceGetList("list-1", "user-1");

    expect(result).toBeNull();
    expect(vi.mocked(prisma.listMember.create)).not.toHaveBeenCalled();
  });

  it("returns the list (without the filtered members array) when the user is a member", async () => {
    vi.mocked(prisma.list.findUnique).mockResolvedValue(FULL_LIST as never);

    const result = await serviceGetList("list-1", "user-1");

    expect(result).not.toBeNull();
    expect(result).not.toHaveProperty("members");
    expect(result).toMatchObject({ id: "list-1", owner: { name: "Alice" }, _count: { members: 1, items: 3 } });
    expect(vi.mocked(prisma.listMember.create)).not.toHaveBeenCalled();
  });

  it("throws PermissionDenied when user is not a member and not the owner", async () => {
    vi.mocked(prisma.list.findUnique).mockResolvedValue({
      ...FULL_LIST,
      ownerId: "other-user",
      members: [],
    } as never);

    await expect(serviceGetList("list-1", "user-1")).rejects.toThrow(ServiceError);
  });

  describe("self-heal path (owner without a member record)", () => {
    it("creates the missing member record and returns the list", async () => {
      vi.mocked(prisma.list.findUnique).mockResolvedValue({ ...FULL_LIST, members: [] } as never);
      vi.mocked(prisma.listMember.create).mockResolvedValue({ listId: "list-1", userId: "user-1", joinedAt: new Date() });

      const result = await serviceGetList("list-1", "user-1");

      expect(result).not.toBeNull();
      expect(vi.mocked(prisma.listMember.create)).toHaveBeenCalledWith({ data: { listId: "list-1", userId: "user-1" } });
    });

    it("ignores P2002 from a concurrent self-heal create", async () => {
      vi.mocked(prisma.list.findUnique).mockResolvedValue({ ...FULL_LIST, members: [] } as never);
      const p2002 = new PrismaClientKnownRequestError("Unique constraint failed", { code: "P2002", clientVersion: "6.0.0" });
      vi.mocked(prisma.listMember.create).mockRejectedValue(p2002);

      await expect(serviceGetList("list-1", "user-1")).resolves.not.toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// serviceUpdateList
// ---------------------------------------------------------------------------

describe("serviceUpdateList", () => {
  it("updates the list and returns it when the user is the owner", async () => {
    vi.mocked(prisma.list.update).mockResolvedValue({ ...OWNER_LIST, name: "Renamed" } as never);

    const result = await serviceUpdateList("list-1", "user-1", "Renamed");

    expect(vi.mocked(prisma.list.update)).toHaveBeenCalledWith({
      where: { id: "list-1", ownerId: "user-1" },
      data: { name: "Renamed" },
    });
    expect(result).toMatchObject({ name: "Renamed" });
  });

  it("throws PermissionDenied when the list does not exist or the user is not the owner", async () => {
    const p2025 = new PrismaClientKnownRequestError("Record not found", { code: "P2025", clientVersion: "6.0.0" });
    vi.mocked(prisma.list.update).mockRejectedValue(p2025);

    await expect(serviceUpdateList("list-1", "user-2", "X")).rejects.toThrow(ServiceError);
  });

  it("propagates non-P2025 errors", async () => {
    vi.mocked(prisma.list.update).mockRejectedValue(new Error("DB down"));

    await expect(serviceUpdateList("list-1", "user-1", "X")).rejects.toThrow("DB down");
  });
});

// ---------------------------------------------------------------------------
// serviceDeleteList
// ---------------------------------------------------------------------------

describe("serviceDeleteList", () => {
  it("deletes the list when the user is the owner", async () => {
    vi.mocked(prisma.list.delete).mockResolvedValue(OWNER_LIST as never);

    await serviceDeleteList("list-1", "user-1");

    expect(vi.mocked(prisma.list.delete)).toHaveBeenCalledWith({
      where: { id: "list-1", ownerId: "user-1" },
    });
  });

  it("throws PermissionDenied when the list does not exist or the user is not the owner", async () => {
    const p2025 = new PrismaClientKnownRequestError("Record not found", { code: "P2025", clientVersion: "6.0.0" });
    vi.mocked(prisma.list.delete).mockRejectedValue(p2025);

    await expect(serviceDeleteList("list-1", "user-2")).rejects.toThrow(ServiceError);
  });

  it("propagates non-P2025 errors", async () => {
    vi.mocked(prisma.list.delete).mockRejectedValue(new Error("DB down"));

    await expect(serviceDeleteList("list-1", "user-1")).rejects.toThrow("DB down");
  });
});

import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../dal", () => ({ verifySession: vi.fn() }));
vi.mock("../prisma", () => ({
  prisma: {
    list: { create: vi.fn(), update: vi.fn(), delete: vi.fn(), findUnique: vi.fn(), findMany: vi.fn() },
    listMember: { findUnique: vi.fn(), create: vi.fn() },
    item: { create: vi.fn(), update: vi.fn(), delete: vi.fn(), findMany: vi.fn() },
    user: { findUniqueOrThrow: vi.fn() },
  },
}));

import { createList, updateList, deleteList, getUserLists, getListItems, addListItem, toggleListItem, deleteListItem } from "../list-actions";
import { verifySession } from "../dal";
import { prisma } from "../prisma";

const SESSION = { isAuth: true as const, userId: "user-1" };

const fakeList = {
  id: "list-1",
  name: "Home",
  ownerId: "user-1",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const fakeItem = {
  id: "item-1",
  name: "Milk",
  quantity: "1L",
  category: "Dairy",
  addedBy: "Alice",
  month: 5,
  year: 2026,
  checked: false,
  listId: "list-1",
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(verifySession).mockResolvedValue(SESSION);
});

// ---------------------------------------------------------------------------
// createList
// ---------------------------------------------------------------------------

describe("createList", () => {
  it("creates a list and adds the owner as a member", async () => {
    vi.mocked(prisma.list.create).mockResolvedValue(fakeList);

    await createList("Home");

    expect(vi.mocked(prisma.list.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Home",
          ownerId: "user-1",
          members: { create: { userId: "user-1" } },
        }),
      })
    );
  });

  it("throws on empty name", async () => {
    await expect(createList("")).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// updateList
// ---------------------------------------------------------------------------

describe("updateList", () => {
  it("updates the name when called by the owner", async () => {
    vi.mocked(prisma.list.findUnique).mockResolvedValue(fakeList);

    await updateList("list-1", "Renamed");

    expect(vi.mocked(prisma.list.update)).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "list-1" }, data: { name: "Renamed" } })
    );
  });

  it("throws when called by a non-owner", async () => {
    vi.mocked(prisma.list.findUnique).mockResolvedValue({ ...fakeList, ownerId: "other-user" });

    await expect(updateList("list-1", "Renamed")).rejects.toThrow("No tenés permiso para realizar esta acción.");
  });
});

// ---------------------------------------------------------------------------
// deleteList
// ---------------------------------------------------------------------------

describe("deleteList", () => {
  it("deletes the list when called by the owner", async () => {
    vi.mocked(prisma.list.findUnique).mockResolvedValue(fakeList);

    await deleteList("list-1");

    expect(vi.mocked(prisma.list.delete)).toHaveBeenCalledWith({ where: { id: "list-1" } });
  });

  it("throws when called by a non-owner", async () => {
    vi.mocked(prisma.list.findUnique).mockResolvedValue({ ...fakeList, ownerId: "other-user" });

    await expect(deleteList("list-1")).rejects.toThrow("No tenés permiso para realizar esta acción.");
  });

  it("throws when the list does not exist", async () => {
    vi.mocked(prisma.list.findUnique).mockResolvedValue(null);

    await expect(deleteList("list-1")).rejects.toThrow("No tenés permiso para realizar esta acción.");
  });
});

// ---------------------------------------------------------------------------
// getUserLists
// ---------------------------------------------------------------------------

describe("getUserLists", () => {
  it("returns lists where the user is a member", async () => {
    const lists = [{ ...fakeList, owner: { name: "Alice" }, _count: { members: 1, items: 3 } }];
    vi.mocked(prisma.list.findMany).mockResolvedValue(lists as never);

    const result = await getUserLists();

    expect(vi.mocked(prisma.list.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { members: { some: { userId: "user-1" } } },
      })
    );
    expect(result).toEqual(lists);
  });
});

// ---------------------------------------------------------------------------
// getListItems
// ---------------------------------------------------------------------------

describe("getListItems", () => {
  it("returns items for a list member", async () => {
    vi.mocked(prisma.listMember.findUnique).mockResolvedValue({ listId: "list-1", userId: "user-1", joinedAt: new Date() });
    vi.mocked(prisma.item.findMany).mockResolvedValue([fakeItem]);

    const result = await getListItems("list-1", 5, 2026);

    expect(result).toEqual([fakeItem]);
  });

  it("throws when the user is not a member", async () => {
    vi.mocked(prisma.listMember.findUnique).mockResolvedValue(null);

    await expect(getListItems("list-1", 5, 2026)).rejects.toThrow("No tenés permiso para realizar esta acción.");
  });
});

// ---------------------------------------------------------------------------
// addListItem
// ---------------------------------------------------------------------------

describe("addListItem", () => {
  it("creates an item using the session user's name as addedBy", async () => {
    vi.mocked(prisma.listMember.findUnique).mockResolvedValue({ listId: "list-1", userId: "user-1", joinedAt: new Date() });
    vi.mocked(prisma.user.findUniqueOrThrow).mockResolvedValue({ id: "user-1", name: "SessionUser" } as never);

    const fd = new FormData();
    fd.set("name", "Eggs");
    fd.set("month", "5");
    fd.set("year", "2026");

    await addListItem("list-1", fd);

    expect(vi.mocked(prisma.item.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "Eggs", addedBy: "SessionUser", listId: "list-1", month: 5, year: 2026 }),
      })
    );
  });

  it("falls back to current month/year when month/year are NaN", async () => {
    vi.mocked(prisma.listMember.findUnique).mockResolvedValue({ listId: "list-1", userId: "user-1", joinedAt: new Date() });
    vi.mocked(prisma.user.findUniqueOrThrow).mockResolvedValue({ id: "user-1", name: "SessionUser" } as never);

    const fd = new FormData();
    fd.set("name", "Eggs");
    fd.set("month", "abc");
    fd.set("year", "xyz");

    await addListItem("list-1", fd);

    const now = new Date();
    expect(vi.mocked(prisma.item.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          month: now.getMonth() + 1,
          year: now.getFullYear(),
        }),
      })
    );
  });

  it("falls back to current month/year when month is out of range", async () => {
    vi.mocked(prisma.listMember.findUnique).mockResolvedValue({ listId: "list-1", userId: "user-1", joinedAt: new Date() });
    vi.mocked(prisma.user.findUniqueOrThrow).mockResolvedValue({ id: "user-1", name: "SessionUser" } as never);

    const fd = new FormData();
    fd.set("name", "Eggs");
    fd.set("month", "13");
    fd.set("year", "1999");

    await addListItem("list-1", fd);

    const now = new Date();
    expect(vi.mocked(prisma.item.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          month: now.getMonth() + 1,
          year: now.getFullYear(),
        }),
      })
    );
  });

  it("ignores any addedBy supplied in the form and uses the session name instead", async () => {
    vi.mocked(prisma.listMember.findUnique).mockResolvedValue({ listId: "list-1", userId: "user-1", joinedAt: new Date() });
    vi.mocked(prisma.user.findUniqueOrThrow).mockResolvedValue({ id: "user-1", name: "RealUser" } as never);

    const fd = new FormData();
    fd.set("name", "Milk");
    fd.set("addedBy", "Admin");
    fd.set("month", "5");
    fd.set("year", "2026");

    await addListItem("list-1", fd);

    expect(vi.mocked(prisma.item.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ addedBy: "RealUser" }),
      })
    );
  });

  it("returns early without creating when quantity exceeds 50 characters", async () => {
    vi.mocked(prisma.listMember.findUnique).mockResolvedValue({ listId: "list-1", userId: "user-1", joinedAt: new Date() });

    const fd = new FormData();
    fd.set("name", "Eggs");
    fd.set("quantity", "a".repeat(51));
    fd.set("month", "5");
    fd.set("year", "2026");

    await addListItem("list-1", fd);

    expect(vi.mocked(prisma.item.create)).not.toHaveBeenCalled();
  });

  it("accepts quantity at exactly 50 characters", async () => {
    vi.mocked(prisma.listMember.findUnique).mockResolvedValue({ listId: "list-1", userId: "user-1", joinedAt: new Date() });
    vi.mocked(prisma.user.findUniqueOrThrow).mockResolvedValue({ id: "user-1", name: "SessionUser" } as never);

    const fd = new FormData();
    fd.set("name", "Eggs");
    fd.set("quantity", "a".repeat(50));
    fd.set("month", "5");
    fd.set("year", "2026");

    await addListItem("list-1", fd);

    expect(vi.mocked(prisma.item.create)).toHaveBeenCalled();
  });

  it("throws when the user is not a member", async () => {
    vi.mocked(prisma.listMember.findUnique).mockResolvedValue(null);

    const fd = new FormData();
    fd.set("name", "Eggs");
    fd.set("month", "5");
    fd.set("year", "2026");

    await expect(addListItem("list-1", fd)).rejects.toThrow("No tenés permiso para realizar esta acción.");
  });
});

// ---------------------------------------------------------------------------
// toggleListItem
// ---------------------------------------------------------------------------

describe("toggleListItem", () => {
  it("calls update with compound where { id, listId }", async () => {
    vi.mocked(prisma.listMember.findUnique).mockResolvedValue({ listId: "list-1", userId: "user-1", joinedAt: new Date() });
    vi.mocked(prisma.item.update).mockResolvedValue({ ...fakeItem, checked: true });

    await toggleListItem("list-1", "item-1", true);

    expect(vi.mocked(prisma.item.update)).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "item-1", listId: "list-1" } })
    );
  });

  it("throws when the user is not a member", async () => {
    vi.mocked(prisma.listMember.findUnique).mockResolvedValue(null);

    await expect(toggleListItem("list-1", "item-1", true)).rejects.toThrow("No tenés permiso para realizar esta acción.");
    expect(vi.mocked(prisma.item.update)).not.toHaveBeenCalled();
  });

  it("propagates P2025 when the item belongs to a different list", async () => {
    vi.mocked(prisma.listMember.findUnique).mockResolvedValue({ listId: "list-1", userId: "user-1", joinedAt: new Date() });
    const p2025 = Object.assign(new Error("Record not found"), { code: "P2025" });
    vi.mocked(prisma.item.update).mockRejectedValue(p2025);

    await expect(toggleListItem("list-1", "item-from-list-2", true)).rejects.toMatchObject({ code: "P2025" });
  });
});

// ---------------------------------------------------------------------------
// deleteListItem
// ---------------------------------------------------------------------------

describe("deleteListItem", () => {
  it("calls delete with compound where { id, listId }", async () => {
    vi.mocked(prisma.listMember.findUnique).mockResolvedValue({ listId: "list-1", userId: "user-1", joinedAt: new Date() });
    vi.mocked(prisma.item.delete).mockResolvedValue(fakeItem);

    await deleteListItem("list-1", "item-1");

    expect(vi.mocked(prisma.item.delete)).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "item-1", listId: "list-1" } })
    );
  });

  it("throws when the user is not a member", async () => {
    vi.mocked(prisma.listMember.findUnique).mockResolvedValue(null);

    await expect(deleteListItem("list-1", "item-1")).rejects.toThrow("No tenés permiso para realizar esta acción.");
    expect(vi.mocked(prisma.item.delete)).not.toHaveBeenCalled();
  });

  it("propagates P2025 when the item belongs to a different list", async () => {
    vi.mocked(prisma.listMember.findUnique).mockResolvedValue({ listId: "list-1", userId: "user-1", joinedAt: new Date() });
    const p2025 = Object.assign(new Error("Record not found"), { code: "P2025" });
    vi.mocked(prisma.item.delete).mockRejectedValue(p2025);

    await expect(deleteListItem("list-1", "item-from-list-2")).rejects.toMatchObject({ code: "P2025" });
  });
});

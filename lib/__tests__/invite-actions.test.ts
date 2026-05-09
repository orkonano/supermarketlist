import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../dal", () => ({ verifySession: vi.fn() }));
vi.mock("workflow/api", () => ({ start: vi.fn() }));
vi.mock("@/workflows/list-invite", () => ({ listInviteWorkflow: {} }));
vi.mock("crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("crypto")>();
  return { ...actual, randomBytes: vi.fn().mockReturnValue({ toString: () => "fixed-token-hex" }) };
});
vi.mock("../prisma", () => ({
  prisma: {
    listMember: { findUnique: vi.fn(), create: vi.fn() },
    listInvite: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    list: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { inviteToList, acceptInvite } from "../invite-actions";
import { verifySession } from "../dal";
import { prisma } from "../prisma";
import { start } from "workflow/api";

const SESSION = { isAuth: true as const, userId: "user-1" };

const fakeList = { id: "list-1", name: "Home", ownerId: "user-1" };
const fakeInviter = { name: "Alice" };
const fakeInvite = {
  id: "invite-1",
  listId: "list-1",
  email: "bob@example.com",
  invitedById: "user-1",
  token: "fixed-token-hex",
  accepted: false,
  expiresAt: new Date(Date.now() + 86400000),
  createdAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(verifySession).mockResolvedValue(SESSION);
});

// ---------------------------------------------------------------------------
// inviteToList
// ---------------------------------------------------------------------------

describe("inviteToList", () => {
  it("returns error when user is not the owner", async () => {
    vi.mocked(prisma.list.findUnique).mockResolvedValue({ ...fakeList, ownerId: "other-user" } as never);

    const result = await inviteToList("list-1", "bob@example.com");

    expect(result).toEqual({ error: "Solo el propietario de la lista puede invitar personas." });
    expect(vi.mocked(start)).not.toHaveBeenCalled();
  });

  it("returns error when list does not exist", async () => {
    vi.mocked(prisma.list.findUnique).mockResolvedValue(null);

    const result = await inviteToList("list-1", "bob@example.com");

    expect(result).toEqual({ error: "Solo el propietario de la lista puede invitar personas." });
  });

  it("returns error for invalid email", async () => {
    const result = await inviteToList("list-1", "not-an-email");

    expect(result).toEqual({ error: expect.stringContaining("correo electrónico válido") });
  });

  it("returns error when a pending invite already exists for the email", async () => {
    vi.mocked(prisma.list.findUnique).mockResolvedValue(fakeList as never);
    vi.mocked(prisma.listInvite.findFirst).mockResolvedValue(fakeInvite);

    const result = await inviteToList("list-1", "bob@example.com");

    expect(result).toEqual({ error: "Ya se envió una invitación a este correo electrónico." });
  });

  it("returns error when the invitee is already a member", async () => {
    vi.mocked(prisma.list.findUnique).mockResolvedValue(fakeList as never);
    vi.mocked(prisma.listInvite.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "user-2", name: "Bob", email: "bob@example.com" } as never);
    vi.mocked(prisma.listMember.findUnique).mockResolvedValue({ listId: "list-1", userId: "user-2", joinedAt: new Date() });

    const result = await inviteToList("list-1", "bob@example.com");

    expect(result).toEqual({ error: "Este usuario ya es miembro de la lista." });
  });

  it("creates invite and starts workflow on success", async () => {
    vi.mocked(prisma.list.findUnique).mockResolvedValue(fakeList as never);
    vi.mocked(prisma.listInvite.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce(null) // invitee lookup — not registered
      .mockResolvedValueOnce({ id: "user-1", name: "Alice", email: "alice@example.com" } as never); // inviter name
    vi.mocked(prisma.listInvite.create).mockResolvedValue(fakeInvite);

    const result = await inviteToList("list-1", "bob@example.com");

    expect(result).toEqual({ success: true });
    expect(vi.mocked(start)).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// acceptInvite
// ---------------------------------------------------------------------------

describe("acceptInvite", () => {
  it("returns error for an invalid token", async () => {
    vi.mocked(prisma.listInvite.findUnique).mockResolvedValue(null);

    const result = await acceptInvite("bad-token", "user-2");

    expect(result).toEqual({ error: "El enlace de invitación es inválido." });
  });

  it("returns error for an expired invite", async () => {
    vi.mocked(prisma.listInvite.findUnique).mockResolvedValue({
      ...fakeInvite,
      expiresAt: new Date(Date.now() - 1000),
    });

    const result = await acceptInvite("fixed-token-hex", "user-2");

    expect(result).toEqual({ error: "Esta invitación expiró." });
  });

  it("returns error when the user email does not match the invite email", async () => {
    vi.mocked(prisma.listInvite.findUnique).mockResolvedValue(fakeInvite);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "user-2", email: "different@example.com" } as never);

    const result = await acceptInvite("fixed-token-hex", "user-2");

    expect(result).toEqual({ error: "Esta invitación no corresponde a tu correo electrónico." });
    expect(vi.mocked(prisma.$transaction)).not.toHaveBeenCalled();
  });

  it("is idempotent when the invite is already accepted", async () => {
    vi.mocked(prisma.listInvite.findUnique).mockResolvedValue({ ...fakeInvite, accepted: true });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "user-2", email: "bob@example.com" } as never);

    const result = await acceptInvite("fixed-token-hex", "user-2");

    expect(result).toEqual({ listId: "list-1" });
    expect(vi.mocked(prisma.$transaction)).not.toHaveBeenCalled();
  });

  it("adds the user as a member and marks invite accepted on success", async () => {
    vi.mocked(prisma.listInvite.findUnique).mockResolvedValue(fakeInvite);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "user-2", email: "bob@example.com" } as never);
    vi.mocked(prisma.$transaction).mockResolvedValue([]);

    const result = await acceptInvite("fixed-token-hex", "user-2");

    expect(result).toEqual({ listId: "list-1" });
    expect(vi.mocked(prisma.$transaction)).toHaveBeenCalled();
  });
});

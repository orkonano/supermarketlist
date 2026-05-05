import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("bcryptjs", () => ({ default: { hash: vi.fn(), compare: vi.fn() } }));
vi.mock("workflow/api", () => ({ start: vi.fn() }));
vi.mock("@/workflows/email-verification", () => ({ emailVerificationWorkflow: {} }));
vi.mock("../invite-actions", () => ({ acceptInvite: vi.fn() }));
vi.mock("../session", () => ({ createSession: vi.fn(), deleteSession: vi.fn() }));
vi.mock("../prisma", () => ({
  prisma: { user: { findUnique: vi.fn(), create: vi.fn() } },
}));

import { signup, login, logout } from "../auth-actions";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "../prisma";
import { createSession, deleteSession } from "../session";
import { start } from "workflow/api";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const fakeUser = {
  id: "user-123",
  name: "Alice",
  email: "alice@example.com",
  hashedPassword: "$2a$10$fakehash",
  emailVerified: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const validSignupFields = { name: "Alice", email: "alice@example.com", password: "Password1" };
const validLoginFields  = { email: "alice@example.com", password: "Password1" };

function fd(fields: Record<string, string>): FormData {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  return form;
}

beforeEach(() => vi.clearAllMocks());

// ---------------------------------------------------------------------------
// signup
// ---------------------------------------------------------------------------

describe("signup", () => {
  describe("validation", () => {
    it("returns a name error for a too-short name", async () => {
      const result = await signup(undefined, fd({ ...validSignupFields, name: "A" }));
      expect(result?.errors?.name).toBeDefined();
      expect(vi.mocked(prisma.user.create)).not.toHaveBeenCalled();
    });

    it("returns an email error for an invalid email", async () => {
      const result = await signup(undefined, fd({ ...validSignupFields, email: "notanemail" }));
      expect(result?.errors?.email).toBeDefined();
      expect(vi.mocked(prisma.user.create)).not.toHaveBeenCalled();
    });

    it("returns a password error for a weak password", async () => {
      const result = await signup(undefined, fd({ ...validSignupFields, password: "weak" }));
      expect(result?.errors?.password).toBeDefined();
      expect(vi.mocked(prisma.user.create)).not.toHaveBeenCalled();
    });
  });

  it("returns an email error when the address is already registered", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(fakeUser);

    const result = await signup(undefined, fd(validSignupFields));

    expect(result?.errors?.email).toContain("An account with this email already exists.");
    expect(vi.mocked(prisma.user.create)).not.toHaveBeenCalled();
  });

  it("hashes the password with 10 salt rounds on success", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(bcrypt.hash).mockResolvedValue("hashed-pw" as never);
    vi.mocked(prisma.user.create).mockResolvedValue(fakeUser);

    await signup(undefined, fd(validSignupFields));

    expect(vi.mocked(bcrypt.hash)).toHaveBeenCalledWith("Password1", 10);
  });

  it("stores the hashed password (never the plaintext) on success", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(bcrypt.hash).mockResolvedValue("hashed-pw" as never);
    vi.mocked(prisma.user.create).mockResolvedValue(fakeUser);

    await signup(undefined, fd(validSignupFields));

    expect(vi.mocked(prisma.user.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Alice",
          email: "alice@example.com",
          hashedPassword: "hashed-pw",
        }),
      })
    );
  });

  it("creates a session, starts the verification workflow, and redirects on success", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(bcrypt.hash).mockResolvedValue("hashed-pw" as never);
    vi.mocked(prisma.user.create).mockResolvedValue(fakeUser);

    await signup(undefined, fd(validSignupFields));

    expect(vi.mocked(createSession)).toHaveBeenCalledWith(fakeUser.id);
    expect(vi.mocked(start)).toHaveBeenCalled();
    expect(vi.mocked(redirect)).toHaveBeenCalledWith("/lists");
  });
});

// ---------------------------------------------------------------------------
// login
// ---------------------------------------------------------------------------

describe("login", () => {
  describe("validation", () => {
    it("returns an email error for an invalid email", async () => {
      const result = await login(undefined, fd({ ...validLoginFields, email: "bad" }));
      expect(result?.errors?.email).toBeDefined();
      expect(vi.mocked(prisma.user.findUnique)).not.toHaveBeenCalled();
    });

    it("returns a password error for an empty password", async () => {
      const result = await login(undefined, fd({ ...validLoginFields, password: "" }));
      expect(result?.errors?.password).toBeDefined();
      expect(vi.mocked(prisma.user.findUnique)).not.toHaveBeenCalled();
    });
  });

  it("returns a generic error when the email is not registered", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const result = await login(undefined, fd(validLoginFields));

    expect(result?.message).toBe("Invalid email or password.");
    expect(vi.mocked(createSession)).not.toHaveBeenCalled();
  });

  it("returns the same generic error for a wrong password (no user enumeration)", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(fakeUser);
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    const result = await login(undefined, fd(validLoginFields));

    expect(result?.message).toBe("Invalid email or password.");
    expect(vi.mocked(createSession)).not.toHaveBeenCalled();
  });

  it("creates a session and redirects on correct credentials", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(fakeUser);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

    await login(undefined, fd(validLoginFields));

    expect(vi.mocked(bcrypt.compare)).toHaveBeenCalledWith("Password1", fakeUser.hashedPassword);
    expect(vi.mocked(createSession)).toHaveBeenCalledWith(fakeUser.id);
    expect(vi.mocked(redirect)).toHaveBeenCalledWith("/lists");
  });
});

// ---------------------------------------------------------------------------
// logout
// ---------------------------------------------------------------------------

describe("logout", () => {
  it("deletes the session and redirects to /login", async () => {
    await logout();

    expect(vi.mocked(deleteSession)).toHaveBeenCalled();
    expect(vi.mocked(redirect)).toHaveBeenCalledWith("/login");
  });
});

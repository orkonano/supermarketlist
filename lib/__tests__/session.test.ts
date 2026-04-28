import { vi, describe, it, expect } from "vitest";
import { SignJWT } from "jose";

// server-only throws outside a Next.js server context; next/headers requires
// the Next.js request scope. Both are mocked so we can import session.ts directly.
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));

import { encrypt, decrypt } from "../session";

// The key session.ts derives at import time from SESSION_SECRET (set in vitest.setup.ts).
const testKey = new TextEncoder().encode(process.env.SESSION_SECRET);

// ---------------------------------------------------------------------------
// encrypt / decrypt
// ---------------------------------------------------------------------------

describe("encrypt + decrypt round-trip", () => {
  it("returns the original userId and expiresAt", async () => {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const token = await encrypt({ userId: "user-abc", expiresAt });
    const payload = await decrypt(token);

    expect(payload?.userId).toBe("user-abc");
    // Dates survive JWT as numeric timestamps; compare loosely.
    expect(new Date(payload!.expiresAt).getTime()).toBeCloseTo(expiresAt.getTime(), -3);
  });

  it("produces a three-part JWT string", async () => {
    const token = await encrypt({ userId: "u1", expiresAt: new Date() });
    expect(token.split(".")).toHaveLength(3);
  });
});

describe("decrypt", () => {
  it("returns null for an empty string", async () => {
    expect(await decrypt("")).toBeNull();
  });

  it("returns null for undefined", async () => {
    expect(await decrypt(undefined)).toBeNull();
  });

  it("returns null for arbitrary garbage", async () => {
    expect(await decrypt("not.a.jwt.at.all")).toBeNull();
  });

  it("returns null for a token signed with a different key", async () => {
    const otherKey = new TextEncoder().encode("completely-different-secret-key!!");
    const token = await new SignJWT({ userId: "attacker", expiresAt: new Date() })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(otherKey);

    expect(await decrypt(token)).toBeNull();
  });

  it("returns null for an expired token", async () => {
    const token = await new SignJWT({ userId: "user-abc", expiresAt: new Date() })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(0) // expires at the same second it was issued
      .sign(testKey);

    expect(await decrypt(token)).toBeNull();
  });

  it("returns null for a structurally valid JWT with a tampered payload", async () => {
    const token = await encrypt({ userId: "user-abc", expiresAt: new Date() });
    const [header, , signature] = token.split(".");
    // Replace payload with a different base64url-encoded object.
    const fakePayload = Buffer.from(JSON.stringify({ userId: "admin" })).toString("base64url");
    const tampered = `${header}.${fakePayload}.${signature}`;

    expect(await decrypt(tampered)).toBeNull();
  });
});

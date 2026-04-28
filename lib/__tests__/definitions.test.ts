import { describe, it, expect } from "vitest";
import { SignupFormSchema, LoginFormSchema } from "../definitions";

// ---------------------------------------------------------------------------
// SignupFormSchema
// ---------------------------------------------------------------------------

describe("SignupFormSchema", () => {
  describe("name", () => {
    it("accepts a name with 2 or more characters", () => {
      const result = SignupFormSchema.safeParse(validSignup({ name: "Jo" }));
      expect(result.success).toBe(true);
    });

    it("rejects a name with fewer than 2 characters", () => {
      const result = SignupFormSchema.safeParse(validSignup({ name: "J" }));
      expect(result.success).toBe(false);
      expect(fieldErrors(result, "name")).toContain("Name must be at least 2 characters.");
    });

    it("rejects an empty name", () => {
      const result = SignupFormSchema.safeParse(validSignup({ name: "" }));
      expect(result.success).toBe(false);
    });

    it("returns a trimmed name on success", () => {
      const result = SignupFormSchema.safeParse(validSignup({ name: "  Alice  " }));
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.name).toBe("Alice");
    });
  });

  describe("email", () => {
    it("accepts a valid email address", () => {
      const result = SignupFormSchema.safeParse(validSignup({ email: "user@example.com" }));
      expect(result.success).toBe(true);
    });

    it("rejects a missing @ sign", () => {
      const result = SignupFormSchema.safeParse(validSignup({ email: "notanemail" }));
      expect(result.success).toBe(false);
      expect(fieldErrors(result, "email")).toContain("Please enter a valid email.");
    });

    it("rejects a missing domain", () => {
      const result = SignupFormSchema.safeParse(validSignup({ email: "user@" }));
      expect(result.success).toBe(false);
    });

    it("rejects an empty string", () => {
      const result = SignupFormSchema.safeParse(validSignup({ email: "" }));
      expect(result.success).toBe(false);
    });

    it("rejects email with surrounding whitespace (Zod v4: validators run before trim)", () => {
      const result = SignupFormSchema.safeParse(validSignup({ email: "  user@example.com  " }));
      expect(result.success).toBe(false);
      expect(fieldErrors(result, "email")).toContain("Please enter a valid email.");
    });
  });

  describe("password", () => {
    it("accepts a password meeting all requirements", () => {
      const result = SignupFormSchema.safeParse(validSignup({ password: "Password1" }));
      expect(result.success).toBe(true);
    });

    it("rejects a password shorter than 8 characters", () => {
      const result = SignupFormSchema.safeParse(validSignup({ password: "Pass1" }));
      expect(result.success).toBe(false);
      expect(fieldErrors(result, "password")).toContain("Must be at least 8 characters.");
    });

    it("accepts a password of exactly 8 characters", () => {
      const result = SignupFormSchema.safeParse(validSignup({ password: "Passw0rd" }));
      expect(result.success).toBe(true);
    });

    it("rejects a password with no letters", () => {
      const result = SignupFormSchema.safeParse(validSignup({ password: "12345678" }));
      expect(result.success).toBe(false);
      expect(fieldErrors(result, "password")).toContain("Must contain at least one letter.");
    });

    it("rejects a password with no numbers", () => {
      const result = SignupFormSchema.safeParse(validSignup({ password: "PasswordOnly" }));
      expect(result.success).toBe(false);
      expect(fieldErrors(result, "password")).toContain("Must contain at least one number.");
    });

    it("rejects an empty password", () => {
      const result = SignupFormSchema.safeParse(validSignup({ password: "" }));
      expect(result.success).toBe(false);
    });

    it("returns multiple errors when password fails multiple rules simultaneously", () => {
      // Too short AND no letter AND no number (only special chars)
      const result = SignupFormSchema.safeParse(validSignup({ password: "!!!!" }));
      expect(result.success).toBe(false);
      const errors = fieldErrors(result, "password");
      expect(errors).toContain("Must be at least 8 characters.");
      expect(errors).toContain("Must contain at least one letter.");
      expect(errors).toContain("Must contain at least one number.");
    });

    it("trims whitespace and returns the trimmed password", () => {
      const result = SignupFormSchema.safeParse(validSignup({ password: "  Password1  " }));
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.password).toBe("Password1");
    });
  });

  it("returns all field errors when all fields are invalid", () => {
    const result = SignupFormSchema.safeParse({ name: "A", email: "bad", password: "short" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors;
      expect(flat.name).toBeDefined();
      expect(flat.email).toBeDefined();
      expect(flat.password).toBeDefined();
    }
  });
});

// ---------------------------------------------------------------------------
// LoginFormSchema
// ---------------------------------------------------------------------------

describe("LoginFormSchema", () => {
  describe("email", () => {
    it("accepts a valid email", () => {
      const result = LoginFormSchema.safeParse({ email: "user@example.com", password: "any" });
      expect(result.success).toBe(true);
    });

    it("rejects an invalid email", () => {
      const result = LoginFormSchema.safeParse({ email: "notvalid", password: "any" });
      expect(result.success).toBe(false);
      expect(fieldErrors(result, "email")).toContain("Please enter a valid email.");
    });

    it("rejects an empty email", () => {
      const result = LoginFormSchema.safeParse({ email: "", password: "any" });
      expect(result.success).toBe(false);
    });

    it("rejects email with surrounding whitespace (Zod v4: validators run before trim)", () => {
      const result = LoginFormSchema.safeParse({ email: "  user@example.com  ", password: "any" });
      expect(result.success).toBe(false);
      expect(fieldErrors(result, "email")).toContain("Please enter a valid email.");
    });
  });

  describe("password", () => {
    it("accepts any non-empty password", () => {
      const result = LoginFormSchema.safeParse({ email: "user@example.com", password: "x" });
      expect(result.success).toBe(true);
    });

    it("rejects an empty password", () => {
      const result = LoginFormSchema.safeParse({ email: "user@example.com", password: "" });
      expect(result.success).toBe(false);
      expect(fieldErrors(result, "password")).toContain("Password is required.");
    });

    it("accepts a whitespace-only password (Zod v4: min(1) checks untrimmed length)", () => {
      // "   " has 3 chars pre-trim so passes min(1); trimmed data is "".
      // This documents a schema limitation: whitespace-only passwords are not rejected.
      const result = LoginFormSchema.safeParse({ email: "user@example.com", password: "   " });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.password).toBe("");
    });
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type AnyResult = ReturnType<typeof SignupFormSchema.safeParse> | ReturnType<typeof LoginFormSchema.safeParse>;

function fieldErrors(result: AnyResult, field: string): string[] {
  if (result.success) return [];
  const flat = result.error.flatten().fieldErrors as Record<string, string[] | undefined>;
  return flat[field] ?? [];
}

function validSignup(overrides: Partial<{ name: string; email: string; password: string }>) {
  return {
    name: "Alice",
    email: "alice@example.com",
    password: "Password1",
    ...overrides,
  };
}

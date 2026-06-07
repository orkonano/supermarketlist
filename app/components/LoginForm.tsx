"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login } from "@/lib/auth-actions";
import { buildInviteLink } from "@/lib/auth-utils";

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  color: "var(--text-primary)",
  background: "var(--surface-raised)",
  fontSize: "16px",
  outline: "none",
};

export default function LoginForm({ inviteToken }: { inviteToken?: string }) {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <form action={action} className="space-y-4">
      {inviteToken && <input type="hidden" name="inviteToken" value={inviteToken} />}

      {state?.message && (
        <p
          data-testid="form-error"
          className="text-sm px-3 py-2 rounded-lg"
          style={{ background: "var(--destructive-50)", color: "var(--destructive-500)" }}
        >
          {state.message}
        </p>
      )}

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium mb-1"
          style={{ color: "var(--text-secondary)" }}
        >
          Correo electrónico
        </label>
        <input
          id="email" name="email" type="email" autoComplete="email" required
          style={inputStyle}
        />
        {state?.errors?.email && (
          <p className="mt-1 text-xs" style={{ color: "var(--destructive-500)" }}>
            {state.errors.email[0]}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium mb-1"
          style={{ color: "var(--text-secondary)" }}
        >
          Contraseña
        </label>
        <input
          id="password" name="password" type="password" autoComplete="current-password" required
          style={inputStyle}
        />
        {state?.errors?.password && (
          <p className="mt-1 text-xs" style={{ color: "var(--destructive-500)" }}>
            {state.errors.password[0]}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full py-2.5 px-4 rounded-lg font-semibold transition-colors"
        style={{
          background: pending ? "var(--brand-400)" : "var(--brand-500)",
          color: "white",
          opacity: pending ? 0.7 : 1,
        }}
      >
        {pending ? "Ingresando…" : "Ingresar"}
      </button>

      <p className="text-center text-sm" style={{ color: "var(--text-secondary)" }}>
        ¿No tenés cuenta?{" "}
        <Link
          href={buildInviteLink("/signup", inviteToken)}
          className="font-medium hover:underline"
          style={{ color: "var(--brand-500)" }}
        >
          Registrate
        </Link>
      </p>
    </form>
  );
}

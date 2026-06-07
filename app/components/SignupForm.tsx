"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signup } from "@/lib/auth-actions";
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

export default function SignupForm({ inviteToken, inviteEmail }: { inviteToken?: string; inviteEmail?: string }) {
  const [state, action, pending] = useActionState(signup, undefined);

  return (
    <form action={action} className="space-y-4">
      {inviteToken && <input type="hidden" name="inviteToken" value={inviteToken} />}

      {state?.message && (
        <p
          className="text-sm px-3 py-2 rounded-lg"
          style={{ background: "var(--destructive-50)", color: "var(--destructive-500)" }}
        >
          {state.message}
        </p>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
          Nombre
        </label>
        <input
          id="name" name="name" type="text" autoComplete="name" required
          style={inputStyle}
        />
        {state?.errors?.name && (
          <p className="mt-1 text-xs" style={{ color: "var(--destructive-500)" }}>
            {state.errors.name[0]}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
          Correo electrónico
        </label>
        <input
          id="email" name="email" type="email" autoComplete="email" required
          defaultValue={inviteEmail}
          readOnly={!!inviteEmail}
          style={{
            ...inputStyle,
            ...(inviteEmail ? { background: "var(--surface-muted)", color: "var(--text-muted)" } : {}),
          }}
        />
        {state?.errors?.email && (
          <p className="mt-1 text-xs" style={{ color: "var(--destructive-500)" }}>
            {state.errors.email[0]}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
          Contraseña
        </label>
        <input
          id="password" name="password" type="password" autoComplete="new-password" required
          style={inputStyle}
        />
        {state?.errors?.password && (
          <ul className="mt-1 space-y-0.5">
            {state.errors.password.map((err) => (
              <li key={err} className="text-xs" style={{ color: "var(--destructive-500)" }}>- {err}</li>
            ))}
          </ul>
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
        {pending ? "Creando cuenta…" : "Crear cuenta"}
      </button>

      <p className="text-center text-sm" style={{ color: "var(--text-secondary)" }}>
        ¿Ya tenés cuenta?{" "}
        <Link
          href={buildInviteLink("/login", inviteToken)}
          className="font-medium hover:underline"
          style={{ color: "var(--brand-500)" }}
        >
          Ingresá
        </Link>
      </p>
    </form>
  );
}

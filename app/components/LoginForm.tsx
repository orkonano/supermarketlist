"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login } from "@/lib/auth-actions";
import { buildInviteLink } from "@/lib/auth-utils";
import { FormMessage, FormField, FieldError, SubmitButton, formInputStyle } from "./form-helpers";

export default function LoginForm({ inviteToken }: { inviteToken?: string }) {
  const [state, action, pending] = useActionState(login, undefined);
  const errors = state?.errors;

  return (
    <form action={action} className="space-y-4">
      {inviteToken && <input type="hidden" name="inviteToken" value={inviteToken} />}

      <FormMessage message={state?.message} testId="form-error" />

      <FormField id="email" label="Correo electrónico">
        <input id="email" name="email" type="email" autoComplete="email" required style={formInputStyle} />
        <FieldError errors={errors?.email} />
      </FormField>

      <FormField id="password" label="Contraseña">
        <input
          id="password" name="password" type="password" autoComplete="current-password" required
          style={formInputStyle}
        />
        <FieldError errors={errors?.password} />
      </FormField>

      <SubmitButton pending={pending} idleLabel="Ingresar" pendingLabel="Ingresando…" />

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

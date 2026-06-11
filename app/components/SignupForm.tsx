"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signup } from "@/lib/auth-actions";
import { buildInviteLink } from "@/lib/auth-utils";
import { FormMessage, FormField, FieldError, FieldErrorList, SubmitButton, formInputStyle } from "./form-helpers";

export default function SignupForm({ inviteToken, inviteEmail }: { inviteToken?: string; inviteEmail?: string }) {
  const [state, action, pending] = useActionState(signup, undefined);
  const errors = state?.errors;
  const readOnlyStyle = inviteEmail ? { background: "var(--surface-muted)", color: "var(--text-muted)" } : {};

  return (
    <form action={action} className="space-y-4">
      {inviteToken && <input type="hidden" name="inviteToken" value={inviteToken} />}

      <FormMessage message={state?.message} />

      <FormField id="name" label="Nombre">
        <input id="name" name="name" type="text" autoComplete="name" required style={formInputStyle} />
        <FieldError errors={errors?.name} />
      </FormField>

      <FormField id="email" label="Correo electrónico">
        <input
          id="email" name="email" type="email" autoComplete="email" required
          defaultValue={inviteEmail}
          readOnly={!!inviteEmail}
          style={{ ...formInputStyle, ...readOnlyStyle }}
        />
        <FieldError errors={errors?.email} />
      </FormField>

      <FormField id="password" label="Contraseña">
        <input
          id="password" name="password" type="password" autoComplete="new-password" required
          style={formInputStyle}
        />
        <FieldErrorList errors={errors?.password} />
      </FormField>

      <SubmitButton pending={pending} idleLabel="Crear cuenta" pendingLabel="Creando cuenta…" />

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

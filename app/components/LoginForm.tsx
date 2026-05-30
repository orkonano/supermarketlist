"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login } from "@/lib/auth-actions";
import { buildInviteLink } from "@/lib/auth-utils";

export default function LoginForm({ inviteToken }: { inviteToken?: string }) {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <form action={action} className="space-y-4">
      {inviteToken && <input type="hidden" name="inviteToken" value={inviteToken} />}

      {state?.message && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{state.message}</p>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
        <input
          id="email" name="email" type="email" autoComplete="email" required
          className="w-full px-3 py-2.5 border border-gray-300 rounded-md shadow-sm text-gray-900 text-base placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {state?.errors?.email && <p className="mt-1 text-xs text-red-600">{state.errors.email[0]}</p>}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
        <input
          id="password" name="password" type="password" autoComplete="current-password" required
          className="w-full px-3 py-2.5 border border-gray-300 rounded-md shadow-sm text-gray-900 text-base placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {state?.errors?.password && <p className="mt-1 text-xs text-red-600">{state.errors.password[0]}</p>}
      </div>

      <button
        type="submit" disabled={pending}
        className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-md transition-colors"
      >
        {pending ? "Ingresando…" : "Ingresar"}
      </button>

      <p className="text-center text-sm text-gray-600">
        ¿No tenés cuenta?{" "}
        <Link href={buildInviteLink("/signup", inviteToken)} className="text-blue-600 hover:underline font-medium">
          Registrate
        </Link>
      </p>
    </form>
  );
}

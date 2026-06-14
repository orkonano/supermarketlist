import type { CSSProperties, ReactNode } from "react";

const DESTRUCTIVE = "var(--destructive-500)";

export const formInputStyle: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  color: "var(--text-primary)",
  background: "var(--surface-raised)",
  fontSize: "16px",
  outline: "none",
};

export function FormMessage({ message, testId }: { message?: string; testId?: string }) {
  if (!message) return null;
  return (
    <p
      data-testid={testId}
      className="text-sm px-3 py-2 rounded-lg"
      style={{ background: "var(--destructive-50)", color: DESTRUCTIVE }}
    >
      {message}
    </p>
  );
}

export function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.[0]) return null;
  return (
    <p className="mt-1 text-xs" style={{ color: DESTRUCTIVE }}>
      {errors[0]}
    </p>
  );
}

export function FieldErrorList({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <ul className="mt-1 space-y-0.5">
      {errors.map((err) => (
        <li key={err} className="text-xs" style={{ color: DESTRUCTIVE }}>
          - {err}
        </li>
      ))}
    </ul>
  );
}

export function SubmitButton({
  pending,
  idleLabel,
  pendingLabel,
}: {
  pending: boolean;
  idleLabel: string;
  pendingLabel: string;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className={`w-full py-2.5 px-4 rounded-lg font-semibold text-white transition-colors ${
        pending ? "bg-[var(--brand-400)]" : "bg-[var(--brand-500)] hover:bg-[var(--brand-600)]"
      }`}
      style={{ opacity: pending ? 0.7 : 1 }}
    >
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}

export function FormField({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

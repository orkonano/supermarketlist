import type { ReactNode } from "react";

export default function SectionCard({
  title,
  className = "",
  children,
}: {
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`border p-5 ${className}`}
      style={{
        background: "var(--surface-raised)",
        borderColor: "var(--border)",
        borderRadius: "var(--radius-lg)",
      }}
    >
      <h2
        className="text-xs font-semibold uppercase tracking-wider mb-4"
        style={{ color: "var(--text-muted)" }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

import Link from "next/link";

export default function PageHeader({
  backHref,
  backLabel,
  title,
  className = "mb-8",
}: {
  backHref: string;
  backLabel: string;
  title: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Link
        href={backHref}
        className="text-sm transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      >
        ← {backLabel}
      </Link>
      <span style={{ color: "var(--border-strong)" }}>/</span>
      <h1
        className="text-2xl font-bold"
        style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
      >
        {title}
      </h1>
    </div>
  );
}

import Link from "next/link";
import { logout } from "@/lib/auth-actions";

type Props = {
  userName: string;
  children: React.ReactNode;
};

export default function AppShell({ userName, children }: Props) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--surface)" }}>
      <header
        className="sticky top-0 z-40 border-b"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "color-mix(in oklch, var(--surface-raised) 80%, transparent)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            href="/lists"
            className="text-xl font-bold tracking-tight"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--brand-600)",
            }}
          >
            Súper
          </Link>

          <nav className="flex items-center gap-1">
            <span
              className="text-sm mr-3"
              style={{ color: "var(--text-muted)" }}
            >
              {userName}
            </span>
            <Link
              href="/settings/api-keys"
              className="text-xs px-2 py-1.5 rounded-md transition-colors"
              style={{ color: "var(--text-secondary)" }}
            >
              API Keys
            </Link>
            <form action={logout} className="inline">
              <button
                type="submit"
                className="text-xs px-2 py-1.5 rounded-md transition-colors"
                style={{ color: "var(--text-muted)" }}
              >
                Cerrar sesión
              </button>
            </form>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}

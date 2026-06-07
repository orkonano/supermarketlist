import { verifySession, getCurrentUser } from "@/lib/dal";
import AppShell from "@/app/components/AppShell";
import NewListForm from "./NewListForm";

export default async function NewListPage() {
  const session = await verifySession();
  const user = await getCurrentUser(session.userId);

  return (
    <AppShell userName={user?.name ?? ""}>
      <div className="flex items-start justify-center min-h-[calc(100vh-3.5rem)] px-4 pt-16 pb-8">
        <div
          className="w-full max-w-sm border"
          style={{
            background: "var(--surface-raised)",
            borderColor: "var(--border)",
            borderRadius: "var(--radius-xl)",
            padding: "2rem",
          }}
        >
          <h1
            className="text-2xl font-bold mb-1"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--text-primary)",
            }}
          >
            Nueva lista
          </h1>
          <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
            Dale un nombre para reconocerla fácilmente.
          </p>
          <NewListForm />
        </div>
      </div>
    </AppShell>
  );
}

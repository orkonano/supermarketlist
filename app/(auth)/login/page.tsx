import LoginForm from "@/app/components/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ inviteToken?: string }>;
}) {
  const { inviteToken } = await searchParams;

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--surface)" }}
    >
      <div
        className="w-full max-w-sm rounded-xl p-8 border"
        style={{
          background: "var(--surface-raised)",
          borderColor: "var(--border)",
          boxShadow: "0 1px 3px oklch(0% 0 0 / 0.08), 0 4px 12px oklch(0% 0 0 / 0.06)",
        }}
      >
        <div className="text-center mb-6">
          <div
            className="text-2xl font-bold mb-1"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
          >
            Bienvenido de nuevo
          </div>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {inviteToken
              ? "Iniciá sesión para aceptar la invitación"
              : "Iniciá sesión en tu lista del súper"}
          </p>
        </div>
        <LoginForm inviteToken={inviteToken} />
      </div>
    </main>
  );
}

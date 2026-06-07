import SignupForm from "@/app/components/SignupForm";
import { prisma } from "@/lib/prisma";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ inviteToken?: string }>;
}) {
  const { inviteToken } = await searchParams;

  let inviteEmail: string | undefined;
  if (inviteToken) {
    const invite = await prisma.listInvite.findUnique({
      where: { token: inviteToken },
      select: { email: true, expiresAt: true, accepted: true },
    });
    if (invite && !invite.accepted && invite.expiresAt > new Date()) {
      inviteEmail = invite.email;
    }
  }

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
            Creá tu cuenta
          </div>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {inviteToken ? "Creá una cuenta para aceptar la invitación" : "Empezá a organizar tu lista del súper"}
          </p>
        </div>
        <SignupForm inviteToken={inviteToken} inviteEmail={inviteEmail} />
      </div>
    </main>
  );
}

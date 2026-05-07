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
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Creá tu cuenta</h1>
          <p className="text-gray-500 text-sm mt-1">
            {inviteToken ? "Creá una cuenta para aceptar la invitación" : "Empezá a organizar tu lista del súper"}
          </p>
        </div>
        <SignupForm inviteToken={inviteToken} inviteEmail={inviteEmail} />
      </div>
    </main>
  );
}

import SignupForm from "@/app/components/SignupForm";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ inviteToken?: string }>;
}) {
  const { inviteToken } = await searchParams;

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Create an account</h1>
          <p className="text-gray-500 text-sm mt-1">
            {inviteToken ? "Create an account to accept the invitation" : "Start managing your shopping list"}
          </p>
        </div>
        <SignupForm inviteToken={inviteToken} />
      </div>
    </main>
  );
}

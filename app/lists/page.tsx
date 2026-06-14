import Link from "next/link";
import { getUserLists } from "@/lib/list-actions";
import { verifySession, getCurrentUser } from "@/lib/dal";
import AppShell from "@/app/components/AppShell";
import ErrorBanner from "@/app/components/ErrorBanner";
import ListsCollection from "./ListsCollection";
import VerifyEmailNotice from "./VerifyEmailNotice";

export default async function ListsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const session = await verifySession();
  const [lists, user] = await Promise.all([
    getUserLists(),
    getCurrentUser(session.userId),
  ]);

  return (
    <AppShell userName={user?.name ?? ""}>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1
          className="text-3xl font-bold mb-8"
          style={{ color: "var(--text-primary)" }}
        >
          Mis listas
        </h1>

        {!user?.emailVerified && <VerifyEmailNotice />}

        <ErrorBanner message={params.error} />

        <ListsCollection lists={lists} currentUserId={session.userId} />

        <Link
          href="/lists/new"
          className="w-full flex items-center justify-center gap-2 font-semibold py-3 px-4 rounded-xl text-white transition-colors bg-[var(--brand-500)] hover:bg-[var(--brand-600)]"
        >
          <span className="text-xl leading-none">+</span>
          Nueva lista
        </Link>
      </div>
    </AppShell>
  );
}

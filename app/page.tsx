import { getItems } from "@/lib/actions";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { logout } from "@/lib/auth-actions";
import ShoppingList from "./components/ShoppingList";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const month = params.month ? parseInt(params.month) : now.getMonth() + 1;
  const year = params.year ? parseInt(params.year) : now.getFullYear();

  const session = await verifySession();
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { name: true },
  });

  const items = await getItems(month, year);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="text-center flex-1">
            <h1 className="text-3xl font-bold text-gray-900">Family Shopping List</h1>
            <p className="text-gray-500 mt-1">Add items your family needs</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-sm text-gray-600">Hi, {user?.name}</span>
            <form action={logout}>
              <button
                type="submit"
                className="text-xs text-gray-500 hover:text-red-600 underline transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
        <ShoppingList items={items} month={month} year={year} />
      </div>
    </main>
  );
}

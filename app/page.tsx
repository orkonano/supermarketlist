import { getItems } from "@/lib/actions";
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

  const items = await getItems(month, year);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Family Shopping List
          </h1>
          <p className="text-gray-500 mt-1">Add items your family needs</p>
        </div>
        <ShoppingList items={items} month={month} year={year} />
      </div>
    </main>
  );
}

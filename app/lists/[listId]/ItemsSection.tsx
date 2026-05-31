import { getListItems } from "@/lib/list-actions";
import ShoppingList from "@/app/components/ShoppingList";

type Props = {
  listId: string;
  month: number;
  year: number;
};

export default async function ItemsSection({ listId, month, year }: Props) {
  const items = await getListItems(listId, month, year);
  return <ShoppingList items={items} month={month} year={year} listId={listId} />;
}

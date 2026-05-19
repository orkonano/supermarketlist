"use server";

import { verifySession } from "./dal";
import { serviceGetItemPrices, type ItemPrices } from "./price-service";

export async function getItemPrices(listId: string, itemNames: string[]): Promise<ItemPrices> {
  const session = await verifySession();
  return serviceGetItemPrices(listId, session.userId, itemNames);
}

import { apiRoute } from "@/lib/api-route";
import { serviceGetItemPrices } from "@/lib/price-service";

export const GET = apiRoute(async (req, { user }, { id }) => {
  const items = new URL(req.url).searchParams.getAll("items");
  if (items.length === 0) {
    return Response.json({ error: "Se requiere al menos un parámetro items." }, { status: 422 });
  }
  const prices = await serviceGetItemPrices(id, user.id, items);
  return Response.json(prices);
});

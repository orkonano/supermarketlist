import { z } from "zod";
import { apiRoute } from "@/lib/api-route";
import { serviceGetListItems, serviceAddListItem } from "@/lib/list-service";

const AddItemSchema = z.object({
  name: z.string().min(1),
  quantity: z.string().max(50).optional(),
  category: z.string().optional(),
});

export const GET = apiRoute(async (req, { user }, { id }) => {
  const url = new URL(req.url);
  const now = new Date();
  const rawMonth = parseInt(url.searchParams.get("month") ?? "", 10);
  const rawYear = parseInt(url.searchParams.get("year") ?? "", 10);
  const month = rawMonth >= 1 && rawMonth <= 12 ? rawMonth : now.getMonth() + 1;
  const year = rawYear >= 2000 && rawYear <= 2100 ? rawYear : now.getFullYear();

  const items = await serviceGetListItems(id, user.id, month, year);
  return Response.json(items);
});

export const POST = apiRoute(async (req, { user }, { id }) => {
  const body = await req.json().catch(() => ({}));
  const parsed = AddItemSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Datos del producto inválidos." }, { status: 422 });
  }

  const now = new Date();
  const item = await serviceAddListItem(id, user.id, `${user.name} (API)`, {
    name: parsed.data.name,
    quantity: parsed.data.quantity,
    category: parsed.data.category,
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  });

  return Response.json(item, { status: 201 });
});

import { z } from "zod";
import { apiRoute } from "@/lib/api-route";
import { serviceToggleListItem, serviceDeleteListItem, serviceUpdateListItem } from "@/lib/list-service";

const UpdateItemSchema = z.object({
  checked: z.boolean().optional(),
  name: z.string().min(1).optional(),
  quantity: z.string().max(50).nullable().optional(),
  category: z.string().nullable().optional(),
}).refine((d) => Object.keys(d).length > 0, { message: "Se requiere al menos un campo." });

export const PATCH = apiRoute(async (req, { user }, { id, itemId }) => {
  const body = await req.json().catch(() => ({}));
  const parsed = UpdateItemSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Datos inválidos." }, { status: 422 });
  }

  const { checked, ...fields } = parsed.data;
  if (checked !== undefined && Object.keys(fields).length === 0) {
    const item = await serviceToggleListItem(id, user.id, itemId, checked);
    return Response.json(item);
  }

  const item = await serviceUpdateListItem(id, user.id, itemId, parsed.data);
  return Response.json(item);
});

export const DELETE = apiRoute(async (_req, { user }, { id, itemId }) => {
  await serviceDeleteListItem(id, user.id, itemId);
  return new Response(null, { status: 204 });
});

import { z } from "zod";
import { apiRoute } from "@/lib/api-route";
import { serviceGetList, serviceUpdateList, serviceDeleteList } from "@/lib/list-service";

const RenameSchema = z.object({ name: z.string().min(1).max(100).trim() });

export const GET = apiRoute(async (_req, { user }, { id }) => {
  const list = await serviceGetList(id, user.id);
  if (!list) return Response.json({ error: "Lista no encontrada." }, { status: 404 });
  return Response.json(list);
});

export const PATCH = apiRoute(async (req, { user }, { id }) => {
  const body = await req.json().catch(() => ({}));
  const parsed = RenameSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Nombre inválido." }, { status: 422 });
  }
  await serviceUpdateList(id, user.id, parsed.data.name);
  return Response.json({ ok: true });
});

export const DELETE = apiRoute(async (_req, { user }, { id }) => {
  await serviceDeleteList(id, user.id);
  return new Response(null, { status: 204 });
});

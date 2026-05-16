import { z } from "zod";
import { apiRoute } from "@/lib/api-route";
import { serviceGetUserLists, serviceCreateList } from "@/lib/list-service";

const CreateListSchema = z.object({ name: z.string().min(1).max(100).trim() });

export const GET = apiRoute(async (_req, { user }) => {
  const lists = await serviceGetUserLists(user.id);
  return Response.json(lists);
});

export const POST = apiRoute(async (req, { user }) => {
  const body = await req.json().catch(() => ({}));
  const parsed = CreateListSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Nombre de lista inválido." }, { status: 422 });
  }
  const list = await serviceCreateList(user.id, parsed.data.name);
  return Response.json(list, { status: 201 });
});

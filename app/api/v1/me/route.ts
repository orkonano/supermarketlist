import { apiRoute } from "@/lib/api-route";

export const GET = apiRoute(async (_req, { user }) => {
  return Response.json({ id: user.id, name: user.name, email: user.email });
});

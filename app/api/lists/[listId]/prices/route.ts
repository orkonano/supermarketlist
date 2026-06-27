import { getOptionalSession } from "@/lib/dal";
import { serviceGetItemPrices } from "@/lib/price-service";
import { ServiceError } from "@/lib/errors";

export async function GET(req: Request, { params }: { params: Promise<{ listId: string }> }) {
  const session = await getOptionalSession();
  if (!session) return Response.json({ error: "No autorizado" }, { status: 401 });

  const { listId } = await params;
  const names = new URL(req.url).searchParams.getAll("name");

  if (names.length === 0) {
    return Response.json({ error: "Se requiere al menos un parámetro name." }, { status: 422 });
  }

  try {
    const prices = await serviceGetItemPrices(listId, session.userId, names);
    return Response.json(prices);
  } catch (e) {
    if (e instanceof ServiceError) {
      return Response.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}

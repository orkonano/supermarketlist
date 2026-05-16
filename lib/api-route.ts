import { ApiAuthError, withApiKey } from "./api-auth";
import { ServiceError } from "./errors";
import type { User } from "../app/generated/prisma";

type ApiAuth = { user: User; keyId: string };
type ApiContext = { params: Promise<Record<string, string>> };
type ApiHandler = (req: Request, auth: ApiAuth, params: Record<string, string>) => Promise<Response>;

export function apiRoute(handler: ApiHandler) {
  return async (req: Request, context?: ApiContext) => {
    try {
      const auth = await withApiKey(req);
      const params = context?.params ? await context.params : {};
      return await handler(req, auth, params);
    } catch (e) {
      if (e instanceof ApiAuthError) {
        return Response.json({ error: "No autorizado" }, { status: 401 });
      }
      if (e instanceof ServiceError) {
        return Response.json({ error: e.message }, { status: e.status });
      }
      throw e;
    }
  };
}

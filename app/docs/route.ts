import { ApiReference } from "@scalar/nextjs-api-reference";

export function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  return ApiReference({
    spec: { url: "/openapi.yaml" },
    ...(token && {
      authentication: {
        preferredSecurityScheme: "bearerAuth",
        securitySchemes: {
          bearerAuth: { token },
        },
      },
    }),
  })();
}

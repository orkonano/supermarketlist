import { resumeHook } from "workflow/api";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return Response.redirect(new URL("/?error=missing-token", req.url));
  }

  try {
    await resumeHook(token, { verified: true as const });
    return Response.redirect(new URL("/?verified=1", req.url));
  } catch {
    return Response.redirect(new URL("/?error=invalid-token", req.url));
  }
}

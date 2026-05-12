import { resumeHook } from "workflow/api";
import { prisma } from "@/lib/prisma";

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
    // The hook is gone after the workflow completes. If the user is already
    // verified, silently send them to login instead of showing an error.
    const userId = token.startsWith("email-verify:")
      ? token.slice("email-verify:".length)
      : null;

    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { emailVerified: true },
      });
      if (user?.emailVerified) {
        return Response.redirect(new URL("/login", req.url));
      }
    }

    return Response.redirect(new URL("/?error=invalid-token", req.url));
  }
}

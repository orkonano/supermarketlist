import { NextRequest, NextResponse } from "next/server";
import { decrypt, encrypt, sessionCookieOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { SESSION_DURATION_MS } from "@/lib/constants/time";

const protectedRoutes: string[] = ["/settings/api-keys"];
const publicRoutes = ["/", "/login", "/signup"];

function matchesRoute(path: string, route: string): boolean {
  return path === route || path.startsWith(route + "/");
}

async function refreshSessionCookie(res: NextResponse, userId: string) {
  const newExpiry = new Date(Date.now() + SESSION_DURATION_MS);
  const refreshed = await encrypt({ userId, expiresAt: newExpiry });
  res.cookies.set("session", refreshed, sessionCookieOptions(newExpiry));
}

export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isProtectedRoute = protectedRoutes.some((r) => matchesRoute(path, r));
  const isPublicRoute = publicRoutes.includes(path);

  const cookie = (await cookies()).get("session")?.value;
  const session = await decrypt(cookie);
  const userId = session?.userId;

  if (isProtectedRoute && !userId) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (isPublicRoute && userId) {
    return NextResponse.redirect(new URL("/lists", req.nextUrl));
  }

  const res = NextResponse.next();

  if (userId && cookie) {
    await refreshSessionCookie(res, userId);
  }

  return res;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|.*\\.png$|\\.well-known/workflow/).*)"},
  ],
};

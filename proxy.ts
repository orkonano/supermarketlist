import { NextRequest, NextResponse } from "next/server";
import { decrypt, encrypt, sessionCookieOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { SESSION_DURATION_MS } from "@/lib/constants/time";

const protectedRoutes: string[] = ["/settings/api-keys"];
const publicRoutes = ["/", "/login", "/signup"];

export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isProtectedRoute = protectedRoutes.some((r) => path === r || path.startsWith(r + "/"));
  const isPublicRoute = publicRoutes.includes(path);

  const cookie = (await cookies()).get("session")?.value;
  const session = await decrypt(cookie);

  if (isProtectedRoute && !session?.userId) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (isPublicRoute && session?.userId) {
    return NextResponse.redirect(new URL("/lists", req.nextUrl));
  }

  const res = NextResponse.next();

  if (session?.userId && cookie) {
    const newExpiry = new Date(Date.now() + SESSION_DURATION_MS);
    const refreshed = await encrypt({ userId: session.userId, expiresAt: newExpiry });
    res.cookies.set("session", refreshed, sessionCookieOptions(newExpiry));
  }

  return res;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|.*\\.png$|\\.well-known/workflow/).*)"},
  ],
};

// Route protection. /app/* and /admin/* require a fully authenticated
// session (stage "full", i.e. past 2FA when enabled). Signed-in users are
// bounced away from the auth pages. Role authority is re-checked server-side
// in the admin layout — this gate is for routing UX, not the last line of
// defence.

import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "gf_session";

type TokenInfo = { role: string; stage: string } | null;

async function readSession(request: NextRequest): Promise<TokenInfo> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const secret = process.env.AUTH_SECRET;
  if (!token || !secret) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    if (
      (payload.role !== "ADMIN" && payload.role !== "USER") ||
      (payload.stage !== "full" && payload.stage !== "2fa")
    ) {
      return null;
    }
    return { role: payload.role, stage: payload.stage };
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await readSession(request);
  const isFull = session !== null && session.stage === "full";

  const wantsApp = pathname === "/app" || pathname.startsWith("/app/");
  const wantsAdmin = pathname === "/admin" || pathname.startsWith("/admin/");

  if (wantsApp || wantsAdmin) {
    if (!isFull) {
      const url = new URL("/signin", request.url);
      return NextResponse.redirect(url);
    }
    if (wantsAdmin && session.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/app", request.url));
    }
    return NextResponse.next();
  }

  // Auth pages: a fully signed-in user goes straight to the app. The 2FA page
  // must stay reachable for half-authenticated sessions.
  if (isFull && (pathname === "/signin" || pathname === "/signup")) {
    const target = session.role === "ADMIN" ? "/admin" : "/app";
    return NextResponse.redirect(new URL(target, request.url));
  }
  if (pathname === "/signin/2fa" && session === null) {
    return NextResponse.redirect(new URL("/signin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/admin/:path*", "/signin", "/signup", "/signin/2fa"],
};

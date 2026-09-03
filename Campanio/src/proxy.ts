import { NextRequest, NextResponse } from "next/server";

/**
 * Companio Route Protection Proxy (Next.js 16)
 * - Guards /home/*, /settings, /emergency behind active session cookies.
 * - Works with both Supabase Auth tokens and guest mode session cookies.
 * - Automatically redirects authenticated users away from /sign-in and /create-account.
 */

const PROTECTED_PREFIXES = ["/home", "/settings", "/emergency"];
const AUTH_ROUTES = ["/sign-in", "/create-account"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Extract all potential session identifiers
  const sbAccessToken = request.cookies.get("sb-access-token")?.value;
  const sbAuthToken = request.cookies.get("sb-auth-token")?.value;
  const companioSession = request.cookies.get("companio-session")?.value;
  
  // Extract any dynamic Supabase project cookie: sb-<project-ref>-auth-token
  const allCookieNames = request.cookies.getAll().map((c) => c.name);
  const hasDynamicSbCookie = allCookieNames.some(
    (name) => name.startsWith("sb-") && name.endsWith("-auth-token")
  );

  const isAuthenticated = Boolean(
    sbAccessToken || sbAuthToken || companioSession || hasDynamicSbCookie
  );

  // Check if route requires authentication
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (isProtected && !isAuthenticated) {
    const loginUrl = new URL("/sign-in", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from sign-in / signup to home
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - Public assets (icons, manifest, sw.js)
     * - API routes
     */
    "/((?!_next/static|_next/image|favicon|icons|manifest|sw\\.js|api/).*)",
  ],
};

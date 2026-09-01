import { NextRequest, NextResponse } from "next/server";

/**
 * Route protection middleware.
 * - /home/* and /settings pages require an active Supabase session cookie.
 * - All other routes are public.
 */

// Routes that require authentication
const PROTECTED_PREFIXES = ["/home", "/settings", "/emergency"];

// Routes that authenticated users should be redirected away from
const AUTH_ROUTES = ["/sign-in", "/create-account"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Read the Supabase session cookie (set by @supabase/ssr or auth-helpers)
  const sessionToken =
    request.cookies.get("sb-access-token")?.value ||
    request.cookies.get("sb-auth-token")?.value ||
    // Also check the newer Supabase cookie naming convention
    request.cookies.get(`sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split("//")[1]?.split(".")[0]}-auth-token`)?.value;

  const isAuthenticated = Boolean(sessionToken);

  // Redirect unauthenticated users away from protected routes
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (isProtected && !isAuthenticated) {
    const loginUrl = new URL("/sign-in", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth routes
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
     * - API routes (they have their own auth via rate-limit headers)
     */
    "/((?!_next/static|_next/image|favicon|icons|manifest|sw\\.js|api/).*)",
  ],
};

import { NextRequest, NextResponse } from "next/server";

// Nom du cookie défini par l'API Nest (AuthService): 'access_token'
const AUTH_COOKIE = "access_token";

// Routes publiques qui ne nécessitent pas d'être connecté
const PUBLIC_PATHS = [
  "/auth/signin",
  "/auth/register",
  "/auth/forgot_password",
  "/auth/verify-email",
];

function isPublicPath(pathname: string) {
  // Pages d'auth + fichiers statiques /api internes Next
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/api")) return true; // endpoints internes front
  if (
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/assets") ||
    pathname === "/file.svg"
  )
    return true;
  return false;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(AUTH_COOKIE)?.value;

  // Si utilisateur NON connecté et route protégée => redirection login
  if (!token && !isPublicPath(pathname)) {
    const loginUrl = new URL("/auth/signin", req.url);
    loginUrl.searchParams.set("from", pathname); // pour redirection après login
    return NextResponse.redirect(loginUrl);
  }

  // Si utilisateur connecté et tente d'aller sur les pages d'auth => rediriger vers home
  if (token && PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

// Appliquer le middleware à toutes les routes (on filtrera en code)
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

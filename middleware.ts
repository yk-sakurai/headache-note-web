import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/constants";

function isProtectedPath(pathname: string): boolean {
  if (pathname === "/home" || pathname.startsWith("/home/")) return true;
  return false;
}

function buildLoginRedirectURL(req: NextRequest): URL {
  const url = new URL("/login", req.url);
  const redirectPath = new URL(req.url).pathname + new URL(req.url).search;
  url.searchParams.set("redirect", redirectPath);
  return url;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) {
    return NextResponse.redirect(buildLoginRedirectURL(req));
  }

  try {
    const verifyUrl = new URL("/api/auth/verify-session", req.url);
    const res = await fetch(verifyUrl, {
      method: "GET",
      headers: {
        cookie: req.headers.get("cookie") ?? "",
      },
    });

    if (res.ok) {
      return NextResponse.next();
    }
  } catch {}

  return NextResponse.redirect(buildLoginRedirectURL(req));
}

export const config = {
  matcher: ["/home/:path*"],
};

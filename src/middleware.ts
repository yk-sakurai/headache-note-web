import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, WEB_BILLING_ENABLED } from "@/lib/constants";

function isProtectedPath(pathname: string): boolean {
  if (pathname === "/home" || pathname.startsWith("/home/")) return true;
  if (pathname === "/records" || pathname.startsWith("/records/")) return true;
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

  // Pricingページ: 一回だけのpricing_view記録用CookieセットとログAPI呼び出し
  // （Web 課金が無効な間はページ側でリダイレクトするため記録しない）
  if (pathname === "/pricing" && WEB_BILLING_ENABLED) {
    const pvCookieName = "pv_pricing";
    const hasPv = req.cookies.get(pvCookieName)?.value;
    const res = NextResponse.next();
    if (!hasPv) {
      // 24時間の記録済みCookieを付与
      res.cookies.set(pvCookieName, "1", {
        path: "/",
        maxAge: 60 * 60 * 24,
        sameSite: "lax",
      });
      // 監査ログをAPI経由で記録（失敗してもレスポンスは継続）
      try {
        const logUrl = new URL("/api/audit/pricing-view", req.url);
        await fetch(logUrl, { method: "POST" });
      } catch {}
    }
    return res;
  }

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
  matcher: ["/home", "/home/:path*", "/records", "/records/:path*", "/pricing"],
};

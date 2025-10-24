import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/admin";
import { SESSION_COOKIE_NAME } from "@/lib/constants";

export async function POST(_request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

    cookieStore.delete(SESSION_COOKIE_NAME);

    if (sessionCookie?.value) {
      try {
        const decodedClaims = await adminAuth.verifySessionCookie(
          sessionCookie.value,
          true
        );
        await adminAuth.revokeRefreshTokens(decodedClaims.uid);
      } catch (error) {
        console.warn("Failed to revoke refresh tokens:", error);
      }
    }

    return NextResponse.json(
      { message: "Logged out successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Session logout error:", error);
    
    return NextResponse.json(
      { message: "Logged out successfully" },
      { status: 200 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/admin";
import { SESSION_COOKIE_NAME, SESSION_DURATION_MS } from "@/lib/constants";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idToken } = body;

    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json(
        { error: "idToken is required" },
        { status: 400 }
      );
    }

    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_DURATION_MS,
    });

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DURATION_MS / 1000,
    });

    return NextResponse.json(
      { message: "Session created successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Session login error:", error);
    
    let errorMessage = "Failed to create session";
    if (error instanceof Error) {
      if (error.message.includes("expired")) {
        errorMessage = "Token has expired";
      } else if (error.message.includes("invalid")) {
        errorMessage = "Invalid token";
      }
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 401 }
    );
  }
}

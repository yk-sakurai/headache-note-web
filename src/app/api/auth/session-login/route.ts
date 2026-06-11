import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/admin";
import { APP_VERSION, SESSION_COOKIE_NAME, SESSION_DURATION_MS } from "@/lib/constants";
import {
  UserAppVersionRepository,
  UserRepository,
} from "@/lib/firestore/repositories/server";
import { detectOsFromUserAgent } from "@/lib/user-agent";

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

    const decodedToken = await adminAuth.verifyIdToken(idToken, true);

    if (decodedToken.email_verified !== true) {
      return NextResponse.json(
        { error: "Email is not verified", code: "email-not-verified" },
        { status: 403 }
      );
    }

    const email = typeof decodedToken.email === "string" ? decodedToken.email : "";
    const existingUser = await UserRepository.getUser(decodedToken.uid);

    if (!existingUser) {
      await UserRepository.createUser(decodedToken.uid, { email });
    } else {
      if (email) {
        await UserRepository.updateUser(decodedToken.uid, { email });
      }
      await UserRepository.updateLastLogin(decodedToken.uid);
    }

    try {
      await UserAppVersionRepository.upsert(decodedToken.uid, {
        currentVersion: APP_VERSION,
        platform: "web",
        osVersion: detectOsFromUserAgent(request.headers.get("user-agent")),
      });
    } catch (error) {
      console.warn("Failed to update user app version:", error);
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

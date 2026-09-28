import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/admin";
import { SESSION_COOKIE_NAME, WEB_WITHDRAWAL_ENABLED } from "@/lib/constants";
import { deleteUserAccountData } from "@/lib/firestore/delete-user";
import { SubscriptionRepository } from "@/lib/firestore/repositories/server";
import { isActiveSubscriber, isCancelScheduled } from "@/lib/firestore/helpers";

const RECENT_LOGIN_MAX_AGE_SECONDS = 5 * 60;
const PAID_PLAN_BLOCK_MESSAGE =
  "有料プランをご利用中です。先にプランの解約を行ってください。";
const WEB_WITHDRAWAL_DISABLED_MESSAGE =
  "退会はモバイルアプリから行ってください。";
const DELETE_FAILED_MESSAGE =
  "退会処理に失敗しました。時間をおいてもう一度お試しください。";
const INVALID_JSON_MESSAGE = "リクエストの形式が正しくありません。";
const REAUTH_REQUIRED_MESSAGE =
  "セッションの有効期限が切れています。もう一度ログインしてください。";
const REAUTH_REQUIRED_AUTH_ERROR_CODES = new Set([
  "auth/session-cookie-expired",
  "auth/session-cookie-revoked",
  "auth/id-token-expired",
  "auth/id-token-revoked",
  "auth/argument-error",
]);

function isReauthRequiredAuthError(error: unknown): boolean {
  const code = (error as { code?: unknown })?.code;
  return typeof code === "string" && REAUTH_REQUIRED_AUTH_ERROR_CODES.has(code);
}

export async function POST(request: NextRequest) {
  if (!WEB_WITHDRAWAL_ENABLED) {
    return NextResponse.json(
      { error: WEB_WITHDRAWAL_DISABLED_MESSAGE },
      { status: 403 }
    );
  }

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: INVALID_JSON_MESSAGE },
        { status: 400 }
      );
    }

    const idToken =
      typeof (body as { idToken?: unknown })?.idToken === "string"
        ? (body as { idToken: string }).idToken
        : "";

    if (!idToken) {
      return NextResponse.json(
        { error: "idToken が必要です。" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        { error: "ログイン状態を確認できませんでした。もう一度ログインしてください。" },
        { status: 401 }
      );
    }

    let session;
    try {
      session = await adminAuth.verifySessionCookie(sessionCookie, true);
    } catch (error) {
      if (isReauthRequiredAuthError(error)) {
        return NextResponse.json(
          { error: REAUTH_REQUIRED_MESSAGE },
          { status: 401 }
        );
      }
      throw error;
    }

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken, true);
    } catch (error) {
      if (isReauthRequiredAuthError(error)) {
        return NextResponse.json(
          { error: REAUTH_REQUIRED_MESSAGE },
          { status: 401 }
        );
      }
      throw error;
    }

    if (session.uid !== decodedToken.uid) {
      return NextResponse.json(
        { error: "ログイン状態が一致しません。もう一度ログインしてください。" },
        { status: 403 }
      );
    }

    const authTime = typeof decodedToken.auth_time === "number"
      ? decodedToken.auth_time
      : 0;
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (!authTime || nowSeconds - authTime > RECENT_LOGIN_MAX_AGE_SECONDS) {
      return NextResponse.json(
        { error: "安全のため、もう一度パスワードを入力してください。" },
        { status: 401 }
      );
    }

    const subscription = await SubscriptionRepository.getSubscription(session.uid);
    if (isActiveSubscriber(subscription) && !isCancelScheduled(subscription)) {
      return NextResponse.json(
        { error: PAID_PLAN_BLOCK_MESSAGE },
        { status: 403 }
      );
    }

    await deleteUserAccountData(session.uid);

    try {
      await adminAuth.deleteUser(session.uid);
    } catch (error) {
      if (
        typeof (error as { code?: string })?.code !== "string" ||
        (error as { code?: string }).code !== "auth/user-not-found"
      ) {
        throw error;
      }
    }

    cookieStore.delete(SESSION_COOKIE_NAME);

    return NextResponse.json(
      { message: "退会しました。" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Delete account error:", error);

    return NextResponse.json(
      { error: DELETE_FAILED_MESSAGE },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AuditLogRepository } from "@/lib/firestore/repositories/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { adminApp } from "@/lib/firebase/admin";
import { SESSION_COOKIE_NAME } from "@/lib/constants";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    let uid: string | undefined = undefined;

    if (sessionCookie) {
      try {
        const decoded = await getAuth(adminApp).verifySessionCookie(sessionCookie, true);
        uid = decoded.uid;
      } catch {}
    }
    const logData: any = {
      type: "pricing_view",
      route: "/pricing",
      ts: FieldValue.serverTimestamp() as unknown as any,
    };
    if (uid) {
      logData.uid = uid;
    }

    await AuditLogRepository.createLog(logData);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: "failed" }, { status: 500 });
  }
}

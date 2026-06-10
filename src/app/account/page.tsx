import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth } from "@/lib/firebase/admin";
import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { UserRepository } from "@/lib/firestore/repositories/server";
import ProfileMenu from "./ProfileMenu";

export default async function AccountPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  let uid: string | null = null;
  let verifiedEmail = "";
  try {
    if (sessionCookie) {
      // layout.tsx でも認証済みだが、プロフィール表示用に uid/email を取得する。
      const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
      uid = decoded.uid;
      verifiedEmail = typeof decoded.email === "string" ? decoded.email : "";
    }
  } catch {
    uid = null;
  }

  if (!uid) {
    redirect("/login");
  }

  const user = await UserRepository.getUser(uid);
  const email = user?.email || verifiedEmail;

  return <ProfileMenu email={email} />;
}

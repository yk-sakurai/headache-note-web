"use client";
import { useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signInWithEmailPassword, signOut } from "@/lib/firebase/auth.client";

function mapAuthErrorToMessage(code: string): string {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "メールアドレスまたはパスワードが正しくありません";
    case "auth/invalid-email":
      return "メールアドレスの形式が正しくありません";
    case "auth/user-disabled":
      return "このアカウントは無効化されています";
    case "auth/too-many-requests":
      return "リクエストが多すぎます。しばらくしてからお試しください";
    case "auth/network-request-failed":
      return "ネットワーク エラーが発生しました。接続をご確認ください";
    default:
      return "ログインに失敗しました。時間をおいて再度お試しください";
  }
}

async function safeSignOut() {
  try {
    await signOut();
  } catch {
    // セッション cookie 未作成時の導線表示を優先する。
  }
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get("redirect");
  const redirectTo = rawRedirect && rawRedirect.startsWith("/") ? rawRedirect : "/home";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setNeedsVerification(false);
    setLoading(true);
    try {
      const credential = await signInWithEmailPassword(email, password);
      const idToken = await credential.user.getIdToken();
      
      const response = await fetch("/api/auth/session-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        await safeSignOut();
        if (
          response.status === 403 &&
          body &&
          typeof body === "object" &&
          (body as { code?: unknown }).code === "email-not-verified"
        ) {
          setNeedsVerification(true);
          return;
        }
        throw new Error("Failed to create session");
      }

      router.replace(redirectTo);
    } catch (err: unknown) {
      const code = typeof (err as { code?: string })?.code === "string" ? ((err as { code?: string }).code ?? "") : "";
      setError(mapAuthErrorToMessage(code));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-xl font-semibold text-center">ログイン</h1>

        {error && (
          <div
            role="alert"
            className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2"
          >
            {error}
          </div>
        )}

        <div className="space-y-1">
          <label htmlFor="email" className="block text-sm">
            メールアドレス
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-blue-200"
            required
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="block text-sm">
            パスワード
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-blue-200"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-10 rounded bg-[color:var(--brand-primary)] text-[color:var(--brand-on-primary)] text-sm font-medium disabled:opacity-60"
        >
          {loading ? "送信中..." : "送信"}
        </button>

        {needsVerification && (
          <div
            role="alert"
            className="rounded border border-[color:var(--brand-mint-border)] bg-[color:var(--brand-primary-soft)] px-3 py-3 text-sm leading-6 text-[color:var(--text-primary)]"
          >
            <p>メールアドレスの確認が必要です。</p>
            <Link
              href="/resend-verification"
              className="mt-2 inline-block font-medium text-[color:var(--brand-primary-active)] hover:underline"
            >
              確認メールを再送する
            </Link>
          </div>
        )}

        <div className="flex flex-col items-center gap-3 text-center">
          <Link
            href="/password-reset"
            className="inline-block text-sm font-medium text-[color:var(--brand-primary-active)] hover:underline"
          >
            パスワードをお忘れですか？
          </Link>
          <Link
            href="/"
            className="inline-block text-sm text-[color:var(--brand-primary-active)] hover:underline"
          >
            ホームに戻る
          </Link>
        </div>
      </form>
    </div>
  );
}

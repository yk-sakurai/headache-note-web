"use client";
import { useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signInWithEmailPassword } from "@/lib/firebase/auth.client";

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

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get("redirect");
  const redirectTo = rawRedirect && rawRedirect.startsWith("/") ? rawRedirect : "/home";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInWithEmailPassword(email, password);
      
      const { getIdToken } = await import("@/lib/firebase/auth.client");
      const idToken = await getIdToken();
      
      const response = await fetch("/api/auth/session-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
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
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
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

        <div className="text-center">
          <Link
            href="/"
            className="inline-block text-sm text-color:white hover:underline"
          >
            ホームに戻る
          </Link>
        </div>
      </form>
    </div>
  );
}

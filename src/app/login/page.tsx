"use client";
import { FormEvent, Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { signInWithEmailPassword, signOut } from "@/lib/firebase/auth.client";
import { validatePassword } from "@/lib/validation/password";

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
      return "エラーが発生しました。しばらくしてからもう一度お試しください。";
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

// useSearchParams() を使うため、事前レンダリング時は Suspense で囲む必要がある
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get("redirect");
  const redirectTo = rawRedirect && rawRedirect.startsWith("/") ? rawRedirect : "/home";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [error, setError] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [loading, setLoading] = useState(false);
  const passwordError = useMemo(
    () => (passwordTouched ? validatePassword(password) : null),
    [password, passwordTouched]
  );

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setNeedsVerification(false);
    setPasswordTouched(true);

    if (validatePassword(password)) {
      return;
    }

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
    <main className="min-h-dvh bg-[color:var(--brand-mint-bg)] px-5 py-8 text-[color:var(--text-primary)] sm:px-6">
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-[520px] items-center justify-center">
        <form
          onSubmit={handleSubmit}
          className="w-full rounded-lg border border-[color:var(--brand-mint-border)] bg-[color:var(--surface)] px-5 py-7 shadow-[0_10px_30px_rgb(23_33_29_/_0.08)] sm:px-8 sm:py-8"
        >
          <div className="flex flex-col items-center text-center">
            <div className="flex items-center justify-center gap-3 text-[color:var(--brand-primary)]">
              <Image
                src="/brand/logo-mark.svg"
                alt=""
                width={44}
                height={44}
                className="h-10 w-10"
                priority
                aria-hidden="true"
              />
              <span className="text-2xl font-semibold">頭痛ノート</span>
            </div>
            <h1 className="mt-7 text-2xl font-semibold tracking-normal">
              ログイン
            </h1>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
            >
              {error}
            </div>
          )}

          <div className="mt-7 space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-semibold">
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 w-full rounded border border-[color:var(--border)] bg-white px-4 text-base text-[color:var(--text-primary)] outline-none calm-transition placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--brand-primary)] focus:ring-2 focus:ring-[color:var(--brand-primary-soft)]"
                placeholder="example@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-semibold">
                パスワード
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordTouched(true);
                }}
                onBlur={() => setPasswordTouched(true)}
                aria-invalid={passwordError ? "true" : "false"}
                aria-describedby={passwordError ? "password-error" : undefined}
                className="h-12 w-full rounded border border-[color:var(--border)] bg-white px-4 text-base text-[color:var(--text-primary)] outline-none calm-transition focus:border-[color:var(--brand-primary)] focus:ring-2 focus:ring-[color:var(--brand-primary-soft)] aria-[invalid=true]:border-red-300 aria-[invalid=true]:focus:ring-red-100"
                required
              />
              {passwordError && (
                <p id="password-error" className="text-sm leading-6 text-red-600">
                  {passwordError}
                </p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 flex h-12 w-full items-center justify-center rounded bg-[color:var(--brand-primary)] px-5 text-base font-semibold text-[color:var(--brand-on-primary)] calm-transition hover:bg-[color:var(--brand-primary-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-primary)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          >
            {loading ? "ログイン中..." : "ログイン"}
          </button>

          {needsVerification && (
            <div
              role="alert"
              className="mt-5 rounded-lg border border-[color:var(--brand-mint-border)] bg-[color:var(--brand-primary-soft)] px-4 py-4 text-sm leading-6 text-[color:var(--text-primary)]"
            >
              <p>メールアドレスの確認が済んでいません。</p>
              <p className="mt-1 text-[color:var(--text-secondary)]">
                登録時に届いた確認メールをご確認ください。
              </p>
            </div>
          )}

          <div className="mt-6 flex flex-col items-center gap-3 text-sm">
            <Link
              href="/password-reset"
              className="font-medium text-[color:var(--brand-primary-active)] underline-offset-4 calm-transition hover:underline"
            >
              パスワードをお忘れですか？
            </Link>
            <Link
              href="/signup"
              className="font-medium text-[color:var(--brand-primary-active)] underline-offset-4 calm-transition hover:underline"
            >
              ユーザー登録はこちら
            </Link>
            <Link
              href="/"
              className="font-medium text-[color:var(--brand-primary-active)] underline-offset-4 calm-transition hover:underline"
            >
              ホームに戻る
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}

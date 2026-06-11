"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  sendVerificationEmail,
  signInWithEmailPassword,
  signOut,
} from "@/lib/firebase/auth.client";

const RESEND_COOLDOWN_SECONDS = 30;
const GENERIC_ERROR =
  "送信できませんでした。入力内容をご確認のうえ、時間をおいて再度お試しください。";

export default function ResendVerificationPage() {
  const [view, setView] = useState<"form" | "sent">("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }

    const timerId = window.setTimeout(() => {
      setCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timerId);
  }, [cooldown]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const credential = await signInWithEmailPassword(email.trim(), password);

      if (!credential.user.emailVerified) {
        await sendVerificationEmail(credential.user);
      }

      await signOut();
      setView("sent");
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch {
      try {
        await signOut();
      } catch {
        // 一時ログイン状態がない場合は何もしない。
      }
      setError(GENERIC_ERROR);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh bg-[color:var(--brand-mint-bg)] px-5 py-8 text-[color:var(--text-primary)] sm:px-6">
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-[520px] items-center justify-center">
        <section className="w-full rounded-lg border border-[color:var(--brand-mint-border)] bg-[color:var(--surface)] px-5 py-7 shadow-[0_10px_30px_rgb(23_33_29_/_0.08)] sm:px-8 sm:py-8">
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
              確認メールの再送
            </h1>
            <p className="mt-3 text-sm leading-6 text-[color:var(--text-secondary)]">
              登録時のメールアドレスとパスワードを入力してください。
            </p>
          </div>

          {view === "sent" ? (
            <div className="mt-7 rounded-lg border border-[color:var(--brand-mint-border)] bg-[color:var(--brand-primary-soft)] px-4 py-4 text-sm leading-6 text-[color:var(--text-primary)]">
              入力内容を確認しました。必要な場合は確認メールを送信しています。
              {cooldown > 0 && (
                <p className="mt-2 text-[color:var(--text-secondary)]">
                  再送できるようになるまで {cooldown} 秒ほどお待ちください。
                </p>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-7 space-y-5">
              {error && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
                >
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-semibold">
                  メールアドレス
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-12 w-full rounded border border-[color:var(--border)] bg-white px-4 text-base text-[color:var(--text-primary)] outline-none calm-transition placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--brand-primary)] focus:ring-2 focus:ring-[color:var(--brand-primary-soft)]"
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
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-12 w-full rounded border border-[color:var(--border)] bg-white px-4 text-base text-[color:var(--text-primary)] outline-none calm-transition focus:border-[color:var(--brand-primary)] focus:ring-2 focus:ring-[color:var(--brand-primary-soft)]"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading || cooldown > 0}
                className="flex h-12 w-full items-center justify-center rounded bg-[color:var(--brand-primary)] px-5 text-base font-semibold text-[color:var(--brand-on-primary)] calm-transition hover:bg-[color:var(--brand-primary-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-primary)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              >
                {loading
                  ? "送信中..."
                  : cooldown > 0
                    ? `再送まで ${cooldown} 秒`
                    : "確認メールを再送"}
              </button>
            </form>
          )}

          <div className="mt-6 flex flex-col items-center gap-3 text-sm">
            <Link
              href="/login"
              className="font-medium text-[color:var(--brand-primary-active)] underline-offset-4 calm-transition hover:underline"
            >
              ログインへ戻る
            </Link>
            <Link
              href="/"
              className="font-medium text-[color:var(--brand-primary-active)] underline-offset-4 calm-transition hover:underline"
            >
              ホームに戻る
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

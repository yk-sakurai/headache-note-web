"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { sendPasswordReset } from "@/lib/firebase/auth.client";

function getAuthErrorCode(error: unknown): string {
  return typeof (error as { code?: string })?.code === "string"
    ? (error as { code?: string }).code ?? ""
    : "";
}

export default function PasswordResetPage() {
  const [view, setView] = useState<"form" | "sent">("form");
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [formAlert, setFormAlert] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedEmail = email.trim();

    setFieldError("");
    setFormAlert("");

    if (!trimmedEmail) {
      setFieldError("メールアドレスを入力してください。");
      return;
    }

    setLoading(true);
    try {
      await sendPasswordReset(trimmedEmail);
      setView("sent");
    } catch (error: unknown) {
      const code = getAuthErrorCode(error);
      if (code === "auth/too-many-requests") {
        setFormAlert("エラーが発生しました。しばらくしてからもう一度お試しください。");
      } else if (code === "auth/network-request-failed") {
        setFormAlert("送信できませんでした。時間をおいて再度お試しください。");
      } else {
        setView("sent");
      }
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
              パスワードリセット
            </h1>
          </div>

          {view === "sent" ? (
            <div className="mt-7 rounded-lg border border-[color:var(--brand-mint-border)] bg-[color:var(--brand-primary-soft)] px-4 py-4 text-sm leading-6 text-[color:var(--text-primary)]">
              <p>
                登録済みのメールアドレス宛に、パスワード再設定用のメールを送信しました。
              </p>
              <p className="mt-2 text-[color:var(--text-secondary)]">
                メールが届かない場合は、入力内容や迷惑メールフォルダをご確認ください。
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="mt-7 space-y-5">
              <div className="space-y-1 text-base leading-7">
                <p>パスワードをリセットします。</p>
                <p>登録されているメールアドレスを指定してください。</p>
              </div>

              {formAlert && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
                >
                  {formAlert}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-semibold">
                  メールアドレス
                </label>
                <input
                  id="email"
                  type="text"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  aria-invalid={fieldError ? "true" : "false"}
                  aria-describedby={fieldError ? "email-error" : undefined}
                  className="h-12 w-full rounded border border-[color:var(--border)] bg-white px-4 text-base text-[color:var(--text-primary)] outline-none calm-transition placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--brand-primary)] focus:ring-2 focus:ring-[color:var(--brand-primary-soft)] aria-[invalid=true]:border-red-400 aria-[invalid=true]:focus:border-red-400 aria-[invalid=true]:focus:ring-red-100"
                  placeholder="example@example.com"
                />
                {fieldError && (
                  <p
                    id="email-error"
                    role="alert"
                    className="rounded bg-red-50 px-3 py-2 text-sm leading-6 text-red-700"
                  >
                    {fieldError}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex h-12 w-full items-center justify-center rounded bg-[color:var(--brand-primary)] px-5 text-base font-semibold text-[color:var(--brand-on-primary)] calm-transition hover:bg-[color:var(--brand-primary-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-primary)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              >
                {loading ? "送信中..." : "決定"}
              </button>
            </form>
          )}

          <div className="mt-6 flex justify-center text-sm">
            <Link
              href="/login"
              className="font-medium text-[color:var(--brand-primary-active)] underline-offset-4 calm-transition hover:underline"
            >
              ログイン画面に戻る
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

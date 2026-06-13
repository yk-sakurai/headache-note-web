"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getCurrentUser,
  sendVerificationEmail,
  signOut,
  signUpWithEmailPassword,
} from "@/lib/firebase/auth.client";
import {
  SIGNUP_FORM_ERROR_MESSAGES,
  validatePassword,
} from "@/lib/validation/password";

function mapSignupErrorToMessage(code: string): string {
  switch (code) {
    case "auth/invalid-email":
      return "メールアドレスの形式が正しくありません。";
    case "auth/too-many-requests":
      return "エラーが発生しました。しばらくしてからもう一度お試しください。";
    case "auth/network-request-failed":
      return "ネットワークエラーが発生しました。接続をご確認ください。";
    case "auth/weak-password":
      return SIGNUP_FORM_ERROR_MESSAGES.invalidInput;
    case "auth/email-already-in-use":
    default:
      return "登録できませんでした。入力内容をご確認のうえ、もう一度お試しください。";
  }
}

export default function SignupPage() {
  const router = useRouter();
  const [view, setView] = useState<"form" | "completed">("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [passwordConfirmTouched, setPasswordConfirmTouched] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [formAlert, setFormAlert] = useState("");
  const [loading, setLoading] = useState(false);
  const [verificationSendFailed, setVerificationSendFailed] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) {
      return;
    }

    const timerId = window.setTimeout(() => {
      setResendCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timerId);
  }, [resendCooldown]);

  const passwordError = useMemo(
    () => (passwordTouched ? validatePassword(password) : null),
    [password, passwordTouched]
  );
  const passwordConfirmError = useMemo(
    () => (passwordConfirmTouched ? validatePassword(passwordConfirm) : null),
    [passwordConfirm, passwordConfirmTouched]
  );
  const canSubmit = agreeTerms && agreePrivacy && !loading;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormAlert("");
    setPasswordTouched(true);
    setPasswordConfirmTouched(true);

    const nextPasswordError = validatePassword(password);
    const nextPasswordConfirmError = validatePassword(passwordConfirm);

    if (nextPasswordError || nextPasswordConfirmError) {
      setFormAlert(SIGNUP_FORM_ERROR_MESSAGES.invalidInput);
      return;
    }

    if (password !== passwordConfirm) {
      setFormAlert(SIGNUP_FORM_ERROR_MESSAGES.passwordMismatch);
      return;
    }

    if (!agreeTerms || !agreePrivacy) {
      setFormAlert(SIGNUP_FORM_ERROR_MESSAGES.agreementRequired);
      return;
    }

    setLoading(true);
    setVerificationSendFailed(false);
    let createdUser: User | null = null;
    try {
      const credential = await signUpWithEmailPassword(email.trim(), password);
      createdUser = credential.user;
      await sendVerificationEmail(credential.user);
      await signOut();
      setView("completed");
    } catch (error: unknown) {
      const code =
        typeof (error as { code?: string })?.code === "string"
          ? (error as { code?: string }).code ?? ""
          : "";
      if (createdUser) {
        setVerificationSendFailed(true);
        setResendCooldown(30);
        setFormAlert(
          "確認メールの送信に失敗しました。時間をおいて再送をお試しください。"
        );
      } else {
        setFormAlert(mapSignupErrorToMessage(code));
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResendVerification() {
    const user = getCurrentUser();

    if (!user) {
      setVerificationSendFailed(false);
      setFormAlert("登録できませんでした。入力内容をご確認のうえ、もう一度お試しください。");
      return;
    }

    setResending(true);
    setFormAlert("");
    try {
      await sendVerificationEmail(user);
      await signOut();
      setVerificationSendFailed(false);
      setView("completed");
    } catch {
      setResendCooldown(30);
      setFormAlert(
        "確認メールの送信に失敗しました。時間をおいて再送をお試しください。"
      );
    } finally {
      setResending(false);
    }
  }

  if (view === "completed") {
    return (
      <main className="min-h-dvh bg-[color:var(--brand-mint-bg)] px-5 py-8 text-[color:var(--text-primary)] sm:px-6">
        <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-[620px] items-center justify-center">
          <section className="w-full rounded-lg border border-[color:var(--brand-mint-border)] bg-[color:var(--surface)] px-5 py-8 text-center shadow-[0_10px_30px_rgb(23_33_29_/_0.08)] sm:px-10 sm:py-10">
            <div className="flex items-center justify-center gap-3 text-[color:var(--brand-primary)]">
              <Image
                src="/brand/logo-mark.svg"
                alt=""
                width={48}
                height={48}
                className="h-11 w-11"
                priority
                aria-hidden="true"
              />
              <span className="text-3xl font-semibold sm:text-4xl">頭痛ノート</span>
            </div>
            <h1 className="mt-8 text-3xl font-semibold tracking-normal text-[color:var(--text-primary)] sm:text-[2rem]">
              ユーザー登録完了
            </h1>
            <p className="mt-4 text-base leading-7 text-[color:var(--text-secondary)]">
              ご指定のメールアドレスに確認メールを送信しました。
            </p>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="mt-8 flex h-12 w-full items-center justify-center rounded bg-[color:var(--brand-primary)] px-5 text-lg font-semibold text-[color:var(--brand-on-primary)] calm-transition hover:bg-[color:var(--brand-primary-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-primary)] focus-visible:ring-offset-2"
            >
              OK
            </button>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-[color:var(--brand-mint-bg)] px-5 py-8 text-[color:var(--text-primary)] sm:px-6">
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-[620px] items-center justify-center">
        <form
          onSubmit={handleSubmit}
          className="w-full rounded-lg border border-[color:var(--brand-mint-border)] bg-[color:var(--surface)] px-5 py-7 shadow-[0_10px_30px_rgb(23_33_29_/_0.08)] sm:px-10 sm:py-9"
        >
          <div className="flex flex-col items-center text-center">
            <div className="flex items-center justify-center gap-3 text-[color:var(--brand-primary)]">
              <Image
                src="/brand/logo-mark.svg"
                alt=""
                width={48}
                height={48}
                className="h-11 w-11"
                priority
                aria-hidden="true"
              />
              <span className="text-3xl font-semibold sm:text-4xl">頭痛ノート</span>
            </div>
            <h1 className="mt-8 text-3xl font-semibold tracking-normal text-[color:var(--text-primary)] sm:text-[2rem]">
              ユーザー登録
            </h1>
            <p className="mt-4 text-sm leading-7 text-[color:var(--text-secondary)] sm:text-base">
              アカウントを作成します。
            </p>
          </div>

          {formAlert && (
            <div
              role="alert"
              className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
            >
              {formAlert}
              {verificationSendFailed && (
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resending || resendCooldown > 0}
                  className="mt-3 flex h-10 w-full items-center justify-center rounded border border-red-200 bg-white px-4 text-sm font-semibold text-red-700 calm-transition hover:bg-red-50 disabled:pointer-events-none disabled:opacity-60"
                >
                  {resending
                    ? "再送中..."
                    : resendCooldown > 0
                      ? `再送まで ${resendCooldown} 秒`
                      : "確認メールを再送"}
                </button>
              )}
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
                onChange={(event) => setEmail(event.target.value)}
                className="h-12 w-full rounded border border-[color:var(--border)] bg-white px-4 text-base text-[color:var(--text-primary)] outline-none calm-transition placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--brand-primary)] focus:ring-2 focus:ring-[color:var(--brand-primary-soft)]"
                placeholder="example@example.com"
                required
              />
            </div>

            <PasswordField
              id="password"
              label="パスワード"
              value={password}
              error={passwordError}
              onChange={(value) => {
                setPassword(value);
                setPasswordTouched(true);
              }}
              onBlur={() => setPasswordTouched(true)}
            />

            <PasswordField
              id="password-confirm"
              label="パスワード再入力"
              value={passwordConfirm}
              error={passwordConfirmError}
              onChange={(value) => {
                setPasswordConfirm(value);
                setPasswordConfirmTouched(true);
              }}
              onBlur={() => setPasswordConfirmTouched(true)}
            />
          </div>

          <div className="mt-6 space-y-3">
            <AgreementCheckbox
              id="agree-terms"
              checked={agreeTerms}
              onChange={setAgreeTerms}
              agreementName="利用規約"
              agreementHref="/terms"
            />
            <AgreementCheckbox
              id="agree-privacy"
              checked={agreePrivacy}
              onChange={setAgreePrivacy}
              agreementName="プライバシーポリシー"
              agreementHref="/privacy"
            />
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="mt-6 flex h-12 w-full items-center justify-center rounded bg-[color:var(--brand-primary)] px-5 text-lg font-semibold text-[color:var(--brand-on-primary)] calm-transition hover:bg-[color:var(--brand-primary-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-primary)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          >
            {loading ? "登録中..." : "決定"}
          </button>

          <div className="mt-6 flex flex-col items-center gap-3 text-sm">
            <Link
              href="/login"
              className="font-medium text-[color:var(--brand-primary-active)] underline-offset-4 calm-transition hover:underline"
            >
              ログインはこちら
            </Link>
            <Link
              href="/"
              className="text-base font-medium text-[color:var(--brand-primary-active)] underline underline-offset-4 calm-transition hover:text-[color:var(--brand-primary-hover)]"
            >
              ホームに戻る
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}

function PasswordField({
  id,
  label,
  value,
  error,
  onChange,
  onBlur,
}: {
  id: string;
  label: string;
  value: string;
  error: string | null;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        type="password"
        autoComplete="new-password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? `${id}-error` : undefined}
        className="h-12 w-full rounded border border-[color:var(--border)] bg-white px-4 text-base text-[color:var(--text-primary)] outline-none calm-transition focus:border-[color:var(--brand-primary)] focus:ring-2 focus:ring-[color:var(--brand-primary-soft)] aria-[invalid=true]:border-red-300 aria-[invalid=true]:focus:ring-red-100"
        required
      />
      {error && (
        <p id={`${id}-error`} className="text-sm leading-6 text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

function AgreementCheckbox({
  id,
  checked,
  onChange,
  agreementName,
  agreementHref,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  agreementName: string;
  agreementHref: string;
}) {
  return (
    <div className="flex items-center gap-3 text-sm text-[color:var(--text-primary)]">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        aria-label={`${agreementName}に同意する`}
        className="h-5 w-5 shrink-0 rounded border-[color:var(--border)] text-[color:var(--brand-primary)] accent-[color:var(--brand-primary)]"
      />
      <p>
        <Link
          href={agreementHref}
          className="font-semibold text-[color:var(--brand-primary-active)] underline underline-offset-4 calm-transition hover:text-[color:var(--brand-primary-hover)]"
        >
          {agreementName}
        </Link>
        に同意します
      </p>
    </div>
  );
}

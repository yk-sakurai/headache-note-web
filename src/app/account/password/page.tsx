"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  observeAuthState,
  reauthenticateWithPassword,
  signOut,
  updateUserPassword,
} from "@/lib/firebase/auth.client";
import {
  SIGNUP_FORM_ERROR_MESSAGES,
  validatePassword,
} from "@/lib/validation/password";

function getAuthErrorCode(error: unknown): string {
  return typeof (error as { code?: string })?.code === "string"
    ? (error as { code?: string }).code ?? ""
    : "";
}

function mapAccountChangeErrorToMessage(code: string): string {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
      return "現在のパスワードが正しくありません。";
    case "auth/weak-password":
      return SIGNUP_FORM_ERROR_MESSAGES.invalidInput;
    case "auth/requires-recent-login":
      return "安全のため、もう一度ログインしてからお試しください。";
    case "auth/too-many-requests":
      return "エラーが発生しました。しばらくしてからもう一度お試しください。";
    case "auth/network-request-failed":
      return "ネットワークエラーが発生しました。接続をご確認ください。";
    default:
      return "変更できませんでした。入力内容をご確認のうえ、もう一度お試しください。";
  }
}

async function clearSession() {
  try {
    await signOut();
  } catch {
    // Firebase Auth の状態に関わらず、SSR セッションの終了を優先する。
  }

  await fetch("/api/auth/session-logout", { method: "POST" }).catch(() => null);
}

export default function AccountPasswordPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [hasUser, setHasUser] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [newPasswordTouched, setNewPasswordTouched] = useState(false);
  const [newPasswordConfirmTouched, setNewPasswordConfirmTouched] = useState(false);
  const [formAlert, setFormAlert] = useState("");
  const [loading, setLoading] = useState(false);
  const [redirectingToLogin, setRedirectingToLogin] = useState(false);
  const [view, setView] = useState<"form" | "completed">("form");
  const authUnavailable = authReady && !hasUser;

  useEffect(() => {
    return observeAuthState((user) => {
      setHasUser(Boolean(user?.email));
      setAuthReady(true);
    });
  }, []);

  const newPasswordError = useMemo(
    () => (newPasswordTouched ? validatePassword(newPassword) : null),
    [newPassword, newPasswordTouched]
  );
  const newPasswordConfirmError = useMemo(
    () => {
      if (!newPasswordConfirmTouched) {
        return null;
      }

      const passwordError = validatePassword(newPasswordConfirm);
      if (passwordError) {
        return passwordError;
      }

      return newPassword && newPassword !== newPasswordConfirm
        ? SIGNUP_FORM_ERROR_MESSAGES.passwordMismatch
        : null;
    },
    [newPassword, newPasswordConfirm, newPasswordConfirmTouched]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormAlert("");
    setNewPasswordTouched(true);
    setNewPasswordConfirmTouched(true);

    const nextPasswordError = validatePassword(newPassword);
    const nextPasswordConfirmError = validatePassword(newPasswordConfirm);

    if (!currentPassword) {
      setFormAlert("現在のパスワードを入力してください。");
      return;
    }

    if (authUnavailable) {
      setFormAlert("ログイン状態を確認できませんでした。もう一度ログインしてください。");
      return;
    }

    if (nextPasswordError || nextPasswordConfirmError) {
      setFormAlert(SIGNUP_FORM_ERROR_MESSAGES.invalidInput);
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      setFormAlert(SIGNUP_FORM_ERROR_MESSAGES.passwordMismatch);
      return;
    }

    setLoading(true);
    try {
      await reauthenticateWithPassword(currentPassword);
      await updateUserPassword(newPassword);
      setView("completed");
    } catch (error: unknown) {
      setFormAlert(mapAccountChangeErrorToMessage(getAuthErrorCode(error)));
    } finally {
      setLoading(false);
    }
  }

  async function handleLoginClick() {
    setRedirectingToLogin(true);
    await clearSession();
    router.replace("/login");
  }

  if (view === "completed") {
    return (
      <main className="min-h-screen bg-[color:var(--brand-mint-bg)] px-5 py-10 text-[color:var(--text-primary)]">
        <section className="mx-auto w-full max-w-[560px] rounded-lg border border-[color:var(--brand-mint-border)] bg-[color:var(--surface)] px-5 py-8 text-center sm:px-8">
          <h1 className="text-2xl font-semibold tracking-normal">
            パスワードを変更しました
          </h1>
          <p className="mt-4 text-sm leading-7 text-[color:var(--text-secondary)]">
            安全のためログアウトしました。
            <br />
            新しいパスワードでログインしてください。
          </p>
          <button
            type="button"
            onClick={handleLoginClick}
            disabled={redirectingToLogin}
            className="mt-7 flex h-12 w-full items-center justify-center rounded bg-[color:var(--brand-primary)] px-5 text-base font-semibold text-[color:var(--brand-on-primary)] calm-transition hover:bg-[color:var(--brand-primary-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-primary)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          >
            {redirectingToLogin ? "処理中..." : "ログイン画面へ"}
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[color:var(--brand-mint-bg)] px-5 py-10 text-[color:var(--text-primary)]">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="mx-auto w-full max-w-[560px] rounded-lg border border-[color:var(--brand-mint-border)] bg-[color:var(--surface)] px-5 py-7 sm:px-8"
      >
        <h1 className="text-2xl font-semibold tracking-normal">
          パスワード変更
        </h1>
        <p className="mt-3 text-sm leading-7 text-[color:var(--text-secondary)]">
          現在のパスワードを確認して、新しいパスワードに変更します。
        </p>

        {formAlert && (
          <div
            role="alert"
            className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
          >
            {formAlert}
          </div>
        )}

        {authUnavailable && (
          <div className="mt-6 rounded-lg border border-[color:var(--brand-mint-border)] bg-[color:var(--brand-primary-soft)] px-4 py-3 text-sm leading-6 text-[color:var(--text-secondary)]">
            ログイン状態を確認できませんでした。
            <Link
              href="/login?redirect=/account/password"
              className="ml-1 font-semibold text-[color:var(--brand-primary)] underline-offset-4 hover:underline"
            >
              もう一度ログインしてください。
            </Link>
          </div>
        )}

        <div className="mt-7 space-y-5">
          <PasswordField
            id="current-password"
            label="現在のパスワード"
            value={currentPassword}
            autoComplete="current-password"
            disabled={!authReady || authUnavailable || loading}
            onChange={setCurrentPassword}
          />
          <PasswordField
            id="new-password"
            label="新しいパスワード"
            value={newPassword}
            error={newPasswordError}
            autoComplete="new-password"
            disabled={!authReady || authUnavailable || loading}
            onChange={(value) => {
              setNewPassword(value);
              setNewPasswordTouched(true);
            }}
            onBlur={() => setNewPasswordTouched(true)}
          />
          <PasswordField
            id="new-password-confirm"
            label="新しいパスワード（再入力）"
            value={newPasswordConfirm}
            error={newPasswordConfirmError}
            autoComplete="new-password"
            disabled={!authReady || authUnavailable || loading}
            onChange={(value) => {
              setNewPasswordConfirm(value);
              setNewPasswordConfirmTouched(true);
            }}
            onBlur={() => setNewPasswordConfirmTouched(true)}
          />
        </div>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row-reverse">
          <button
            type="submit"
            disabled={!authReady || authUnavailable || loading}
            className="flex h-12 flex-1 items-center justify-center rounded bg-[color:var(--brand-primary)] px-5 text-base font-semibold text-[color:var(--brand-on-primary)] calm-transition hover:bg-[color:var(--brand-primary-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-primary)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          >
            {loading ? "処理中..." : "変更する"}
          </button>
          <Link
            href="/account"
            className="flex h-12 flex-1 items-center justify-center rounded border border-[color:var(--border)] bg-white px-5 text-base font-semibold text-[color:var(--text-primary)] calm-transition hover:bg-[color:var(--brand-primary-soft)]"
          >
            戻る
          </Link>
        </div>
      </form>
    </main>
  );
}

function PasswordField({
  id,
  label,
  value,
  error,
  autoComplete,
  disabled,
  onChange,
  onBlur,
}: {
  id: string;
  label: string;
  value: string;
  error?: string | null;
  autoComplete: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onBlur?: () => void;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        type="password"
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? `${id}-error` : undefined}
        className="h-12 w-full rounded border border-[color:var(--border)] bg-white px-4 text-base text-[color:var(--text-primary)] outline-none calm-transition focus:border-[color:var(--brand-primary)] focus:ring-2 focus:ring-[color:var(--brand-primary-soft)] aria-[invalid=true]:border-red-400 aria-[invalid=true]:focus:border-red-400 aria-[invalid=true]:focus:ring-red-100"
        disabled={disabled}
      />
      {error && (
        <p id={`${id}-error`} className="text-sm leading-6 text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

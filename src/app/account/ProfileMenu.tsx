import Link from "next/link";
import type { ReactNode } from "react";
import WithdrawalRow from "./WithdrawalRow";

export default function ProfileMenu({
  email,
  withdrawalBlocked,
  withdrawalWarnsRemainingPeriod,
}: {
  email: string;
  withdrawalBlocked: boolean;
  withdrawalWarnsRemainingPeriod: boolean;
}) {
  return (
    <main className="min-h-screen bg-[color:var(--brand-mint-bg)]">
      <div className="mx-auto w-full max-w-screen-lg px-5 py-12 text-[color:var(--text-primary)] sm:px-8 sm:py-16">
        <h1 className="text-4xl font-semibold tracking-normal sm:text-5xl">
          アカウント
        </h1>

        <section className="mt-14 space-y-5">
          <h2 className="text-2xl font-semibold tracking-normal text-[color:var(--brand-primary)] sm:text-3xl">
            プロフィール
          </h2>

          <div className="overflow-hidden rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)]">
            <ProfileMenuRow
              href="/account/email"
              title="メールアドレス"
              subtitle={email || "-"}
              icon={<MailIcon />}
            />
            <div className="h-px bg-[color:var(--border)]" />
            <ProfileMenuRow
              href="/account/password"
              title="パスワード"
              subtitle="非表示"
              icon={<LockIcon />}
            />
          </div>
        </section>

        <section className="mt-12 space-y-5">
          <h2 className="text-2xl font-semibold tracking-normal text-red-700 sm:text-3xl">
            退会
          </h2>

          <div className="overflow-hidden rounded-lg border border-red-100 bg-[color:var(--surface)]">
            <WithdrawalRow
              blocked={withdrawalBlocked}
              warnsRemainingPeriod={withdrawalWarnsRemainingPeriod}
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function ProfileMenuRow({
  href,
  title,
  subtitle,
  icon,
}: {
  href: string;
  title: string;
  subtitle: string;
  icon: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="grid min-h-28 grid-cols-[3.75rem_minmax(0,1fr)_1.5rem] items-center gap-4 px-6 py-5 calm-transition hover:bg-[color:var(--brand-primary-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--brand-primary)] sm:grid-cols-[4.25rem_minmax(0,1fr)_1.75rem] sm:px-8"
    >
      <span className="flex h-12 w-12 items-center justify-center text-[color:var(--brand-primary)]">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-xl font-semibold leading-8">{title}</span>
        <span className="mt-1 block truncate text-lg leading-7 text-[color:var(--text-secondary)]">
          {subtitle}
        </span>
      </span>
      <ChevronRightIcon />
    </Link>
  );
}

function MailIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-10 w-10"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
    >
      <path d="M4.5 6.5h15a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 16V8a1.5 1.5 0 0 1 1.5-1.5Z" />
      <path d="m4 8 8 5.5L20 8" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-10 w-10"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
    >
      <path d="M6.5 10.5h11A1.5 1.5 0 0 1 19 12v6a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 18v-6a1.5 1.5 0 0 1 1.5-1.5Z" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
      <path d="M12 15v1.5" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-7 w-7 text-[color:var(--text-muted)]"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

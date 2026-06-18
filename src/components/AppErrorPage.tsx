"use client";

import Link from "next/link";

type AppErrorPageProps = {
  title?: string;
  description?: string;
  onReset?: () => void;
  resetLabel?: string;
};

export default function AppErrorPage({
  title = "ページを表示できませんでした",
  description = "一時的に表示できないか、URLが変わっている可能性があります。",
  onReset,
  resetLabel = "もう一度試す",
}: AppErrorPageProps) {
  return (
    <main className="min-h-[calc(100svh-61px)] bg-[color:var(--brand-mint-bg)] px-4 py-10 sm:min-h-[calc(100svh-81px)] sm:px-6 lg:px-8">
      <section className="mx-auto grid min-h-[calc(100svh-141px)] max-w-3xl items-center sm:min-h-[calc(100svh-161px)]">
        <div className="rounded-xl border border-[color:var(--border-subtle)] bg-[color:var(--surface)] p-6 shadow-[var(--shadow-soft)] sm:p-8 lg:p-10">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--brand-mint-border)] bg-[color:var(--brand-primary-soft)] px-3 py-2 text-sm font-medium text-[color:var(--brand-primary-active)]">
              <span className="h-2 w-2 rounded-full bg-[color:var(--brand-primary)]" aria-hidden="true" />
              表示できないページです
            </div>

            <div className="space-y-3">
              <h1 className="text-2xl font-semibold leading-tight text-[color:var(--text-primary)] sm:text-3xl">
                {title}
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-[color:var(--text-secondary)] sm:text-base">
                {description}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/"
                className="inline-flex h-11 items-center justify-center rounded-lg border border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)] px-5 text-sm font-medium text-[color:var(--brand-on-primary)] shadow-sm calm-transition hover:border-[color:var(--brand-primary-hover)] hover:bg-[color:var(--brand-primary-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--surface)]"
              >
                トップへ戻る
              </Link>
              {onReset ? (
                <button
                  type="button"
                  onClick={onReset}
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-5 text-sm font-medium text-[color:var(--text-secondary)] calm-transition hover:border-[color:var(--brand-mint-border)] hover:bg-[color:var(--brand-primary-soft)] hover:text-[color:var(--brand-primary-active)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--surface)]"
                >
                  {resetLabel}
                </button>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-5 text-sm font-medium text-[color:var(--text-secondary)] calm-transition hover:border-[color:var(--brand-mint-border)] hover:bg-[color:var(--brand-primary-soft)] hover:text-[color:var(--brand-primary-active)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--surface)]"
                >
                  ログインへ
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

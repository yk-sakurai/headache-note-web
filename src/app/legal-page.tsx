import Link from "next/link";
import type { ReactNode } from "react";

type LegalPageProps = {
  title: string;
  children: ReactNode;
};

const revisedAt = "制定日：2025年3月3日 / 改定日：2026年1月14日";

export function LegalPage({ title, children }: LegalPageProps) {
  return (
    <main className="min-h-dvh bg-[color:var(--brand-mint-bg)] text-[color:var(--text-primary)]">
      <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-10 lg:py-12">
        <Link
          href="/"
          className="inline-flex items-center text-sm font-semibold text-[color:var(--brand-primary-active)] underline-offset-4 calm-transition hover:text-[color:var(--brand-primary-hover)] hover:underline"
        >
          トップページに戻る
        </Link>

        <article className="mt-5 rounded-lg border border-[color:var(--brand-mint-border)] bg-[color:var(--surface)] px-5 py-8 shadow-[0_10px_30px_rgb(23_33_29_/_0.06)] sm:px-8 md:px-10 lg:px-12">
          <header className="border-b border-[color:var(--border-subtle)] pb-6">
            <h1 className="text-2xl font-semibold tracking-normal text-[color:var(--text-primary)] sm:text-3xl">
              {title}
            </h1>
            <p className="mt-3 text-sm leading-6 text-[color:var(--text-muted)]">
              {revisedAt}
            </p>
          </header>

          <div className="legal-content mt-8">{children}</div>
        </article>
      </div>

      <footer className="border-t border-[color:var(--brand-mint-border)] bg-[color:var(--surface)]/70 px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-5 text-sm text-[color:var(--text-secondary)] md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-semibold text-[color:var(--text-primary)]">頭痛ノート</p>
            <p className="mt-2">© 2026 頭痛ノート</p>
          </div>
          <nav aria-label="フッター" className="flex flex-wrap gap-y-3 md:divide-x md:divide-[color:var(--border)] md:justify-end">
            <Link className="pr-6 calm-transition hover:text-[color:var(--brand-primary-active)] md:px-6 md:pl-0" href="/terms">
              利用規約
            </Link>
            <Link className="pr-6 calm-transition hover:text-[color:var(--brand-primary-active)] md:px-6" href="/privacy">
              プライバシーポリシー
            </Link>
            <Link className="calm-transition hover:text-[color:var(--brand-primary-active)] md:px-6 md:pr-0" href="/contact">
              お問い合わせ
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}

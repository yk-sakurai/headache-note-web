"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, signOut } from "@/lib/firebase/auth.client";
import Button from "./Button";
import ConfirmDialog from "./ConfirmDialog";
import { useSuggestionNavigation } from "./SuggestionNavigationProvider";

const preLoginNavItems = [
  { href: "/#features", label: "できること" },
  { href: "/#faq", label: "よくある質問" },
];

const loggedInNavItems = [
  { href: "/home", label: "ホーム" },
  { href: "/records", label: "記録" },
  { href: "/reports", label: "レポート" },
  { href: "/account", label: "アカウント" },
];

function LogoMark() {
  return (
    <Image
      src="/brand/logo-mark.svg"
      alt=""
      width={32}
      height={32}
      className="h-7 w-7 shrink-0 sm:h-8 sm:w-8"
      aria-hidden="true"
      priority
    />
  );
}

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const nav = useSuggestionNavigation();
  const { invalidateForUser } = nav;
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // ログアウトを確定した後で、候補編集の未保存3択を通してから実際にサインアウトする。
  const [pendingLogout, setPendingLogout] = useState(false);
  const leaveCountsRef = useRef({
    approved: nav.leaveApprovedCount,
    cancelled: nav.leaveCancelledCount,
  });

  const isAuthEntryPage =
    pathname === "/signup" ||
    pathname === "/login" ||
    pathname === "/password-reset" ||
    pathname === "/resend-verification";

  useEffect(() => {
    if (isAuthEntryPage) {
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setMenuOpen(false);
      // uid 変更・ログアウトの確定で、退避した下書きを失効させる。
      invalidateForUser(currentUser?.uid ?? null);
    });
    return () => unsubscribe();
    // nav 全体ではなく安定した関数だけに依存する（再購読のたびにメニューが閉じるのを避ける）。
  }, [invalidateForUser, isAuthEntryPage]);

  const performLogout = useCallback(async () => {
    try {
      setLoading(true);
      await signOut();
      await fetch("/api/auth/session-logout", { method: "POST" });
      invalidateForUser(null);
      setShowLogoutDialog(false);
      router.push("/");
    } catch (error) {
      console.error("ログアウトエラー:", error);
      setShowLogoutDialog(false);
    } finally {
      setLoading(false);
      setMenuOpen(false);
    }
  }, [invalidateForUser, router]);

  // 候補編集の3択の結果を待ってからサインアウトする。
  // キャンセルされた場合はログアウト自体を中止し、候補の変更・往復はそのまま残す。
  useEffect(() => {
    if (!pendingLogout) {
      leaveCountsRef.current = {
        approved: nav.leaveApprovedCount,
        cancelled: nav.leaveCancelledCount,
      };
      return;
    }
    if (nav.leaveCancelledCount !== leaveCountsRef.current.cancelled) {
      leaveCountsRef.current.cancelled = nav.leaveCancelledCount;
      setPendingLogout(false);
      return;
    }
    if (nav.leaveApprovedCount !== leaveCountsRef.current.approved) {
      leaveCountsRef.current.approved = nav.leaveApprovedCount;
      setPendingLogout(false);
      void performLogout();
    }
  }, [nav.leaveApprovedCount, nav.leaveCancelledCount, pendingLogout, performLogout]);

  if (isAuthEntryPage) {
    return null;
  }

  function handleLogoutClick() {
    setShowLogoutDialog(true);
  }

  async function handleConfirmLogout() {
    if (nav.hasUnsavedChanges) {
      // ログアウトは確定済み。候補の未保存3択だけ先に通し、承認後にサインアウトする。
      setShowLogoutDialog(false);
      setPendingLogout(true);
      nav.requestLeave({ kind: "none" });
      return;
    }
    await performLogout();
  }

  function handleCancelLogout() {
    setShowLogoutDialog(false);
  }

  function isActiveNavItem(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[color:var(--border-subtle)] bg-[color:var(--surface)]/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-3 sm:px-5 lg:px-8">
          <div className="grid min-h-[60px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 py-2.5 sm:gap-3 md:min-h-20 md:gap-8 md:py-4">
            <Link
              href="/"
              className="flex min-w-max shrink-0 items-center gap-2 text-base font-semibold text-[color:var(--text-primary)] calm-transition hover:text-[color:var(--brand-primary-active)] sm:gap-2.5 sm:text-xl"
              onClick={() => setMenuOpen(false)}
            >
              <LogoMark />
              <span className="whitespace-nowrap leading-none">頭痛ノート</span>
            </Link>

            <nav className="hidden items-center justify-center gap-8 md:flex">
              {(user ? loggedInNavItems : preLoginNavItems).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-2 text-sm font-medium calm-transition hover:bg-[color:var(--brand-primary-soft)] hover:text-[color:var(--brand-primary-active)] ${
                    isActiveNavItem(item.href)
                      ? "bg-[color:var(--brand-primary-soft)] text-[color:var(--brand-primary-active)]"
                      : "text-[color:var(--text-secondary)]"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="flex min-w-max items-center justify-end gap-1.5 sm:gap-2.5">
              {user ? (
                <Button
                  onClick={handleLogoutClick}
                  disabled={loading}
                  className="hidden sm:inline-flex"
                >
                  {loading ? "ログアウト中..." : "ログアウト"}
                </Button>
              ) : (
                <>
                  <Button href="/login" variant="secondary" className="h-9 px-3 text-xs sm:h-10 sm:px-5 sm:text-sm">
                    ログイン
                  </Button>
                  <Button href="/signup" className="h-9 px-3 text-xs sm:h-10 sm:px-5 sm:text-sm">
                    <span className="sm:hidden">登録</span>
                    <span className="hidden sm:inline">ユーザー登録</span>
                  </Button>
                </>
              )}

              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text-secondary)] calm-transition hover:border-[color:var(--brand-mint-border)] hover:bg-[color:var(--brand-primary-soft)] hover:text-[color:var(--brand-primary-active)] md:hidden"
                aria-label={menuOpen ? "メニューを閉じる" : "メニューを開く"}
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((current) => !current)}
              >
                {menuOpen ? (
                  <svg
                    aria-hidden="true"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M6 6l12 12M18 6L6 18"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                  </svg>
                ) : (
                  <svg
                    aria-hidden="true"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M5 7h14M5 12h14M5 17h14"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {menuOpen && (
            <div className="animate-calm-fade-in border-t border-[color:var(--border-subtle)] py-3 md:hidden">
              <nav className="flex flex-col gap-1">
                {(user ? loggedInNavItems : preLoginNavItems).map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-lg px-3 py-2 text-sm font-medium calm-transition hover:bg-[color:var(--brand-primary-soft)] hover:text-[color:var(--brand-primary-active)] ${
                      isActiveNavItem(item.href)
                        ? "bg-[color:var(--brand-primary-soft)] text-[color:var(--brand-primary-active)]"
                        : "text-[color:var(--text-secondary)]"
                    }`}
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
                {user && (
                  <button
                    type="button"
                    className="rounded-lg px-3 py-2 text-left text-sm font-medium text-[color:var(--text-secondary)] calm-transition hover:bg-[color:var(--brand-primary-soft)] hover:text-[color:var(--brand-primary-active)] sm:hidden"
                    onClick={handleLogoutClick}
                    disabled={loading}
                  >
                    {loading ? "ログアウト中..." : "ログアウト"}
                  </button>
                )}
              </nav>
            </div>
          )}
        </div>
      </header>

      <ConfirmDialog
        isOpen={showLogoutDialog}
        title="ログアウト"
        message="ログアウトしますか？"
        confirmText="ログアウト"
        cancelText="キャンセル"
        onConfirm={handleConfirmLogout}
        onCancel={handleCancelLogout}
        showBrand
        loading={loading}
        loadingText="ログアウト中..."
      />
    </>
  );
}

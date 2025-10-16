"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, signOut } from "@/lib/firebase/auth.client";
import Button from "./Button";
import ConfirmDialog from "./ConfirmDialog";

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  function handleLogoutClick() {
    setShowLogoutDialog(true);
  }

  async function handleConfirmLogout() {
    setShowLogoutDialog(false);
    try {
      setLoading(true);
      await signOut();
      router.push("/");
    } catch (error) {
      console.error("ログアウトエラー:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleCancelLogout() {
    setShowLogoutDialog(false);
  }

  return (
    <>
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold text-gray-900">頭痛ノート</h1>
            
            {user ? (
              <Button
                onClick={handleLogoutClick}
                disabled={loading}
              >
                {loading ? "ログアウト中..." : "ログアウト"}
              </Button>
            ) : (
              <Button href="/login">
                ログイン
              </Button>
            )}
          </div>
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
      />
    </>
  );
}

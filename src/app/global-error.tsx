"use client";

import { useEffect } from "react";
import AppErrorPage from "@/components/AppErrorPage";
import "./globals.css";

type GlobalErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalErrorPage({ error, reset }: GlobalErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ja">
      <body>
        <AppErrorPage
          description="アプリ全体の表示中に問題が発生しました。時間を置いてもう一度お試しください。"
          onReset={reset}
        />
      </body>
    </html>
  );
}

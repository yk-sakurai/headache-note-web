"use client";

import { useEffect } from "react";
import AppErrorPage from "@/components/AppErrorPage";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <AppErrorPage
      description="ページの表示中に問題が発生しました。入力内容を確認し、時間を置いてもう一度お試しください。"
      onReset={reset}
    />
  );
}

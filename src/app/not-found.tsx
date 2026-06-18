import type { Metadata } from "next";
import AppErrorPage from "@/components/AppErrorPage";

export const metadata: Metadata = {
  title: "ページを表示できませんでした | 頭痛ノート",
};

export default function NotFound() {
  return (
    <AppErrorPage
      title="ページを表示できませんでした"
      description="お探しのページは見つからないか、URLが変わっている可能性があります。トップページから必要な画面へ戻れます。"
    />
  );
}

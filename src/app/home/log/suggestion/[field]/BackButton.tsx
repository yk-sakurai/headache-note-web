"use client";

/**
 * 入力候補の編集画面で使う「記録フォームに戻る」ボタン。
 *
 * このボタン自身は画面遷移（router.back() など）を行わない。
 * クリック時は親から受け取った onClick を呼ぶだけで、実際に戻るかどうかは
 * 親側の共通処理（requestLeave）が判断する。
 * これにより、未保存の変更がある場合は確認ダイアログを出すなど、
 * 他の戻る操作と同じルールで離脱を扱える。
 */
export default function BackButton({
  onClick,
  disabled = false,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex text-sm font-medium text-[color:var(--brand-primary-active)] underline-offset-4 hover:underline disabled:pointer-events-none disabled:opacity-50"
    >
      ← 記録フォームに戻る
    </button>
  );
}

"use client";

import { useEffect, useId, useRef } from "react";
import Button from "@/components/Button";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/**
 * 未保存の変更がある状態で離脱しようとしたときの3択確認。
 * `ConfirmDialog` のフォーカストラップ・Esc・aria-modal の実装を踏襲する。
 */
export default function UnsavedChangesDialog({
  isOpen,
  saving,
  errorMessage,
  onSave,
  onDiscard,
  onCancel,
}: {
  isOpen: boolean;
  saving: boolean;
  errorMessage?: string | null;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  const descriptionId = `${titleId}-description`;
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previousActiveElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusTimer = window.setTimeout(() => {
      dialogRef.current?.querySelector<HTMLElement>(focusableSelector)?.focus();
    }, 0);

    return () => {
      window.clearTimeout(focusTimer);
      previousActiveElement?.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        if (!saving) {
          event.preventDefault();
          onCancel();
        }
        return;
      }
      if (event.key !== "Tab") return;

      const dialog = dialogRef.current;
      if (!dialog) return;

      const focusableElements = Array.from(
        dialog.querySelectorAll<HTMLElement>(focusableSelector)
      ).filter((element) => !element.hasAttribute("disabled"));

      if (focusableElements.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
        return;
      }
      if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel, saving]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color:var(--brand-mint-bg)]/95 px-4 py-8">
      <div
        className="absolute inset-0 bg-white/20"
        onClick={() => {
          if (!saving) onCancel();
        }}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        aria-busy={saving ? "true" : undefined}
        tabIndex={-1}
        className="relative w-full max-w-sm rounded-lg border border-[color:var(--brand-mint-border)] bg-[color:var(--surface)] px-6 py-7 text-center shadow-[0_10px_30px_rgb(23_33_29_/_0.08)] sm:px-8 sm:py-8"
      >
        <h2 id={titleId} className="text-xl font-semibold text-[color:var(--text-primary)]">
          変更が保存されていません
        </h2>
        <p id={descriptionId} className="mt-3 text-sm leading-6 text-[color:var(--text-secondary)]">
          入力候補の変更を保存しますか？
        </p>
        {errorMessage && (
          <p className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </p>
        )}
        <div className="mt-7 flex flex-col gap-2">
          <Button onClick={onSave} disabled={saving} className="w-full">
            {saving ? "保存中..." : "保存する"}
          </Button>
          <Button onClick={onDiscard} variant="secondary" disabled={saving} className="w-full">
            保存しない
          </Button>
          <Button onClick={onCancel} variant="secondary" disabled={saving} className="w-full">
            キャンセル
          </Button>
        </div>
      </div>
    </div>
  );
}

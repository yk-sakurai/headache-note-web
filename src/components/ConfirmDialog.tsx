"use client";

import Image from "next/image";
import { useEffect, useId, useRef } from "react";
import Button from "./Button";

interface ConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  showBrand?: boolean;
  loading?: boolean;
  loadingText?: string;
}

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export default function ConfirmDialog({
  isOpen,
  title = "確認",
  message,
  confirmText = "OK",
  cancelText = "キャンセル",
  onConfirm,
  onCancel,
  showBrand = false,
  loading = false,
  loadingText = "処理中...",
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = `${titleId}-description`;
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousActiveElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const focusTimer = window.setTimeout(() => {
      const firstFocusableElement =
        dialogRef.current?.querySelector<HTMLElement>(focusableSelector);
      firstFocusableElement?.focus();
    }, 0);

    return () => {
      window.clearTimeout(focusTimer);
      previousActiveElement?.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !loading) {
      return;
    }

    dialogRef.current?.focus();
  }, [isOpen, loading]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        if (!loading) {
          event.preventDefault();
          onCancel();
        }
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const dialog = dialogRef.current;
      if (!dialog) {
        return;
      }

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
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, loading, onCancel]);

  if (!isOpen) return null;

  function handleCancel() {
    if (!loading) {
      onCancel();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color:var(--brand-mint-bg)]/95 px-4 py-8">
      <div
        className="absolute inset-0 bg-white/20"
        onClick={handleCancel}
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        aria-busy={loading ? "true" : undefined}
        tabIndex={-1}
        className="relative w-full max-w-sm rounded-lg border border-[color:var(--brand-mint-border)] bg-[color:var(--surface)] px-6 py-7 text-center shadow-[0_10px_30px_rgb(23_33_29_/_0.08)] sm:px-8 sm:py-8"
      >
        {showBrand && (
          <div className="mb-7 flex items-center justify-center gap-3 text-[color:var(--brand-primary)]">
            <Image
              src="/brand/logo-mark.svg"
              alt=""
              width={44}
              height={44}
              className="h-10 w-10"
              aria-hidden="true"
              priority
            />
            <span className="text-2xl font-semibold">頭痛ノート</span>
          </div>
        )}

        <h2
          id={titleId}
          className="text-xl font-semibold text-[color:var(--text-primary)]"
        >
          {title}
        </h2>

        <p
          id={descriptionId}
          className="mt-3 text-sm leading-6 text-[color:var(--text-secondary)]"
        >
          {message}
        </p>

        <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:justify-center sm:gap-3">
          <Button
            onClick={handleCancel}
            variant="secondary"
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {cancelText}
          </Button>
          <Button
            onClick={onConfirm}
            variant="primary"
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {loading ? loadingText : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}

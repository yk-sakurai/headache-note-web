"use client";

import { useEffect, useId, useRef, useState } from "react";
import Button from "@/components/Button";
import type { SuggestionFieldKey } from "@/lib/firestore/suggestion-types";
import type {
  SuggestionDraftInput,
  SuggestionInputErrors,
} from "@/lib/firestore/suggestion-validation";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

const inputClass =
  "h-11 w-full rounded border border-[color:var(--border)] bg-white px-3 text-base text-[color:var(--text-primary)] outline-none calm-transition focus:border-[color:var(--brand-primary)] focus:ring-2 focus:ring-[color:var(--brand-primary-soft)]";

const labelClass = "text-sm font-medium text-[color:var(--text-primary)]";

export type SuggestionItemDialogProps = {
  isOpen: boolean;
  mode: "add" | "edit";
  fieldKey: SuggestionFieldKey;
  fieldLabel: string;
  initialDraft: SuggestionDraftInput;
  /** 入力中の値。再マウント時に入力途中の内容を引き継ぐ */
  currentDraft?: SuggestionDraftInput;
  errors: SuggestionInputErrors;
  generalError?: string | null;
  /** 変更済みの下書きを閉じるときの破棄確認中かどうか */
  discardConfirmOpen: boolean;
  onApply: (draft: SuggestionDraftInput) => void;
  onRequestClose: (draft: SuggestionDraftInput, isDirty: boolean) => void;
  onDiscardConfirm: () => void;
  onDiscardCancel: () => void;
  onDraftChange: (draft: SuggestionDraftInput, isDirty: boolean) => void;
};

const isSameDraft = (a: SuggestionDraftInput, b: SuggestionDraftInput) =>
  a.text === b.text && a.name === b.name && a.dosage === b.dosage && a.unit === b.unit;

/**
 * 候補の追加・編集モーダル。
 * `ConfirmDialog` のフォーカストラップ・Esc・aria-modal の実装を踏襲する。
 */
export default function SuggestionItemDialog({
  isOpen,
  mode,
  fieldKey,
  fieldLabel,
  initialDraft,
  currentDraft,
  errors,
  generalError,
  discardConfirmOpen,
  onApply,
  onRequestClose,
  onDiscardConfirm,
  onDiscardCancel,
  onDraftChange,
}: SuggestionItemDialogProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<SuggestionDraftInput>(currentDraft ?? initialDraft);
  const isMedication = fieldKey === "medications";

  // 入力のたびに effect を再実行しないよう、引き継ぎ値は ref 経由で読む。
  const currentDraftRef = useRef(currentDraft);
  currentDraftRef.current = currentDraft;

  useEffect(() => {
    if (!isOpen) return;
    // 開き直しのたびに初期値へ戻す。再マウント時だけ入力途中の値を引き継ぐ。
    setDraft(currentDraftRef.current ?? initialDraft);
  }, [initialDraft, isOpen]);

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

  const draftRef = useRef(draft);
  draftRef.current = draft;

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        if (discardConfirmOpen) {
          onDiscardCancel();
          return;
        }
        const current = draftRef.current;
        onRequestClose(current, !isSameDraft(current, initialDraft));
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
  }, [discardConfirmOpen, initialDraft, isOpen, onDiscardCancel, onRequestClose]);

  if (!isOpen) return null;

  const updateDraft = (patch: Partial<SuggestionDraftInput>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    onDraftChange(next, !isSameDraft(next, initialDraft));
  };

  const requestClose = () => {
    onRequestClose(draft, !isSameDraft(draft, initialDraft));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color:var(--brand-mint-bg)]/95 px-4 py-8">
      <div className="absolute inset-0 bg-white/20" onClick={requestClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative w-full max-w-md rounded-lg border border-[color:var(--brand-mint-border)] bg-[color:var(--surface)] px-6 py-7 shadow-[0_10px_30px_rgb(23_33_29_/_0.08)] sm:px-8"
      >
        <h2 id={titleId} className="text-lg font-semibold text-[color:var(--text-primary)]">
          {mode === "add" ? "候補を追加" : "候補を編集"}
        </h2>

        {discardConfirmOpen ? (
          <div className="mt-5 space-y-5">
            <p className="text-sm leading-6 text-[color:var(--text-secondary)]">
              入力中の内容は反映されていません。破棄しますか？
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={onDiscardCancel} className="w-full sm:w-auto">
                入力に戻る
              </Button>
              <Button onClick={onDiscardConfirm} className="w-full sm:w-auto">
                破棄する
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {isMedication ? (
              <>
                <label className="block space-y-2">
                  <span className={labelClass}>薬の名前</span>
                  <input
                    className={inputClass}
                    value={draft.name}
                    onChange={(event) => updateDraft({ name: event.target.value })}
                    aria-invalid={Boolean(errors.name)}
                  />
                  {errors.name && <span className="block text-sm text-red-600">{errors.name}</span>}
                </label>
                <label className="block space-y-2">
                  <span className={labelClass}>用量</span>
                  <input
                    className={inputClass}
                    inputMode="decimal"
                    value={draft.dosage}
                    onChange={(event) => updateDraft({ dosage: event.target.value })}
                    aria-invalid={Boolean(errors.dosage)}
                  />
                  {errors.dosage && (
                    <span className="block text-sm text-red-600">{errors.dosage}</span>
                  )}
                </label>
                <label className="block space-y-2">
                  <span className={labelClass}>単位</span>
                  <input
                    className={inputClass}
                    value={draft.unit}
                    onChange={(event) => updateDraft({ unit: event.target.value })}
                    aria-invalid={Boolean(errors.unit)}
                  />
                  {errors.unit && <span className="block text-sm text-red-600">{errors.unit}</span>}
                </label>
              </>
            ) : (
              <label className="block space-y-2">
                <span className={labelClass}>{fieldLabel}</span>
                <input
                  className={inputClass}
                  value={draft.text}
                  onChange={(event) => updateDraft({ text: event.target.value })}
                  aria-invalid={Boolean(errors.text)}
                />
                {errors.text && <span className="block text-sm text-red-600">{errors.text}</span>}
              </label>
            )}

            {generalError && <p className="text-sm text-red-600">{generalError}</p>}

            <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={requestClose} className="w-full sm:w-auto">
                キャンセル
              </Button>
              <Button onClick={() => onApply(draft)} className="w-full sm:w-auto">
                反映
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import type { MergedSuggestionItem } from "@/lib/firestore/suggestion-types";

type SuggestionChipsProps = {
  items?: MergedSuggestionItem[];
  onSelect: (item: MergedSuggestionItem) => void;
  onAddEmpty: () => void;
  editHref?: string;
};

const sourceLabel = (item: MergedSuggestionItem) => {
  if (item.isManual) return "手動";
  if (item.autoSourceType === "mostFrequent") return "よく使う";
  return "直近";
};

const sourceClassName = (item: MergedSuggestionItem) => {
  if (item.isManual) {
    return "border-[color:var(--brand-mint-border)] bg-[color:var(--brand-primary-soft)] text-[color:var(--brand-primary-active)]";
  }
  if (item.autoSourceType === "mostFrequent") {
    return "border-blue-100 bg-blue-50 text-blue-700";
  }
  return "border-[color:var(--border-subtle)] bg-[color:var(--surface-muted)] text-[color:var(--text-secondary)]";
};

export default function SuggestionChips({
  items,
  onSelect,
  onAddEmpty,
  editHref,
}: SuggestionChipsProps) {
  if (!editHref && (!items || items.length === 0)) return null;

  const suggestionItems = items ?? [];
  const hasItems = suggestionItems.length > 0;
  const isEmpty = items !== undefined && items.length === 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-[color:var(--text-muted)]">入力候補</p>
        {editHref && (
          <Link
            href={editHref}
            className="text-xs font-medium text-[color:var(--brand-primary-active)] underline-offset-4 hover:underline"
          >
            編集
          </Link>
        )}
      </div>
      {hasItems && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {suggestionItems.map((item) => (
            <button
              key={`${item.isManual ? "manual" : item.autoSourceType}-${item.value.canonicalKey}`}
              type="button"
              onClick={() => onSelect(item)}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded border border-[color:var(--border)] bg-white px-3 text-sm font-medium text-[color:var(--text-primary)] calm-transition hover:border-[color:var(--brand-mint-border)] hover:bg-[color:var(--brand-primary-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-primary)]"
            >
              <span className="max-w-44 truncate">{item.value.displayText}</span>
              <span
                className={`rounded border px-1.5 py-0.5 text-[11px] leading-none ${sourceClassName(
                  item
                )}`}
              >
                {sourceLabel(item)}
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={onAddEmpty}
            className="inline-flex h-10 shrink-0 items-center rounded border border-dashed border-[color:var(--brand-mint-border)] bg-[color:var(--surface)] px-3 text-sm font-medium text-[color:var(--brand-primary-active)] calm-transition hover:bg-[color:var(--brand-primary-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-primary)]"
          >
            + 追加
          </button>
        </div>
      )}
      {isEmpty && (
        <p className="text-xs text-[color:var(--text-muted)]">候補はまだありません。</p>
      )}
    </div>
  );
}

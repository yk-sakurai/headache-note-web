"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function DragHandleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 20" className="h-5 w-4" fill="currentColor">
      <circle cx="5" cy="4" r="1.5" />
      <circle cx="11" cy="4" r="1.5" />
      <circle cx="5" cy="10" r="1.5" />
      <circle cx="11" cy="10" r="1.5" />
      <circle cx="5" cy="16" r="1.5" />
      <circle cx="11" cy="16" r="1.5" />
    </svg>
  );
}

const moveButtonClass =
  "inline-flex h-9 w-9 items-center justify-center rounded border border-[color:var(--border)] bg-white text-sm text-[color:var(--text-secondary)] calm-transition hover:border-[color:var(--brand-mint-border)] hover:bg-[color:var(--brand-primary-soft)] hover:text-[color:var(--brand-primary-active)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-primary)] disabled:pointer-events-none disabled:opacity-40";

/**
 * 並べ替えモードの行。
 * ドラッグが難しい場合の代替として「上へ / 下へ」ボタンも置く（キーボード・支援技術での操作手段）。
 */
export default function SortableSuggestionRow({
  id,
  label,
  displayText,
  badge,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
}: {
  id: string;
  label: string;
  displayText: string;
  badge: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.96 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded border border-[color:var(--border-subtle)] bg-[color:var(--surface-muted)] p-3"
    >
      <button
        type="button"
        className="inline-flex h-9 w-9 shrink-0 cursor-grab touch-none items-center justify-center rounded text-[color:var(--text-muted)] calm-transition hover:bg-[color:var(--brand-primary-soft)] hover:text-[color:var(--brand-primary-active)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-primary)] active:cursor-grabbing"
        aria-label={`${displayText}を並べ替え`}
        {...attributes}
        {...listeners}
      >
        <DragHandleIcon />
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-[color:var(--text-primary)]">{displayText}</p>
        <p className="text-xs text-[color:var(--text-muted)]">
          {label} / {badge}
        </p>
      </div>
      <div className="flex shrink-0 gap-1">
        <button
          type="button"
          className={moveButtonClass}
          aria-label={`${displayText}を上へ移動`}
          disabled={!canMoveUp}
          onClick={onMoveUp}
        >
          ↑
        </button>
        <button
          type="button"
          className={moveButtonClass}
          aria-label={`${displayText}を下へ移動`}
          disabled={!canMoveDown}
          onClick={onMoveDown}
        >
          ↓
        </button>
      </div>
    </div>
  );
}

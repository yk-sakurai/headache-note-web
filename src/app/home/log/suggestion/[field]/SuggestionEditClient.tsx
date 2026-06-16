"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import { getCurrentUser } from "@/lib/firebase/auth.client";
import {
  ClientHeadacheLogPreferenceRepository,
  ClientHeadacheLogRepository,
} from "@/lib/firestore/repositories/client";
import {
  buildAutoSuggestions,
  computeFieldValues,
  createMedicationSuggestionValue,
  createTextSuggestionValue,
  getSuggestionSetting,
  type AutoSuggestionItem,
  type AutoSuggestionOverride,
  type ManualSuggestionItem,
  type SuggestionFieldKey,
  type SuggestionSourceType,
  type SuggestionValue,
} from "@/lib/firestore/suggestion-types";

type SuggestionEditClientProps = {
  fieldKey: SuggestionFieldKey;
  fieldLabel: string;
};

type DraftState = {
  index: number | null;
  text: string;
  name: string;
  dosage: string;
  unit: string;
  error: string;
};

const MAX_MANUAL_ITEMS = 20;

const emptyDraft: DraftState = {
  index: null,
  text: "",
  name: "",
  dosage: "",
  unit: "",
  error: "",
};

const sourceLabel = (sourceType: SuggestionSourceType) =>
  sourceType === "mostFrequent" ? "最もよく使う" : "直近の入力";

const createSuggestionRange = () => {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(start.getDate() - 364);
  start.setHours(0, 0, 0, 0);
  return { startMs: start.getTime(), endMs: end.getTime() };
};

const getAutoOverrideKey = (sourceType: SuggestionSourceType) =>
  sourceType === "mostFrequent" ? "mostFrequentOverride" : "mostRecentOverride";

export default function SuggestionEditClient({ fieldKey, fieldLabel }: SuggestionEditClientProps) {
  const router = useRouter();
  const [setting, setSetting] = useState(() => getSuggestionSetting(undefined, fieldKey));
  const [autoSuggestions, setAutoSuggestions] = useState<AutoSuggestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState>(emptyDraft);
  const [draftOpen, setDraftOpen] = useState(false);

  const isMedication = fieldKey === "medications";

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const user = getCurrentUser();
        if (!user) {
          if (mounted) {
            setPageError("ログインが必要です。");
            setLoading(false);
          }
          return;
        }

        const { startMs, endMs } = createSuggestionRange();
        const [preference, logs] = await Promise.all([
          ClientHeadacheLogPreferenceRepository.getByUserId(user.uid),
          ClientHeadacheLogRepository.listLogsInRange(user.uid, startMs, endMs),
        ]);

        if (!mounted) return;

        const nextSetting = getSuggestionSetting(preference?.data.suggestionSettings, fieldKey);
        const values = computeFieldValues(logs, fieldKey);
        setSetting(nextSetting);
        setAutoSuggestions(buildAutoSuggestions(values));
        setLoading(false);
      } catch (error) {
        console.error("入力候補設定取得エラー:", error);
        if (mounted) {
          setPageError("入力候補を読み込めませんでした。");
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [fieldKey]);

  const sortedManualItems = useMemo(() => {
    return setting.manualItems
      .map((item, index) => ({ item, index }))
      .sort((a, b) => {
        if (a.item.order !== b.item.order) return a.item.order - b.item.order;
        return a.item.value.canonicalKey.localeCompare(b.item.value.canonicalKey, "ja");
      });
  }, [setting.manualItems]);

  const startAdd = () => {
    const nextOrder =
      setting.manualItems.reduce((max, item) => Math.max(max, item.order), 0) + 1;
    setDraftOpen(true);
    setDraft({
      ...emptyDraft,
      text: "",
      dosage: "",
      unit: "",
      index: null,
    });
    setSetting((current) => ({
      ...current,
      manualItems: current.manualItems.map((item) => item),
    }));
    if (nextOrder > MAX_MANUAL_ITEMS + 1) {
      setDraft((current) => ({ ...current, error: "手動候補は20件までです。" }));
    }
  };

  const startEdit = (item: ManualSuggestionItem, index: number) => {
    setDraftOpen(true);
    if (item.value.type === "medication") {
      setDraft({
        index,
        text: "",
        name: item.value.name,
        dosage: String(item.value.dosage),
        unit: item.value.unit,
        error: "",
      });
      return;
    }

    setDraft({
      index,
      text: item.value.text,
      name: "",
      dosage: "",
      unit: "",
      error: "",
    });
  };

  const buildDraftValue = (): SuggestionValue | null => {
    if (isMedication) {
      return createMedicationSuggestionValue({
        name: draft.name,
        dosage: draft.dosage,
        unit: draft.unit,
      });
    }

    return createTextSuggestionValue(draft.text);
  };

  const saveDraft = () => {
    const value = buildDraftValue();
    if (!value) {
      setDraft((current) => ({ ...current, error: "候補を入力してください。" }));
      return;
    }

    const duplicate = setting.manualItems.some((item, index) => {
      return index !== draft.index && item.value.canonicalKey === value.canonicalKey;
    });
    if (duplicate) {
      setDraft((current) => ({ ...current, error: "同じ候補がすでにあります。" }));
      return;
    }

    if (draft.index === null && setting.manualItems.length >= MAX_MANUAL_ITEMS) {
      setDraft((current) => ({ ...current, error: "手動候補は20件までです。" }));
      return;
    }

    setSetting((current) => {
      if (draft.index !== null) {
        return {
          ...current,
          manualItems: current.manualItems.map((item, index) =>
            index === draft.index ? { ...item, value } : item
          ),
        };
      }

      const nextOrder =
        current.manualItems.reduce((max, item) => Math.max(max, item.order), 0) + 1;
      return {
        ...current,
        manualItems: [
          ...current.manualItems,
          {
            value,
            isVisible: true,
            order: nextOrder,
          },
        ],
      };
    });
    setDraft(emptyDraft);
    setDraftOpen(false);
  };

  const updateManualItem = (index: number, patch: Partial<ManualSuggestionItem>) => {
    setSetting((current) => ({
      ...current,
      manualItems: current.manualItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      ),
    }));
  };

  const deleteManualItem = (index: number) => {
    setSetting((current) => ({
      ...current,
      manualItems: current.manualItems.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const updateAutoOverride = (
    sourceType: SuggestionSourceType,
    patch: AutoSuggestionOverride
  ) => {
    const key = getAutoOverrideKey(sourceType);
    setSetting((current) => ({
      ...current,
      [key]: {
        ...(current[key] ?? {}),
        ...patch,
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      const user = getCurrentUser();
      if (!user) throw new Error("ログインが必要です");
      await ClientHeadacheLogPreferenceRepository.saveSuggestionSetting(user.uid, fieldKey, setting);
      setSaveMessage("保存しました。");
      router.back();
    } catch (error) {
      console.error("入力候補設定保存エラー:", error);
      setSaveMessage("保存できませんでした。もう一度お試しください。");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <p className="rounded border border-[color:var(--brand-mint-border)] bg-white px-4 py-3 text-sm text-[color:var(--text-secondary)]">
        読み込み中...
      </p>
    );
  }

  if (pageError) {
    return (
      <p className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {pageError}
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-[color:var(--brand-mint-border)] bg-white p-5 shadow-[0_10px_30px_rgb(23_33_29_/_0.04)]">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-[color:var(--text-primary)]">
              手動候補
            </h2>
            <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
              よく使う候補を20件まで保存できます。
            </p>
          </div>
          <Button type="button" variant="secondary" onClick={startAdd}>
            追加
          </Button>
        </div>

        <div className="space-y-3">
          {sortedManualItems.length === 0 ? (
            <p className="text-sm text-[color:var(--text-secondary)]">
              手動候補はまだありません。
            </p>
          ) : (
            sortedManualItems.map(({ item, index }) => (
              <div
                key={`${item.value.canonicalKey}-${index}`}
                className="space-y-3 rounded border border-[color:var(--border-subtle)] bg-[color:var(--surface-muted)] p-3"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-[color:var(--text-primary)]">
                      {item.value.displayText}
                    </p>
                    <p className="text-xs text-[color:var(--text-muted)]">
                      {item.value.canonicalKey}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-9 px-3"
                      onClick={() => startEdit(item, index)}
                    >
                      編集
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-9 px-3"
                      onClick={() => deleteManualItem(index)}
                    >
                      削除
                    </Button>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="inline-flex items-center gap-2 text-sm font-medium text-[color:var(--text-primary)]">
                    <input
                      type="checkbox"
                      checked={item.isVisible}
                      onChange={(event) =>
                        updateManualItem(index, { isVisible: event.target.checked })
                      }
                      className="h-4 w-4 accent-[color:var(--brand-primary)]"
                    />
                    表示する
                  </label>
                  <label className="space-y-1 text-sm font-medium text-[color:var(--text-primary)]">
                    <span>順番</span>
                    <input
                      type="number"
                      min={1}
                      value={item.order}
                      onChange={(event) =>
                        updateManualItem(index, {
                          order: Number(event.target.value) || item.order,
                        })
                      }
                      className="h-10 w-full rounded border border-[color:var(--border)] bg-white px-3 text-sm outline-none calm-transition focus:border-[color:var(--brand-primary)] focus:ring-2 focus:ring-[color:var(--brand-primary-soft)]"
                    />
                  </label>
                </div>
              </div>
            ))
          )}
        </div>

        {draftOpen && (
          <div className="mt-4 space-y-3 rounded border border-[color:var(--brand-mint-border)] bg-[color:var(--brand-mint-bg)] p-4">
            <h3 className="text-sm font-semibold text-[color:var(--text-primary)]">
              {draft.index === null ? "候補を追加" : "候補を編集"}
            </h3>
            {isMedication ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="space-y-1 text-sm font-medium text-[color:var(--text-primary)]">
                  <span>薬の名前</span>
                  <input
                    value={draft.name}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, name: event.target.value, error: "" }))
                    }
                    className="h-10 w-full rounded border border-[color:var(--border)] bg-white px-3 text-sm outline-none calm-transition focus:border-[color:var(--brand-primary)] focus:ring-2 focus:ring-[color:var(--brand-primary-soft)]"
                  />
                </label>
                <label className="space-y-1 text-sm font-medium text-[color:var(--text-primary)]">
                  <span>用量</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={draft.dosage}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        dosage: event.target.value,
                        error: "",
                      }))
                    }
                    className="h-10 w-full rounded border border-[color:var(--border)] bg-white px-3 text-sm outline-none calm-transition focus:border-[color:var(--brand-primary)] focus:ring-2 focus:ring-[color:var(--brand-primary-soft)]"
                  />
                </label>
                <label className="space-y-1 text-sm font-medium text-[color:var(--text-primary)]">
                  <span>単位</span>
                  <input
                    value={draft.unit}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, unit: event.target.value, error: "" }))
                    }
                    className="h-10 w-full rounded border border-[color:var(--border)] bg-white px-3 text-sm outline-none calm-transition focus:border-[color:var(--brand-primary)] focus:ring-2 focus:ring-[color:var(--brand-primary-soft)]"
                  />
                </label>
              </div>
            ) : (
              <label className="space-y-1 text-sm font-medium text-[color:var(--text-primary)]">
                <span>{fieldLabel}</span>
                <input
                  value={draft.text}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, text: event.target.value, error: "" }))
                  }
                  className="h-10 w-full rounded border border-[color:var(--border)] bg-white px-3 text-sm outline-none calm-transition focus:border-[color:var(--brand-primary)] focus:ring-2 focus:ring-[color:var(--brand-primary-soft)]"
                />
              </label>
            )}
            {draft.error && <p className="text-sm text-red-600">{draft.error}</p>}
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={saveDraft}>
                反映
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setDraft(emptyDraft);
                  setDraftOpen(false);
                }}
              >
                キャンセル
              </Button>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-[color:var(--brand-mint-border)] bg-white p-5 shadow-[0_10px_30px_rgb(23_33_29_/_0.04)]">
        <h2 className="text-base font-semibold text-[color:var(--text-primary)]">自動候補</h2>
        <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
          直近1年分の記録から作成されます。削除はできません。
        </p>
        <div className="mt-4 space-y-3">
          {autoSuggestions.length === 0 ? (
            <p className="text-sm text-[color:var(--text-secondary)]">
              自動候補はまだありません。
            </p>
          ) : (
            autoSuggestions.map((item) => {
              const key = getAutoOverrideKey(item.sourceType);
              const override = setting[key];
              const visible = override?.isVisible ?? true;
              const order = override?.order ?? item.generationIndex;
              return (
                <div
                  key={`${item.sourceType}-${item.value.canonicalKey}`}
                  className="space-y-3 rounded border border-[color:var(--border-subtle)] bg-[color:var(--surface-muted)] p-3"
                >
                  <div>
                    <p className="font-medium text-[color:var(--text-primary)]">
                      {item.value.displayText}
                    </p>
                    <p className="text-xs text-[color:var(--text-muted)]">
                      {sourceLabel(item.sourceType)}
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="inline-flex items-center gap-2 text-sm font-medium text-[color:var(--text-primary)]">
                      <input
                        type="checkbox"
                        checked={visible}
                        onChange={(event) =>
                          updateAutoOverride(item.sourceType, {
                            isVisible: event.target.checked,
                          })
                        }
                        className="h-4 w-4 accent-[color:var(--brand-primary)]"
                      />
                      表示する
                    </label>
                    <label className="space-y-1 text-sm font-medium text-[color:var(--text-primary)]">
                      <span>順番</span>
                      <input
                        type="number"
                        min={1}
                        value={order}
                        onChange={(event) =>
                          updateAutoOverride(item.sourceType, {
                            order: Number(event.target.value) || item.generationIndex,
                          })
                        }
                        className="h-10 w-full rounded border border-[color:var(--border)] bg-white px-3 text-sm outline-none calm-transition focus:border-[color:var(--brand-primary)] focus:ring-2 focus:ring-[color:var(--brand-primary-soft)]"
                      />
                    </label>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {saveMessage && (
        <p className="rounded border border-[color:var(--brand-mint-border)] bg-[color:var(--brand-primary-soft)] px-4 py-3 text-sm text-[color:var(--brand-primary-active)]">
          {saveMessage}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="button" disabled={saving} onClick={handleSave}>
          {saving ? "保存中..." : "保存"}
        </Button>
        <Button type="button" variant="secondary" disabled={saving} onClick={() => router.back()}>
          戻る
        </Button>
      </div>
    </div>
  );
}

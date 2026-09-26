"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Button from "@/components/Button";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useSuggestionNavigation } from "@/components/SuggestionNavigationProvider";
import { getCurrentUser } from "@/lib/firebase/auth.client";
import {
  ClientHeadacheLogPreferenceRepository,
  ClientHeadacheLogRepository,
} from "@/lib/firestore/repositories/client";
import {
  buildAutoSuggestions,
  computeFieldValues,
  createSuggestionRange,
  readSuggestionSettingForEdit,
  type SuggestionFieldKey,
  type SuggestionSourceType,
} from "@/lib/firestore/suggestion-types";
import {
  addManualItem,
  canStartAdd,
  createEditorSnapshot,
  createEditorState,
  diagnoseEditor,
  getEditorAutoEntries,
  getTotalManualCount,
  getVisibleManualCount,
  removeManualItem,
  reorderItems,
  setAutoVisibility,
  setManualVisibility,
  updateManualItem,
  validateEditorForSave,
  type SuggestionEditorState,
} from "@/lib/firestore/suggestion-editor";
import {
  buildSuggestionValueFromDraft,
  EMPTY_SUGGESTION_DRAFT,
  hasSuggestionInputErrors,
  rawInputToDraft,
  validateSuggestionDraft,
  type SuggestionDraftInput,
  type SuggestionInputErrors,
} from "@/lib/firestore/suggestion-validation";
import { MANUAL_DISPLAY_LIMIT, MANUAL_SAVE_LIMIT } from "@/lib/headache-log-constraints";
import { SUPPORT_EMAIL } from "@/lib/constants";
import BackButton from "./BackButton";
import SortableSuggestionRow from "./SortableSuggestionRow";
import SuggestionItemDialog from "./SuggestionItemDialog";

type SuggestionEditClientProps = {
  fieldKey: SuggestionFieldKey;
  fieldLabel: string;
};

type EditorMode = "visibility" | "reorder";

type DialogState = {
  open: boolean;
  mode: "add" | "edit";
  entryId: string | null;
  initialDraft: SuggestionDraftInput;
  /** 入力中の値。再マウント時の復元に使う */
  draft: SuggestionDraftInput;
  errors: SuggestionInputErrors;
  generalError: string | null;
  dirty: boolean;
  discardConfirm: boolean;
};

const closedDialog: DialogState = {
  open: false,
  mode: "add",
  entryId: null,
  initialDraft: EMPTY_SUGGESTION_DRAFT,
  draft: EMPTY_SUGGESTION_DRAFT,
  errors: {},
  generalError: null,
  dirty: false,
  discardConfirm: false,
};

/** Provider へ退避する編集状態。履歴復帰による再マウントで復元する。 */
type EditorStashPayload = {
  state: SuggestionEditorState;
  baseline: string | null;
  dialog: DialogState;
  mode: EditorMode;
};

const readStashPayload = (payload: unknown): EditorStashPayload | null => {
  if (typeof payload !== "object" || payload === null) return null;
  const candidate = payload as Partial<EditorStashPayload>;
  if (!candidate.state || !candidate.dialog) return null;
  return {
    state: candidate.state,
    baseline: candidate.baseline ?? null,
    dialog: candidate.dialog,
    mode: candidate.mode === "reorder" ? "reorder" : "visibility",
  };
};

const AUTO_SOURCE_LABEL: Record<SuggestionSourceType, string> = {
  mostFrequent: "最もよく使う",
  mostRecent: "直近の入力",
};

const DRAFT_OPEN_MESSAGE = "先に入力中の候補を反映または破棄してください。";

const cardClass =
  "rounded-lg border border-[color:var(--brand-mint-border)] bg-white p-5 shadow-[0_10px_30px_rgb(23_33_29_/_0.04)]";

const rowClass =
  "space-y-3 rounded border border-[color:var(--border-subtle)] bg-[color:var(--surface-muted)] p-3";

export default function SuggestionEditClient({ fieldKey, fieldLabel }: SuggestionEditClientProps) {
  const nav = useSuggestionNavigation();
  const dndId = useId();

  // 履歴復帰などで再マウントされた場合は、Firestore から読み直さず退避状態から復元する。
  const [session] = useState(() => nav.beginEditorSession(fieldKey));
  const [restored] = useState(() => readStashPayload(session.payload));

  const [loading, setLoading] = useState(restored === null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [state, setState] = useState<SuggestionEditorState | null>(restored?.state ?? null);
  const [baseline, setBaseline] = useState<string | null>(restored?.baseline ?? null);
  const [saving, setSaving] = useState(false);
  const [inlineMessage, setInlineMessage] = useState<string | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [mode, setMode] = useState<EditorMode>(restored?.mode ?? "visibility");
  const [dialog, setDialog] = useState<DialogState>(restored?.dialog ?? closedDialog);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    label: string;
  } | null>(null);

  const stateRef = useRef<SuggestionEditorState | null>(null);
  stateRef.current = state;
  const dialogRef = useRef<DialogState>(dialog);
  dialogRef.current = dialog;
  const baselineRef = useRef<string | null>(baseline);
  baselineRef.current = baseline;
  const modeRef = useRef<EditorMode>(mode);
  modeRef.current = mode;
  const barRef = useRef<HTMLDivElement | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const {
    registerBottomBar,
    registerDraftResolver,
    registerSaveHandler,
    requestLeave,
    setHasChanges,
    setSaveError,
    stashEditorState,
    startEditorGuard,
    stopEditorGuard,
    notifySavedOnArrival,
  } = nav;

  // 読み込み中・取得失敗・認証状態喪失でもガードと戻るを維持するため、
  // 取得の成否によらずセッションを開始する。
  useEffect(() => {
    startEditorGuard(fieldKey, session.sessionId);
    return () => stopEditorGuard();
  }, [fieldKey, session.sessionId, startEditorGuard, stopEditorGuard]);

  // React の effect を待たず、変更操作と同じ処理内で Provider の保持状態へ反映する。
  const commitStash = useCallback(() => {
    if (!stateRef.current) return;
    stashEditorState(fieldKey, session.sessionId, {
      payload: {
        state: stateRef.current,
        baseline: baselineRef.current,
        dialog: dialogRef.current,
        mode: modeRef.current,
      } satisfies EditorStashPayload,
      draftDirty: dialogRef.current.open && dialogRef.current.dirty,
    });
  }, [fieldKey, session.sessionId, stashEditorState]);

  const applyEditorState = useCallback(
    (next: SuggestionEditorState) => {
      stateRef.current = next;
      setState(next);
      commitStash();
    },
    [commitStash]
  );

  const applyDialog = useCallback(
    (next: DialogState) => {
      dialogRef.current = next;
      setDialog(next);
      commitStash();
    },
    [commitStash]
  );

  const applyBaseline = useCallback(
    (next: string | null) => {
      baselineRef.current = next;
      setBaseline(next);
      commitStash();
    },
    [commitStash]
  );

  const applyMode = useCallback(
    (next: EditorMode) => {
      modeRef.current = next;
      setMode(next);
      commitStash();
    },
    [commitStash]
  );

  // 退避状態から復元した項目は読み直さない（未保存の変更を消さないため）。
  const restoredFieldRef = useRef<string | null>(restored !== null ? fieldKey : null);

  useEffect(() => {
    if (restoredFieldRef.current === fieldKey) return;
    restoredFieldRef.current = null;

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
          ClientHeadacheLogRepository.listLogsInRangeRaw(user.uid, startMs, endMs),
        ]);

        if (!mounted) return;

        const forEdit = readSuggestionSettingForEdit(
          preference?.data.suggestionSettings,
          fieldKey
        );
        const autoSuggestions = buildAutoSuggestions(computeFieldValues(logs, fieldKey));
        const nextState = createEditorState({ fieldKey, forEdit, autoSuggestions });
        stateRef.current = nextState;
        baselineRef.current = createEditorSnapshot(nextState);
        dialogRef.current = closedDialog;
        setState(nextState);
        setBaseline(baselineRef.current);
        setDialog(closedDialog);
        setLoading(false);
        commitStash();
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
  }, [commitStash, fieldKey]);

  const diagnostics = useMemo(() => (state ? diagnoseEditor(state) : null), [state]);
  const autoEntries = useMemo(() => (state ? getEditorAutoEntries(state) : []), [state]);

  const editorDirty = useMemo(() => {
    if (!state || baseline === null) return false;
    return createEditorSnapshot(state) !== baseline;
  }, [baseline, state]);

  const hasChanges = editorDirty || dialog.dirty;

  useEffect(() => {
    setHasChanges(hasChanges);
  }, [hasChanges, setHasChanges]);

  const performSave = useCallback(async (): Promise<boolean> => {
    if (dialogRef.current.open && dialogRef.current.dirty) {
      setSaveError(DRAFT_OPEN_MESSAGE);
      setInlineError(DRAFT_OPEN_MESSAGE);
      return false;
    }

    const current = stateRef.current;
    if (!current) {
      setSaveError("入力候補を読み込めていないため保存できません。");
      return false;
    }

    const validation = validateEditorForSave(current);
    if (!validation.ok) {
      setInlineError(validation.errors[0]);
      setSaveError(validation.errors[0]);
      return false;
    }

    const user = getCurrentUser();
    if (!user) {
      const message = "ログインが必要です。";
      setInlineError(message);
      setSaveError(message);
      return false;
    }

    setSaving(true);
    setInlineError(null);
    try {
      await ClientHeadacheLogPreferenceRepository.saveSuggestionSetting(
        user.uid,
        fieldKey,
        current
      );
      applyBaseline(createEditorSnapshot(current));
      // 保存した状態に対応する dirty を、effect を待たず同期で Controller へ伝える。
      // これがないと「保存して戻る」の直後に未保存確認が再表示される。
      setHasChanges(dialogRef.current.dirty);
      setSaveError(null);
      // 戻り先へ到達できなかった場合でも、保存済みであることを画面に残す。
      setInlineMessage("入力候補を保存しました。");
      notifySavedOnArrival("入力候補を保存しました。");
      return true;
    } catch (error) {
      console.error("入力候補設定保存エラー:", error);
      const message =
        error instanceof Error && error.message
          ? error.message
          : "保存できませんでした。もう一度お試しください。";
      setInlineError(message);
      setSaveError(message);
      return false;
    } finally {
      setSaving(false);
    }
  }, [applyBaseline, fieldKey, notifySavedOnArrival, setHasChanges, setSaveError]);

  useEffect(() => {
    registerSaveHandler(performSave);
    return () => registerSaveHandler(null);
  }, [performSave, registerSaveHandler]);

  // 固定バーの実測高さを Provider へ登録し、Toast をその上へ配置する。
  useEffect(() => {
    const element = barRef.current;
    if (!element) {
      registerBottomBar("suggestion-save-bar", 0);
      return;
    }
    const update = () => registerBottomBar("suggestion-save-bar", element.offsetHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => {
      observer.disconnect();
      registerBottomBar("suggestion-save-bar", 0);
    };
  }, [loading, pageError, registerBottomBar, state]);

  // 離脱要求のうち、未反映の下書きの解決を待っているもの。
  const leaveResolveRef = useRef<{ resume: () => void; abort: () => void } | null>(null);

  /**
   * 画面全体の離脱確認より先に、未反映の下書きを反映／破棄させる。
   * リンク・ブラウザ戻る・画面内の戻るなど、すべての離脱経路がここを通る。
   */
  const resolveDraftBeforeLeave = useCallback(
    (resume: () => void, abort: () => void) => {
      const current = dialogRef.current;
      if (!current.open) return false;
      if (!current.dirty) {
        applyDialog(closedDialog);
        return false;
      }
      leaveResolveRef.current = { resume, abort };
      applyDialog({ ...current, discardConfirm: true });
      return true;
    },
    [applyDialog]
  );

  useEffect(() => {
    registerDraftResolver(resolveDraftBeforeLeave);
    return () => registerDraftResolver(null);
  }, [registerDraftResolver, resolveDraftBeforeLeave]);

  /** 下書きの反映・破棄が終わった時点で、離脱要求を再開する。 */
  const finishDraftResolution = useCallback(() => {
    const pending = leaveResolveRef.current;
    if (!pending) return;
    leaveResolveRef.current = null;

    const current = stateRef.current;
    const editorChanged =
      current !== null && baselineRef.current !== null
        ? createEditorSnapshot(current) !== baselineRef.current
        : false;
    // 反映・破棄後の変更有無を、effect を待たず同期で伝える。
    setHasChanges(editorChanged || dialogRef.current.dirty);
    pending.resume();
  }, [setHasChanges]);

  const cancelDraftResolution = useCallback(() => {
    const pending = leaveResolveRef.current;
    if (!pending) return;
    leaveResolveRef.current = null;
    pending.abort();
  }, []);

  const handleLeave = useCallback(() => {
    if (dialogRef.current.open && !dialogRef.current.dirty) {
      applyDialog(closedDialog);
    }
    // 下書きが残っている場合は、共通の離脱処理から反映／破棄を先に求める。
    requestLeave();
  }, [applyDialog, requestLeave]);

  const handleSaveAndLeave = useCallback(async () => {
    if (dialog.open) {
      setInlineError(DRAFT_OPEN_MESSAGE);
      return;
    }
    const succeeded = await performSave();
    if (succeeded) {
      requestLeave();
    }
  }, [dialog.open, performSave, requestLeave]);

  const applyMutation = (
    result:
      | { ok: true; state: SuggestionEditorState; notice?: string }
      | { ok: false; reason: string }
  ) => {
    if (!result.ok) {
      setInlineError(result.reason);
      return false;
    }
    applyEditorState(result.state);
    setInlineError(null);
    setInlineMessage(result.notice ?? null);
    return true;
  };

  // 下書きモーダル表示中は、背景の操作をハンドラ側でも抑止する（disabled との二重防御）。
  const backgroundBlocked = () => dialogRef.current.open || saving;

  const startAdd = () => {
    if (!state || backgroundBlocked()) return;
    const availability = canStartAdd(state);
    if (!availability.allowed) {
      setInlineError(availability.reason);
      return;
    }
    setInlineError(null);
    applyDialog({
      ...closedDialog,
      open: true,
      mode: "add",
      entryId: null,
      initialDraft: EMPTY_SUGGESTION_DRAFT,
      draft: EMPTY_SUGGESTION_DRAFT,
    });
  };

  const startEdit = (entryId: string) => {
    if (backgroundBlocked()) return;
    const entry = state?.entries.find((item) => item.id === entryId);
    if (!entry) return;
    const initialDraft = rawInputToDraft(entry.rawInput);
    setInlineError(null);
    applyDialog({
      ...closedDialog,
      open: true,
      mode: "edit",
      entryId,
      initialDraft,
      draft: initialDraft,
    });
  };

  const handleApplyDraft = (draft: SuggestionDraftInput) => {
    if (!state) return;
    const errors = validateSuggestionDraft(fieldKey, draft);
    if (hasSuggestionInputErrors(errors)) {
      applyDialog({ ...dialogRef.current, draft, errors, generalError: null });
      return;
    }

    const value = buildSuggestionValueFromDraft(fieldKey, draft);
    if (!value) {
      applyDialog({
        ...dialogRef.current,
        draft,
        errors: {},
        generalError: "候補を作成できませんでした。入力内容を確認してください。",
      });
      return;
    }

    const result =
      dialog.mode === "add"
        ? addManualItem(state, value)
        : updateManualItem(state, dialog.entryId ?? "", value);

    if (!result.ok) {
      applyDialog({ ...dialogRef.current, draft, errors: {}, generalError: result.reason });
      return;
    }

    stateRef.current = result.state;
    dialogRef.current = closedDialog;
    setState(result.state);
    setDialog(closedDialog);
    setInlineMessage(result.notice ?? null);
    setInlineError(null);
    commitStash();

    finishDraftResolution();
  };

  const handleRequestCloseDialog = (draft: SuggestionDraftInput, isDirty: boolean) => {
    if (isDirty) {
      applyDialog({ ...dialogRef.current, draft, discardConfirm: true });
      return;
    }
    applyDialog(closedDialog);
    finishDraftResolution();
  };

  const handleDiscardDraft = () => {
    applyDialog(closedDialog);
    finishDraftResolution();
  };

  const handleDragEnd = (section: "manual" | "auto") => (event: DragEndEvent) => {
    if (!state || backgroundBlocked()) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const ids =
      section === "manual"
        ? state.entries.map((entry) => entry.id)
        : autoEntries.map((entry) => entry.sourceType);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from === -1 || to === -1) return;
    applyEditorState(reorderItems(state, section, from, to));
  };

  const move = (section: "manual" | "auto", index: number, delta: number) => {
    if (!state || backgroundBlocked()) return;
    applyEditorState(reorderItems(state, section, index, index + delta));
  };

  const changeMode = (next: EditorMode) => {
    if (backgroundBlocked()) return;
    applyMode(next);
  };

  const changeManualVisibility = (entryId: string, isVisible: boolean) => {
    if (!state || backgroundBlocked()) return;
    applyMutation(setManualVisibility(state, entryId, isVisible));
  };

  const changeAutoVisibility = (sourceType: SuggestionSourceType, isVisible: boolean) => {
    if (!state || backgroundBlocked()) return;
    applyEditorState(setAutoVisibility(state, sourceType, isVisible));
  };

  const requestDelete = (id: string, label: string) => {
    if (backgroundBlocked()) return;
    setPendingDelete({ id, label });
  };

  const backgroundDisabled = dialog.open || saving;
  const editorReady = !loading && !pageError && state !== null;
  const blocked =
    state?.containerStatus === "invalid" || state?.fieldStatus === "invalid";
  const totalCount = state ? getTotalManualCount(state) : 0;
  const visibleCount = state ? getVisibleManualCount(state) : 0;
  const invalidItemMap = new Map(
    (diagnostics?.invalidManualItems ?? []).map((item) => [item.id, item.errors])
  );

  return (
    <>
      <div className="space-y-3">
        <BackButton onClick={handleLeave} disabled={saving} />
        <h1 className="text-3xl font-semibold tracking-normal">
          {fieldLabel}の入力候補設定
        </h1>
      </div>

      {loading && (
        <p className="rounded border border-[color:var(--brand-mint-border)] bg-white px-4 py-3 text-sm text-[color:var(--text-secondary)]">
          読み込み中...
        </p>
      )}

      {!loading && pageError && (
        <p className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {pageError}
        </p>
      )}

      {editorReady && state && (
        <div className="space-y-5 pb-36">
          {blocked && (
            <div className="space-y-2 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <p>
                候補設定を読み取れないため、編集・保存できません。復旧についてサポートへお問い合わせください。
              </p>
              <p>
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="font-medium underline underline-offset-4"
                >
                  サポートへ問い合わせる
                </a>
                <span className="ml-2 text-[color:var(--text-secondary)]">{SUPPORT_EMAIL}</span>
              </p>
            </div>
          )}

          {diagnostics?.countError && (
            <p className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {diagnostics.countError}
            </p>
          )}
          {diagnostics?.visibleCountError && (
            <p className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {diagnostics.visibleCountError}
            </p>
          )}

          <div
            className="grid grid-cols-2 overflow-hidden rounded border border-[color:var(--border)]"
            role="group"
            aria-label="編集モード"
          >
            <button
              type="button"
              disabled={backgroundDisabled}
              onClick={() => changeMode("visibility")}
              aria-pressed={mode === "visibility"}
              className={`h-10 text-sm font-medium calm-transition disabled:pointer-events-none disabled:opacity-50 ${
                mode === "visibility"
                  ? "bg-[color:var(--brand-primary)] text-[color:var(--brand-on-primary)]"
                  : "bg-white text-[color:var(--text-secondary)] hover:bg-[color:var(--brand-primary-soft)]"
              }`}
            >
              表示設定
            </button>
            <button
              type="button"
              disabled={backgroundDisabled}
              onClick={() => changeMode("reorder")}
              aria-pressed={mode === "reorder"}
              className={`h-10 border-l border-[color:var(--border)] text-sm font-medium calm-transition disabled:pointer-events-none disabled:opacity-50 ${
                mode === "reorder"
                  ? "bg-[color:var(--brand-primary)] text-[color:var(--brand-on-primary)]"
                  : "bg-white text-[color:var(--text-secondary)] hover:bg-[color:var(--brand-primary-soft)]"
              }`}
            >
              並べ替え
            </button>
          </div>

          <section className={cardClass}>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-[color:var(--text-primary)]">
                  手動候補
                </h2>
                <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
                  {MANUAL_SAVE_LIMIT}件まで保存でき、記録フォームには最大{MANUAL_DISPLAY_LIMIT}
                  件まで表示します。
                </p>
                <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                  保存 {totalCount} / {MANUAL_SAVE_LIMIT}　表示中 {visibleCount} /{" "}
                  {MANUAL_DISPLAY_LIMIT}
                </p>
              </div>
              {mode === "visibility" && (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={backgroundDisabled || blocked}
                  onClick={startAdd}
                >
                  追加
                </Button>
              )}
            </div>

            {mode === "reorder" ? (
              state.entries.length === 0 ? (
                <p className="text-sm text-[color:var(--text-secondary)]">
                  並べ替えできる候補はありません。
                </p>
              ) : (
                <DndContext
                  id={`${dndId}-manual`}
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd("manual")}
                >
                  <SortableContext
                    items={state.entries.map((entry) => entry.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {state.entries.map((entry, index) => (
                        <SortableSuggestionRow
                          key={entry.id}
                          id={entry.id}
                          label="手動"
                          badge={entry.item.isVisible ? "表示中" : "非表示"}
                          displayText={entry.item.value.displayText}
                          canMoveUp={index > 0}
                          canMoveDown={index < state.entries.length - 1}
                          onMoveUp={() => move("manual", index, -1)}
                          onMoveDown={() => move("manual", index, 1)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )
            ) : (
              <div className="space-y-3">
                {state.entries.length === 0 && state.unparsedEntries.length === 0 && (
                  <p className="text-sm text-[color:var(--text-secondary)]">
                    手動候補はまだありません。
                  </p>
                )}

                {state.entries.map((entry) => {
                  const errors = invalidItemMap.get(entry.id);
                  return (
                    <div key={entry.id} className={rowClass}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-[color:var(--text-primary)]">
                            {entry.item.value.displayText}
                          </p>
                          <p className="text-xs text-[color:var(--text-muted)]">
                            手動 / {entry.item.isVisible ? "表示中" : "非表示"}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            className="h-9 px-3"
                            disabled={backgroundDisabled || blocked}
                            onClick={() => startEdit(entry.id)}
                          >
                            編集
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            className="h-9 px-3"
                            disabled={backgroundDisabled}
                            onClick={() =>
                              requestDelete(entry.id, entry.item.value.displayText)
                            }
                          >
                            削除
                          </Button>
                        </div>
                      </div>
                      <label className="inline-flex items-center gap-2 text-sm font-medium text-[color:var(--text-primary)]">
                        <input
                          type="checkbox"
                          checked={entry.item.isVisible}
                          disabled={backgroundDisabled || blocked}
                          onChange={(event) =>
                            changeManualVisibility(entry.id, event.target.checked)
                          }
                          className="h-4 w-4 accent-[color:var(--brand-primary)]"
                        />
                        記録フォームに表示する
                      </label>
                      {errors &&
                        Object.entries(errors).map(([key, message]) => (
                          <p key={key} className="text-sm text-red-600">
                            {message}
                          </p>
                        ))}
                    </div>
                  );
                })}

                {state.unparsedEntries.map((entry, index) => (
                  <div
                    key={entry.id}
                    className="space-y-2 rounded border border-amber-200 bg-amber-50 p-3"
                  >
                    <p className="font-medium text-[color:var(--text-primary)]">
                      読み込めない候補 {index + 1}
                    </p>
                    <p className="text-sm text-amber-800">{entry.reason}</p>
                    <p className="text-xs text-[color:var(--text-secondary)]">
                      内容は保持したまま保存します。表示切替と並べ替えはできません。
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-9 px-3"
                      disabled={backgroundDisabled}
                      onClick={() => requestDelete(entry.id, `読み込めない候補 ${index + 1}`)}
                    >
                      削除
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className={cardClass}>
            <h2 className="text-base font-semibold text-[color:var(--text-primary)]">自動候補</h2>
            <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
              直近1年分の記録から作成されます。削除はできません。
            </p>
            <div className="mt-4 space-y-3">
              {autoEntries.length === 0 ? (
                <p className="text-sm text-[color:var(--text-secondary)]">
                  自動候補はまだありません。
                </p>
              ) : mode === "reorder" ? (
                <DndContext
                  id={`${dndId}-auto`}
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd("auto")}
                >
                  <SortableContext
                    items={autoEntries.map((entry) => entry.sourceType)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {autoEntries.map((entry, index) => (
                        <SortableSuggestionRow
                          key={entry.sourceType}
                          id={entry.sourceType}
                          label={AUTO_SOURCE_LABEL[entry.sourceType]}
                          badge={entry.isVisible ? "表示中" : "非表示"}
                          displayText={entry.value.displayText}
                          canMoveUp={index > 0}
                          canMoveDown={index < autoEntries.length - 1}
                          onMoveUp={() => move("auto", index, -1)}
                          onMoveDown={() => move("auto", index, 1)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
                autoEntries.map((entry) => (
                  <div key={entry.sourceType} className={rowClass}>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[color:var(--text-primary)]">
                        {entry.value.displayText}
                      </p>
                      <p className="text-xs text-[color:var(--text-muted)]">
                        {AUTO_SOURCE_LABEL[entry.sourceType]} /{" "}
                        {entry.isVisible ? "表示中" : "非表示"}
                      </p>
                    </div>
                    <label className="inline-flex items-center gap-2 text-sm font-medium text-[color:var(--text-primary)]">
                      <input
                        type="checkbox"
                        checked={entry.isVisible}
                        disabled={backgroundDisabled || blocked}
                        onChange={(event) =>
                          changeAutoVisibility(entry.sourceType, event.target.checked)
                        }
                        className="h-4 w-4 accent-[color:var(--brand-primary)]"
                      />
                      記録フォームに表示する
                    </label>
                  </div>
                ))
              )}
            </div>
          </section>

          {inlineMessage && (
            <p className="rounded border border-[color:var(--brand-mint-border)] bg-[color:var(--brand-primary-soft)] px-4 py-3 text-sm text-[color:var(--brand-primary-active)]">
              {inlineMessage}
            </p>
          )}
          {inlineError && (
            <p className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {inlineError}
            </p>
          )}
        </div>
      )}

      {editorReady && (
        <div
          ref={barRef}
          className="fixed inset-x-0 bottom-0 z-40 border-t border-[color:var(--border-subtle)] bg-white/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] shadow-[0_-10px_30px_rgb(23_33_29_/_0.08)] backdrop-blur"
        >
          <div className="mx-auto flex max-w-3xl flex-col gap-2 sm:flex-row sm:justify-center">
            <Button
              type="button"
              className="h-12 px-8 text-base"
              disabled={backgroundDisabled || blocked}
              onClick={handleSaveAndLeave}
            >
              {saving ? "保存中..." : "保存して戻る"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-12 px-6"
              disabled={saving}
              onClick={handleLeave}
            >
              戻る
            </Button>
          </div>
        </div>
      )}

      <SuggestionItemDialog
        isOpen={dialog.open}
        mode={dialog.mode}
        fieldKey={fieldKey}
        fieldLabel={fieldLabel}
        initialDraft={dialog.initialDraft}
        currentDraft={dialog.draft}
        errors={dialog.errors}
        generalError={dialog.generalError}
        discardConfirmOpen={dialog.discardConfirm}
        onApply={handleApplyDraft}
        onRequestClose={handleRequestCloseDialog}
        onDiscardConfirm={handleDiscardDraft}
        onDiscardCancel={() => {
          applyDialog({ ...dialogRef.current, discardConfirm: false });
          // 入力に戻る＝離脱の中止。確認を重ねず元の画面・入力を維持する。
          cancelDraftResolution();
        }}
        onDraftChange={(draft, isDirty) =>
          applyDialog({ ...dialogRef.current, draft, dirty: isDirty })
        }
      />

      <ConfirmDialog
        isOpen={pendingDelete !== null}
        title="候補の削除"
        message={`「${pendingDelete?.label ?? ""}」を削除します。よろしいですか？`}
        confirmText="削除"
        cancelText="キャンセル"
        onConfirm={() => {
          if (state && pendingDelete) {
            applyEditorState(removeManualItem(state, pendingDelete.id));
            setInlineError(null);
          }
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}

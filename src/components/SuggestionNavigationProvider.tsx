"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Toast from "@/components/Toast";
import UnsavedChangesDialog from "@/app/home/log/suggestion/[field]/UnsavedChangesDialog";
import {
  formDraftStore,
  type FormDraftTicket,
  type HeadacheLogFormSnapshot,
} from "@/app/home/log/formDraftStore";
import {
  getCurrentHistoryPosition,
  useUnsavedChangesGuard,
} from "@/lib/hooks/useUnsavedChangesGuard";
import type { HistoryPosition, PendingDestination } from "@/lib/suggestionNavigationController";

type RoundTrip = {
  uid: string;
  recordKey: string;
  editSessionId: string;
  roundTripId: string;
  originEntryId: string;
  originPosition: HistoryPosition;
  returnUrl: string;
};

type PendingNotice = {
  message: string;
  expectedPath: string;
  nonce: string;
};

/**
 * 候補編集画面の編集状態の退避。
 * ページ遷移で失われない Provider に置き、履歴復帰で再マウントされても復元できるようにする。
 * 中身は編集画面が組み立てるため、ここでは不透明な値として扱う。
 */
type EditorStash = {
  fieldKey: string;
  sessionId: string;
  payload: unknown;
  /** 未反映の下書きを抱えたままかどうか（再マウント待ちの判定に使う） */
  draftDirty: boolean;
};

export type EditorStashInput = {
  payload: unknown;
  draftDirty: boolean;
};

export type EditorSession = {
  sessionId: string;
  /** 再マウント時に復元する退避値。初回は null */
  payload: unknown;
};

export type BeginRoundTripArgs = {
  uid: string;
  recordKey: string;
  editSessionId: string;
  returnUrl: string;
  snapshot: HeadacheLogFormSnapshot;
};

type SuggestionNavigationContextValue = {
  /** 候補編集セッションの開始・終了 */
  startEditorGuard: (fieldKey: string, sessionId: string) => void;
  stopEditorGuard: () => void;
  /** 編集セッションを取得または再開する（再マウント時は退避値を返す） */
  beginEditorSession: (fieldKey: string) => EditorSession;
  /** 編集状態を effect を待たず同じ操作内で退避する */
  stashEditorState: (fieldKey: string, sessionId: string, snapshot: EditorStashInput) => void;
  setHasChanges: (hasChanges: boolean) => void;
  registerSaveHandler: (handler: (() => Promise<boolean>) | null) => void;
  /**
   * 画面全体の離脱確認より前に、未反映の下書きを解決するハンドラ。
   * 解決が必要なら true を返し、反映／破棄後に `resume`、入力に戻るなら `abort` を呼ぶ。
   */
  registerDraftResolver: (
    resolver: ((resume: () => void, abort: () => void) => boolean) | null
  ) => void;
  /** 3択ダイアログに出す保存エラー文言 */
  setSaveError: (message: string | null) => void;
  requestLeave: (destination?: PendingDestination) => void;
  /** 保存成功を通知し、遷移到達時に Toast を出す */
  notifySavedOnArrival: (message: string) => void;

  /** 記録フォームから候補編集へ出るときの退避 */
  beginRoundTrip: (args: BeginRoundTripArgs) => void;
  /** 記録フォームのマウント時に復帰チケットを受け取る */
  claimReturnTicket: (uid: string | null, recordKey: string) => FormDraftTicket | null;
  /** 記録の保存・破棄・新しい編集開始で往復を失効させる */
  invalidateRoundTrip: (editSessionId?: string) => void;
  /** uid 変更・ログアウト時の失効 */
  invalidateForUser: (uid: string | null) => void;
  /** 候補保存後に増える。記録フォームは候補の再取得契機として購読する */
  suggestionRevision: number;
  /** 候補編集セッション中で、未保存の変更があるか */
  hasUnsavedChanges: boolean;
  /** 離脱が承認されるたびに増える（プログラム遷移の連結に使う） */
  leaveApprovedCount: number;
  /** 離脱確認がキャンセルされるたびに増える */
  leaveCancelledCount: number;

  /** 固定バーの実測高さ登録（Toast の重なり回避） */
  registerBottomBar: (id: string, height: number) => void;
  bottomOffset: number;
};

const SuggestionNavigationContext = createContext<SuggestionNavigationContextValue | null>(null);

export const useSuggestionNavigation = (): SuggestionNavigationContextValue => {
  const value = useContext(SuggestionNavigationContext);
  if (!value) {
    throw new Error("SuggestionNavigationProvider の外で useSuggestionNavigation を使用しています");
  }
  return value;
};

const createId = () =>
  globalThis.crypto?.randomUUID?.() ?? `rt-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const toPath = (url: string) => {
  try {
    return new URL(url, window.location.origin).pathname;
  } catch {
    return url;
  }
};

export default function SuggestionNavigationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const roundTripRef = useRef<RoundTrip | null>(null);
  const saveHandlerRef = useRef<(() => Promise<boolean>) | null>(null);
  const draftResolverRef = useRef<
    ((resume: () => void, abort: () => void) => boolean) | null
  >(null);
  const editorStashRef = useRef<EditorStash | null>(null);
  /** マウント中の候補編集画面の数（0 なら画面が失われている） */
  const editorMountedRef = useRef(0);
  // 編集画面の再マウントを待っている離脱要求。
  const pendingDraftLeaveRef = useRef<{ resume: () => void; abort: () => void } | null>(null);
  const pendingNoticeRef = useRef<PendingNotice | null>(null);
  const savedMessageRef = useRef<string | null>(null);
  /** 直近に確定した利用者。undefined は認証状態が未確定 */
  const currentUidRef = useRef<string | null | undefined>(undefined);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [suggestionRevision, setSuggestionRevision] = useState(0);
  const [leaveApprovedCount, setLeaveApprovedCount] = useState(0);
  const [leaveCancelledCount, setLeaveCancelledCount] = useState(0);
  const [bottomBars, setBottomBars] = useState<Record<string, number>>({});

  const handleNavigate = useCallback(
    (url: string, mode: "push" | "replace") => {
      let sameOrigin = true;
      try {
        sameOrigin = new URL(url, window.location.origin).origin === window.location.origin;
      } catch {
        sameOrigin = false;
      }

      if (!sameOrigin) {
        window.location.assign(url);
        return;
      }
      if (mode === "replace") {
        router.replace(url);
        return;
      }
      router.push(url);
    },
    [router]
  );

  const handleSaveRequested = useCallback(async () => {
    const handler = saveHandlerRef.current;
    if (!handler) return false;
    return handler();
  }, []);

  const handleLeaveApproved = useCallback((destination: PendingDestination) => {
    setLeaveApprovedCount((current) => current + 1);

    const destinationPath =
      destination.kind === "url"
        ? toPath(destination.url)
        : destination.kind === "history"
          ? toPath(destination.position.url)
          : null;

    if (destinationPath === null) {
      // 遷移を伴わない承認（ログアウト確定前の3択など）。
      // 実際の移動がないため、往復の失効も到達通知も行わない。
      return;
    }

    const roundTrip = roundTripRef.current;
    if (roundTrip) {
      const returnPath = toPath(roundTrip.returnUrl);
      if (destinationPath === returnPath) {
        // 元フォームへ戻る経路。復帰チケットを有効にする。
        formDraftStore.markReturning(roundTrip.roundTripId);
      } else if (destinationPath.startsWith("/home/log/suggestion/")) {
        // 別項目の候補編集への継続。往復 ID と元フォームを引き継ぐ。
        formDraftStore.continueRoundTrip(roundTrip.roundTripId);
      } else {
        // その他の経路への離脱では下書きを失効させる。
        formDraftStore.invalidate(roundTrip.roundTripId);
        roundTripRef.current = null;
      }
    }

    // 保存成功の通知は往復の有無から独立させる（直リンク・リロード後も到達先で1回だけ出す）。
    const message = savedMessageRef.current;
    savedMessageRef.current = null;
    if (message) {
      pendingNoticeRef.current = { message, expectedPath: destinationPath, nonce: createId() };
    }
  }, []);

  /**
   * 画面全体の離脱確認より先に未反映の下書きを解決させる。
   * 履歴復帰で編集画面が一時的にアンマウントされている場合は、
   * 確認を出さずに再マウント（＝解決ハンドラの再登録）を待つ。
   */
  const handleResolveDraft = useCallback((resume: () => void, abort: () => void) => {
    const resolver = draftResolverRef.current;
    if (resolver) return resolver(resume, abort);
    if (editorStashRef.current?.draftDirty) {
      pendingDraftLeaveRef.current = { resume, abort };
      return true;
    }
    return false;
  }, []);

  const guard = useUnsavedChangesGuard({
    onSaveRequested: handleSaveRequested,
    onLeaveApproved: handleLeaveApproved,
    onNavigate: handleNavigate,
    onResolveDraft: handleResolveDraft,
  });

  const {
    getNavState,
    notifyEditorDetached,
    notifyLocationChanged,
    requestLeave: guardRequestLeave,
    setHasChanges,
    startGuard,
    stopGuard,
  } = guard;

  /**
   * 一時的なアンマウントを編集終了として扱わない。
   * 未保存の変更が残っている間はガードと退避状態を維持し、
   * 承認済みの離脱・変更なしの終了でだけ解除する。
   */
  const startEditorGuard = useCallback(
    (fieldKey: string, sessionId: string) => {
      editorMountedRef.current += 1;
      const current = editorStashRef.current;
      if (!current || current.fieldKey !== fieldKey || current.sessionId !== sessionId) {
        // セッション開始後に退避枠が失われている場合（StrictMode の再実行など）は作り直す。
        editorStashRef.current = { fieldKey, sessionId, payload: null, draftDirty: false };
      }
      if (getNavState().guardActive) return;
      startGuard();
    },
    [getNavState, startGuard]
  );

  /**
   * 編集画面のアンマウント。
   * 変更の有無だけでは終了せず、実際の移動先を持つ承認（Controller の popstate /
   * editorDetached / 承認済み遷移）が済むまでガードを維持する。
   * ルーターのアンマウントが popstate 処理より先に走る順序でも、復帰・失効を一度実行するため。
   */
  const stopEditorGuard = useCallback(() => {
    editorMountedRef.current = Math.max(0, editorMountedRef.current - 1);
    const state = getNavState();
    if (state.guardActive && state.phase !== "approved") {
      return;
    }
    editorStashRef.current = null;
    draftResolverRef.current = null;
    pendingDraftLeaveRef.current = null;
    stopGuard();
  }, [getNavState, stopGuard]);

  const beginEditorSession = useCallback((fieldKey: string): EditorSession => {
    const current = editorStashRef.current;
    // ガードが継続している間だけ、同じ項目の編集セッションを再開する。
    if (getNavState().guardActive && current && current.fieldKey === fieldKey) {
      return { sessionId: current.sessionId, payload: current.payload };
    }
    const sessionId = createId();
    editorStashRef.current = { fieldKey, sessionId, payload: null, draftDirty: false };
    return { sessionId, payload: null };
  }, [getNavState]);

  const stashEditorState = useCallback(
    (fieldKey: string, sessionId: string, snapshot: EditorStashInput) => {
      const current = editorStashRef.current;
      if (!current || current.fieldKey !== fieldKey || current.sessionId !== sessionId) return;
      editorStashRef.current = {
        ...current,
        payload: snapshot.payload,
        draftDirty: snapshot.draftDirty,
      };
    },
    []
  );

  const registerDraftResolver = useCallback(
    (resolver: ((resume: () => void, abort: () => void) => boolean) | null) => {
      draftResolverRef.current = resolver;
      const pending = pendingDraftLeaveRef.current;
      if (!resolver || !pending) return;
      // 再マウントで解決できるようになった離脱要求を引き継ぐ。
      pendingDraftLeaveRef.current = null;
      if (!resolver(pending.resume, pending.abort)) {
        pending.resume();
      }
    },
    []
  );

  const getReturnDestination = useCallback((): PendingDestination => {
    const roundTrip = roundTripRef.current;
    if (!roundTrip) {
      return { kind: "url", url: "/home", mode: "replace" };
    }
    if (roundTrip.originPosition.index !== null) {
      return { kind: "history", position: roundTrip.originPosition };
    }
    return { kind: "url", url: roundTrip.returnUrl, mode: "replace" };
  }, []);

  const requestLeave = useCallback(
    (destination?: PendingDestination) => {
      guardRequestLeave(destination ?? getReturnDestination());
    },
    [getReturnDestination, guardRequestLeave]
  );

  const notifySavedOnArrival = useCallback((message: string) => {
    savedMessageRef.current = message;
    const roundTrip = roundTripRef.current;
    if (roundTrip) {
      formDraftStore.bumpCandidateRevision(roundTrip.roundTripId);
    }
    setSuggestionRevision((current) => current + 1);
  }, []);

  const beginRoundTrip = useCallback((args: BeginRoundTripArgs) => {
    const position = getCurrentHistoryPosition();
    const roundTripId = createId();
    roundTripRef.current = {
      uid: args.uid,
      recordKey: args.recordKey,
      editSessionId: args.editSessionId,
      roundTripId,
      originEntryId: position.entryId,
      originPosition: position,
      returnUrl: args.returnUrl,
    };
    formDraftStore.beginRoundTrip({
      uid: args.uid,
      recordKey: args.recordKey,
      editSessionId: args.editSessionId,
      roundTripId,
      originEntryId: position.entryId,
      returnUrl: args.returnUrl,
      snapshot: args.snapshot,
    });
  }, []);

  const claimReturnTicket = useCallback(
    (uid: string | null, recordKey: string): FormDraftTicket | null => {
      const roundTrip = roundTripRef.current;
      if (!roundTrip || !uid) return null;
      if (roundTrip.uid !== uid || roundTrip.recordKey !== recordKey) return null;

      const ticket: FormDraftTicket = {
        uid: roundTrip.uid,
        recordKey: roundTrip.recordKey,
        editSessionId: roundTrip.editSessionId,
        roundTripId: roundTrip.roundTripId,
        originEntryId: roundTrip.originEntryId,
        returnApproved: true,
      };

      // 離脱が承認される前（履歴復帰の途中で元フォームが一時マウントされた場合など）は
      // 復帰チケットを渡さない。渡すと復元できないまま退避データが消費される。
      if (!formDraftStore.peekReturnDraft(ticket)) return null;
      return ticket;
    },
    []
  );

  const invalidateRoundTrip = useCallback((editSessionId?: string) => {
    if (editSessionId) {
      formDraftStore.invalidateByEditSession(editSessionId);
      if (roundTripRef.current?.editSessionId === editSessionId) {
        roundTripRef.current = null;
      }
      return;
    }
    const roundTrip = roundTripRef.current;
    if (roundTrip) {
      formDraftStore.invalidate(roundTrip.roundTripId);
    }
    roundTripRef.current = null;
  }, []);

  const invalidateForUser = useCallback((uid: string | null) => {
    formDraftStore.invalidateOtherUsers(uid);
    if (!uid || roundTripRef.current?.uid !== uid) {
      roundTripRef.current = null;
    }

    // 初回の認証確定（未確定 → 確定）では何も破棄しない。
    // 編集中の候補・保存通知を失効させるのは、利用者が実際に変わった場合だけとする。
    const previousUid = currentUidRef.current;
    currentUidRef.current = uid;
    if (previousUid === undefined || previousUid === uid) return;

    editorStashRef.current = null;
    pendingDraftLeaveRef.current = null;
    pendingNoticeRef.current = null;
    savedMessageRef.current = null;
  }, []);

  const registerSaveHandler = useCallback((handler: (() => Promise<boolean>) | null) => {
    saveHandlerRef.current = handler;
  }, []);

  const registerBottomBar = useCallback((id: string, height: number) => {
    setBottomBars((current) => {
      if (height <= 0) {
        if (!(id in current)) return current;
        const next = { ...current };
        delete next[id];
        return next;
      }
      if (current[id] === height) return current;
      return { ...current, [id]: height };
    });
  }, []);

  // 遷移チケットに紐づけ、該当遷移の到達時だけ成功通知を表示する。
  // あわせて、popstate の起きない router.push / replace の到達を Controller へ戻す。
  useEffect(() => {
    notifyLocationChanged();

    // 編集画面が失われたまま別の位置にいる場合は、ここで移動を確定させる。
    // popstate 処理より先にアンマウントされた経路でも、承認を一度だけ通知する。
    if (editorMountedRef.current === 0 && editorStashRef.current !== null) {
      notifyEditorDetached();
      if (!getNavState().guardActive) {
        editorStashRef.current = null;
        pendingDraftLeaveRef.current = null;
        stopGuard();
      }
    }

    const notice = pendingNoticeRef.current;
    if (!notice) return;
    if (notice.expectedPath !== pathname) return;
    pendingNoticeRef.current = null;
    setToastMessage(notice.message);
  }, [
    getNavState,
    guard.navState.guardActive,
    guard.navState.phase,
    notifyEditorDetached,
    notifyLocationChanged,
    pathname,
    stopGuard,
  ]);

  // 確認からの復帰（キャンセル）を、承認と区別してプログラム遷移側へ伝える。
  const previousPhaseRef = useRef(guard.navState.phase);
  useEffect(() => {
    if (previousPhaseRef.current === "confirming" && guard.navState.phase === "idle") {
      setLeaveCancelledCount((current) => current + 1);
    }
    previousPhaseRef.current = guard.navState.phase;
  }, [guard.navState.phase]);

  const bottomOffset = useMemo(() => {
    const values = Object.values(bottomBars);
    return values.length === 0 ? 0 : Math.max(...values);
  }, [bottomBars]);

  const value = useMemo<SuggestionNavigationContextValue>(
    () => ({
      startEditorGuard,
      stopEditorGuard,
      beginEditorSession,
      stashEditorState,
      setHasChanges,
      registerSaveHandler,
      registerDraftResolver,
      setSaveError,
      requestLeave,
      notifySavedOnArrival,
      beginRoundTrip,
      claimReturnTicket,
      invalidateRoundTrip,
      invalidateForUser,
      suggestionRevision,
      hasUnsavedChanges: guard.navState.guardActive && guard.navState.hasChanges,
      leaveApprovedCount,
      leaveCancelledCount,
      registerBottomBar,
      bottomOffset,
    }),
    [
      beginEditorSession,
      beginRoundTrip,
      bottomOffset,
      claimReturnTicket,
      guard.navState.guardActive,
      guard.navState.hasChanges,
      invalidateForUser,
      invalidateRoundTrip,
      leaveApprovedCount,
      leaveCancelledCount,
      notifySavedOnArrival,
      registerBottomBar,
      registerDraftResolver,
      registerSaveHandler,
      setSaveError,
      requestLeave,
      setHasChanges,
      startEditorGuard,
      stashEditorState,
      stopEditorGuard,
      suggestionRevision,
    ]
  );

  return (
    <SuggestionNavigationContext.Provider value={value}>
      {children}
      <UnsavedChangesDialog
        isOpen={guard.confirmVisible}
        saving={guard.navState.phase === "saving"}
        errorMessage={saveError}
        onSave={() => {
          setSaveError(null);
          guard.confirmSave();
        }}
        onDiscard={() => {
          setSaveError(null);
          guard.confirmDiscard();
        }}
        onCancel={() => {
          setSaveError(null);
          guard.confirmCancel();
        }}
      />
      <Toast
        message={toastMessage}
        bottomOffset={bottomOffset}
        onClose={() => setToastMessage(null)}
      />
    </SuggestionNavigationContext.Provider>
  );
}

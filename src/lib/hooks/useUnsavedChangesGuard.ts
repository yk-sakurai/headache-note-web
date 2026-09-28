"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createInitialNavigationState,
  transitionNavigation,
  type HistoryPosition,
  type NavigationEffect,
  type NavigationEvent,
  type NavigationState,
  type PendingDestination,
} from "@/lib/suggestionNavigationController";

/**
 * ブラウザと Controller をつなぐ薄い接続層。
 *
 * 分岐規則はここに再実装せず、popstate やリンククリックをイベントへ変換して
 * `transitionNavigation` に渡し、返ってきた操作記述を History API / router / 保存関数へ適用する。
 */

const NAV_ID_KEY = "__headacheNoteNavId";
const NAV_INDEX_KEY = "__headacheNoteNavIndex";
const NAV_SESSION_KEY = "__headacheNoteNavSession";

type HistoryMethod = typeof window.history.pushState;

type WrapContext = {
  pushState: HistoryMethod;
  replaceState: HistoryMethod;
};

// StrictMode の二重登録・複数マウントに備えて、ラップは 1 回だけ行う。
let wrapCount = 0;
let originals: WrapContext | null = null;
let currentEntryId: string | null = null;
/** 現在位置の採番。追跡外の履歴にいる間は null（古い値を残さない） */
let currentIndex: number | null = 0;
let idSeq = 0;
/**
 * 同一ドキュメント内でだけ index を比較するための識別子。
 * リロードや別ドキュメントからの遷移で採番がやり直しになるため、
 * 別セッションが付けた index を自分の index と突き合わせない。
 */
let navSessionId: string | null = null;

const createEntryId = () => {
  idSeq += 1;
  const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  return `hn-${idSeq}-${random}`;
};

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * 追跡外の履歴から push / replace する場合、既存の採番とは比較できない。
 * 新しいドキュメントセッションを始め、以前の index を自分の index と突き合わせない。
 */
const ensureNumberingSession = () => {
  if (currentIndex !== null) return;
  navSessionId = createEntryId();
  currentIndex = 0;
};

/** Next.js 内部の state を置換・削除せず、名前空間付きの識別子だけ足す。 */
const mergeNavState = (data: unknown, entryId: string, index: number) => {
  const base = isPlainRecord(data) ? { ...data } : {};
  return {
    ...base,
    [NAV_ID_KEY]: entryId,
    [NAV_INDEX_KEY]: index,
    [NAV_SESSION_KEY]: navSessionId,
  };
};

const readPosition = (state: unknown, url: string): HistoryPosition => {
  if (isPlainRecord(state) && typeof state[NAV_ID_KEY] === "string") {
    const index = state[NAV_INDEX_KEY];
    // 別ドキュメントセッションが付けた index は自分の採番と比較できない。
    const sameSession = navSessionId !== null && state[NAV_SESSION_KEY] === navSessionId;
    return {
      entryId: state[NAV_ID_KEY],
      index: sameSession && typeof index === "number" && Number.isFinite(index) ? index : null,
      url,
    };
  }
  // 追跡開始前の履歴には index を捏造しない。
  return { entryId: `untracked-${url}`, index: null, url };
};

const installHistoryWrap = () => {
  wrapCount += 1;
  if (wrapCount > 1 || originals) return;

  originals = {
    pushState: window.history.pushState.bind(window.history),
    replaceState: window.history.replaceState.bind(window.history),
  };

  navSessionId = createEntryId();
  currentEntryId = createEntryId();
  currentIndex = 0;
  originals.replaceState(
    mergeNavState(window.history.state, currentEntryId, currentIndex),
    "",
    window.location.href
  );

  window.history.pushState = function pushState(data, unused, url) {
    ensureNumberingSession();
    const entryId = createEntryId();
    const index = (currentIndex ?? 0) + 1;
    originals?.pushState.call(window.history, mergeNavState(data, entryId, index), unused, url);
    currentEntryId = entryId;
    currentIndex = index;
  };

  window.history.replaceState = function replaceState(data, unused, url) {
    ensureNumberingSession();
    const entryId = currentEntryId ?? createEntryId();
    originals?.replaceState.call(
      window.history,
      mergeNavState(data, entryId, currentIndex ?? 0),
      unused,
      url
    );
    currentEntryId = entryId;
  };
};

const uninstallHistoryWrap = () => {
  wrapCount = Math.max(0, wrapCount - 1);
  if (wrapCount > 0 || !originals) return;
  window.history.pushState = originals.pushState;
  window.history.replaceState = originals.replaceState;
  originals = null;
  navSessionId = null;
};

const syncFromPopstate = (state: unknown, url: string): HistoryPosition => {
  const position = readPosition(state, url);
  currentEntryId = position.entryId;
  // 追跡外の履歴では古い index を残さない。次の push / replace で採番し直す。
  currentIndex = position.index;
  return position;
};

export const getCurrentHistoryPosition = (): HistoryPosition => {
  if (typeof window === "undefined") {
    return { entryId: "ssr", index: null, url: "" };
  }
  return readPosition(window.history.state, window.location.href);
};

export type UnsavedChangesGuardOptions = {
  /** 保存を実行する。成功したら true を返す */
  onSaveRequested: () => Promise<boolean>;
  /** 離脱が承認された時点で呼ばれる（往復ストアの状態遷移などに使う） */
  onLeaveApproved: (destination: PendingDestination) => void;
  /** 同一オリジンの URL へ遷移する */
  onNavigate: (url: string, mode: "push" | "replace") => void;
  /**
   * 画面全体の離脱確認を出す前に、未反映の下書きを解決させる。
   * 解決が必要なら true を返し、反映／破棄が終わったら `resume`、
   * 入力に戻る（離脱中止）なら `abort` を呼ぶ。
   */
  onResolveDraft?: (resume: () => void, abort: () => void) => boolean;
};

export type UnsavedChangesGuard = {
  navState: NavigationState;
  confirmVisible: boolean;
  /** 現在の状態を同期的に読む（React の再描画を待たない判定に使う） */
  getNavState: () => NavigationState;
  startGuard: () => void;
  stopGuard: () => void;
  setHasChanges: (hasChanges: boolean) => void;
  requestLeave: (destination: PendingDestination) => void;
  confirmSave: () => void;
  confirmDiscard: () => void;
  confirmCancel: () => void;
  /** URL 遷移の到達を通知する（router.push / replace には popstate がないため） */
  notifyLocationChanged: () => void;
  /** 編集画面が失われた状態で別の位置にいることを通知する */
  notifyEditorDetached: () => void;
};

const toPathname = (url: string): string | null => {
  try {
    return new URL(url, window.location.origin).pathname;
  } catch {
    return null;
  }
};

export const useUnsavedChangesGuard = (
  options: UnsavedChangesGuardOptions
): UnsavedChangesGuard => {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const stateRef = useRef<NavigationState>(createInitialNavigationState());
  const [navState, setNavState] = useState<NavigationState>(stateRef.current);
  const [confirmVisible, setConfirmVisible] = useState(false);
  // 自分で発行した history.go の結果を、利用者の戻る／進むと区別する。
  const pendingRestoreRef = useRef(false);
  const pendingApprovedRef = useRef(false);
  // router.push / replace で移動した場合は popstate が起きないため、到達を URL で照合する。
  const pendingNavRef = useRef<{ url: string; kind: "restore" | "approved" } | null>(null);

  const dispatchRef = useRef<(event: NavigationEvent) => void>(() => {});

  const runEffect = useCallback((effect: NavigationEffect) => {
    switch (effect.type) {
      case "goDelta":
        window.history.go(effect.delta);
        break;
      case "navigate":
        optionsRef.current.onNavigate(effect.url, effect.mode);
        break;
      case "requestSave": {
        const token = effect.token;
        void optionsRef.current
          .onSaveRequested()
          .then((succeeded) => {
            dispatchRef.current({
              type: succeeded ? "saveSucceeded" : "saveFailed",
              token,
            });
          })
          .catch(() => {
            dispatchRef.current({ type: "saveFailed", token });
          });
        break;
      }
      case "showConfirm": {
        // 未反映の下書きがあれば、先に反映／破棄を済ませる（有効なモーダルは常に1つ）。
        const resolveDraft = optionsRef.current.onResolveDraft;
        if (resolveDraft) {
          const pending = stateRef.current.pending;
          const deferred = resolveDraft(
            () => {
              if (stateRef.current.phase !== "confirming") return;
              if (stateRef.current.hasChanges) {
                setConfirmVisible(true);
                return;
              }
              // 下書きの破棄で変更がなくなったら、画面全体の確認は出さずに離脱する。
              dispatchRef.current({ type: "requestLeave", destination: pending });
            },
            () => dispatchRef.current({ type: "confirmCancel" })
          );
          if (deferred) break;
        }
        setConfirmVisible(true);
        break;
      }
      case "hideConfirm":
        setConfirmVisible(false);
        break;
      case "releaseGuard":
        setConfirmVisible(false);
        break;
      case "leaveApproved":
        optionsRef.current.onLeaveApproved(effect.destination);
        break;
    }
  }, []);

  // 効果の実行中に発生した dispatch は、現在の効果を流し終えてから順に処理する。
  const queueRef = useRef<NavigationEvent[]>([]);
  const flushingRef = useRef(false);

  const applyEvent = useCallback(
    (event: NavigationEvent) => {
      const previousPhase = stateRef.current.phase;
      const { state, effects } = transitionNavigation(stateRef.current, event);
      stateRef.current = state;
      setNavState(state);

      for (const effect of effects) {
        if (effect.type === "goDelta") {
          if (state.phase === "restoring" || previousPhase === "restoring") {
            pendingRestoreRef.current = true;
          } else if (state.phase === "approved") {
            pendingApprovedRef.current = true;
          }
        }
        if (effect.type === "navigate") {
          if (state.phase === "restoring") {
            pendingNavRef.current = { url: effect.url, kind: "restore" };
          } else if (state.phase === "approved") {
            pendingNavRef.current = { url: effect.url, kind: "approved" };
          }
        }
        runEffect(effect);
      }
    },
    [runEffect]
  );

  const dispatch = useCallback(
    (event: NavigationEvent) => {
      queueRef.current.push(event);
      if (flushingRef.current) return;
      flushingRef.current = true;
      try {
        while (queueRef.current.length > 0) {
          const next = queueRef.current.shift();
          if (next) applyEvent(next);
        }
      } finally {
        flushingRef.current = false;
      }
    },
    [applyEvent]
  );
  dispatchRef.current = dispatch;

  /**
   * URL 遷移の到達通知。
   * 復帰中なら復帰完了、承認後なら遷移完了として Controller へ戻す。
   */
  const notifyLocationChanged = useCallback(() => {
    const pending = pendingNavRef.current;
    if (!pending) return;
    const targetPath = toPathname(pending.url);
    if (targetPath === null || targetPath !== window.location.pathname) return;
    pendingNavRef.current = null;
    const position = getCurrentHistoryPosition();
    if (pending.kind === "restore") {
      dispatch({ type: "restored", position });
      return;
    }
    dispatch({ type: "navigationCompleted", position });
  }, [dispatch]);

  useEffect(() => {
    installHistoryWrap();
    dispatch({ type: "init", position: getCurrentHistoryPosition() });

    const handlePopState = (event: PopStateEvent) => {
      const position = syncFromPopstate(event.state, window.location.href);

      if (pendingRestoreRef.current) {
        pendingRestoreRef.current = false;
        pendingNavRef.current = null;
        dispatch({ type: "restored", position });
        return;
      }

      if (pendingApprovedRef.current) {
        pendingApprovedRef.current = false;
        dispatch({ type: "navigationCompleted", position });
        return;
      }

      dispatch({ type: "popstate", position });
    };

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!stateRef.current.guardActive || !stateRef.current.hasChanges) return;
      event.preventDefault();
      event.returnValue = "";
    };

    const handleClickCapture = (event: MouseEvent) => {
      // 変更の有無によらず共通の requestLeave を通し、離脱の承認通知を欠かさない。
      if (!stateRef.current.guardActive) return;
      // 承認済みの遷移が進行中なら、通常のリンク遷移に任せて承認を重ねない。
      if (stateRef.current.phase === "approved") return;
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href") ?? "";
      if (href.startsWith("#")) return;
      // mailto: / tel: 等は画面遷移ではないため、既存の挙動を維持する。
      if (anchor.protocol !== "http:" && anchor.protocol !== "https:") return;

      const destinationUrl = anchor.href;
      if (!destinationUrl) return;
      // ページ内アンカーは既存の挙動を維持する。
      const currentWithoutHash = window.location.href.split("#")[0];
      if (destinationUrl.split("#")[0] === currentWithoutHash && destinationUrl.includes("#")) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      dispatch({ type: "requestLeave", destination: { kind: "url", url: destinationUrl, mode: "push" } });
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleClickCapture, true);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleClickCapture, true);
      uninstallHistoryWrap();
    };
  }, [dispatch]);

  const startGuard = useCallback(() => {
    dispatch({ type: "guardStart", position: getCurrentHistoryPosition() });
  }, [dispatch]);

  const stopGuard = useCallback(() => {
    dispatch({ type: "guardStop" });
  }, [dispatch]);

  const setHasChanges = useCallback(
    (hasChanges: boolean) => {
      if (stateRef.current.hasChanges === hasChanges) return;
      dispatch({ type: "changesUpdated", hasChanges });
    },
    [dispatch]
  );

  const requestLeave = useCallback(
    (destination: PendingDestination) => {
      dispatch({ type: "requestLeave", destination });
    },
    [dispatch]
  );

  const confirmSave = useCallback(() => {
    dispatch({ type: "confirmSave", token: createEntryId() });
  }, [dispatch]);

  const confirmDiscard = useCallback(() => {
    dispatch({ type: "confirmDiscard" });
  }, [dispatch]);

  const confirmCancel = useCallback(() => {
    dispatch({ type: "confirmCancel" });
  }, [dispatch]);

  const getNavState = useCallback(() => stateRef.current, []);

  /**
   * 編集画面が失われ、実際には別の位置にいる場合の後始末。
   * ルーターのアンマウントが popstate 処理より先でも後でも、
   * 実際の移動先を持つ承認を一度だけ通知する（先に処理済みならガードが解除済みで何もしない）。
   */
  const notifyEditorDetached = useCallback(() => {
    const state = stateRef.current;
    // 未保存の変更がある場合は、確認を経る popstate 側の経路に任せる。
    if (!state.guardActive || state.phase !== "idle" || state.hasChanges) return;
    const editorPath = state.editorEntry ? toPathname(state.editorEntry.url) : null;
    if (editorPath !== null && editorPath === window.location.pathname) return;
    dispatch({ type: "editorDetached", position: getCurrentHistoryPosition() });
  }, [dispatch]);

  return {
    navState,
    confirmVisible,
    getNavState,
    startGuard,
    stopGuard,
    setHasChanges,
    requestLeave,
    confirmSave,
    confirmDiscard,
    confirmCancel,
    notifyLocationChanged,
    notifyEditorDetached,
  };
};

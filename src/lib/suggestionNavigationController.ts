/**
 * 入力候補編集の離脱保護に使う、純粋な状態遷移。
 *
 * window / document / History API / React を参照しない。
 * 履歴情報・生成済み ID・保存の成功／失敗はイベントで受け取り、
 * 返すのは「履歴差分へ移動」「指定 URL へ push / replace」「保存を要求」といった操作記述だけとする。
 * 時刻・乱数・API 呼び出しをこのファイルの中で実行しない。
 */

export type NavigationPhase = "idle" | "restoring" | "confirming" | "saving" | "approved";

export type HistoryPosition = {
  entryId: string;
  /** Provider 初期化以降に追跡できた履歴位置。追跡前の履歴は null */
  index: number | null;
  url: string;
};

export type PendingDestination =
  | { kind: "none" }
  | { kind: "history"; position: HistoryPosition }
  | { kind: "url"; url: string; mode: "push" | "replace" };

export type NavigationState = {
  phase: NavigationPhase;
  /** 候補編集セッション中だけ true */
  guardActive: boolean;
  hasChanges: boolean;
  current: HistoryPosition | null;
  /** 候補編集画面の履歴位置 */
  editorEntry: HistoryPosition | null;
  pending: PendingDestination;
  /** 1回限りの承認トークン。保存要求と保存結果の対応づけに使う */
  approvalToken: string | null;
};

export type NavigationEvent =
  | { type: "init"; position: HistoryPosition }
  | { type: "guardStart"; position: HistoryPosition }
  | { type: "guardStop" }
  | { type: "changesUpdated"; hasChanges: boolean }
  | { type: "positionChanged"; position: HistoryPosition }
  | { type: "popstate"; position: HistoryPosition }
  /** 復帰の到達通知。position を渡した場合は、そこを編集画面の履歴位置として扱う */
  | { type: "restored"; position?: HistoryPosition }
  | { type: "requestLeave"; destination: PendingDestination }
  | { type: "confirmSave"; token: string }
  | { type: "confirmDiscard" }
  | { type: "confirmCancel" }
  | { type: "saveSucceeded"; token: string }
  | { type: "saveFailed"; token: string }
  | { type: "navigationCompleted"; position: HistoryPosition }
  /**
   * 編集画面が失われ、実際には別の位置へ移動していた場合の後始末。
   * ルーターのアンマウントが popstate 処理より先でも、移動先を持つ承認を一度だけ行う。
   */
  | { type: "editorDetached"; position: HistoryPosition };

export type NavigationEffect =
  | { type: "goDelta"; delta: number }
  | { type: "navigate"; url: string; mode: "push" | "replace" }
  | { type: "requestSave"; token: string }
  | { type: "showConfirm" }
  | { type: "hideConfirm" }
  | { type: "releaseGuard" }
  | { type: "leaveApproved"; destination: PendingDestination };

export type NavigationTransition = {
  state: NavigationState;
  effects: NavigationEffect[];
};

export const createInitialNavigationState = (): NavigationState => ({
  phase: "idle",
  guardActive: false,
  hasChanges: false,
  current: null,
  editorEntry: null,
  pending: { kind: "none" },
  approvalToken: null,
});

const getDelta = (from: HistoryPosition | null, to: HistoryPosition | null): number | null => {
  if (!from || !to) return null;
  if (from.index === null || to.index === null) return null;
  return to.index - from.index;
};

/** 保留先へ実際に移動するための操作記述。履歴位置を特定できなければ URL へ replace する。 */
const applyDestinationEffects = (
  state: NavigationState,
  destination: PendingDestination
): NavigationEffect[] => {
  if (destination.kind === "none") return [];

  if (destination.kind === "url") {
    return [{ type: "navigate", url: destination.url, mode: destination.mode }];
  }

  const delta = getDelta(state.current, destination.position);
  if (delta === null || delta === 0) {
    // 推測の history.go は使わず、記録済みの URL へ replace する。
    return [{ type: "navigate", url: destination.position.url, mode: "replace" }];
  }
  return [{ type: "goDelta", delta }];
};

/** 候補編集の履歴位置へ復帰するための操作記述 */
const restoreEffects = (state: NavigationState): NavigationEffect[] => {
  const delta = getDelta(state.current, state.editorEntry);
  if (delta === null) {
    // 位置を特定できない場合は推測で戻らず、編集画面をもう一度開いて入力と保護を維持する。
    return state.editorEntry
      ? [{ type: "navigate", url: state.editorEntry.url, mode: "push" }]
      : [];
  }
  if (delta === 0) return [];
  return [{ type: "goDelta", delta }];
};

export const transitionNavigation = (
  state: NavigationState,
  event: NavigationEvent
): NavigationTransition => {
  switch (event.type) {
    case "init":
      return { state: { ...state, current: event.position }, effects: [] };

    case "guardStart":
      return {
        state: {
          ...state,
          guardActive: true,
          hasChanges: false,
          phase: "idle",
          current: event.position,
          editorEntry: event.position,
          pending: { kind: "none" },
          approvalToken: null,
        },
        effects: [],
      };

    case "guardStop":
      return {
        state: {
          ...state,
          guardActive: false,
          hasChanges: false,
          phase: "idle",
          editorEntry: null,
          pending: { kind: "none" },
          approvalToken: null,
        },
        effects: [{ type: "hideConfirm" }],
      };

    case "changesUpdated":
      return { state: { ...state, hasChanges: event.hasChanges }, effects: [] };

    case "positionChanged":
      return { state: { ...state, current: event.position }, effects: [] };

    case "popstate": {
      const next = { ...state, current: event.position };

      if (!state.guardActive) {
        return { state: next, effects: [] };
      }

      if (state.phase === "approved") {
        // 承認後の移動は内部操作として扱い、確認を重ねない。
        return {
          state: {
            ...next,
            guardActive: false,
            phase: "idle",
            pending: { kind: "none" },
            approvalToken: null,
            editorEntry: null,
          },
          effects: [{ type: "releaseGuard" }],
        };
      }

      if (state.phase !== "idle") {
        // 確認中・復帰中・保存中の連続操作は、新しい確認を重ねず元位置の復帰へ集約する。
        return { state: next, effects: restoreEffects(next) };
      }

      if (!state.hasChanges) {
        // 確認は不要だが、実際の移動先を持つ承認として通知する。
        // 元フォームへの復帰・別項目への継続・その他への失効は、この通知で判定する。
        return {
          state: {
            ...next,
            guardActive: false,
            editorEntry: null,
            pending: { kind: "none" },
          },
          effects: [
            { type: "releaseGuard" },
            { type: "leaveApproved", destination: { kind: "history", position: event.position } },
          ],
        };
      }

      const restoring: NavigationState = {
        ...next,
        phase: "restoring",
        pending: { kind: "history", position: event.position },
      };
      return { state: restoring, effects: restoreEffects(restoring) };
    }

    case "restored": {
      if (state.phase !== "restoring") {
        return { state, effects: [] };
      }
      // 追跡外からの復帰では編集画面を開き直すため、到達した別 ID の同一 URL を
      // 新しい編集画面の履歴位置として扱う。それ以外は記録済みの位置を維持する。
      const reached = event.position;
      const reopened =
        reached !== undefined &&
        state.editorEntry !== null &&
        reached.entryId !== state.editorEntry.entryId &&
        reached.url === state.editorEntry.url;
      const editorEntry = reopened ? reached : state.editorEntry;

      return {
        state: {
          ...state,
          phase: "confirming",
          current: editorEntry ?? reached ?? state.current,
          editorEntry,
        },
        effects: [{ type: "showConfirm" }],
      };
    }

    case "requestLeave": {
      if (!state.guardActive || !state.hasChanges) {
        const applied: NavigationState = {
          ...state,
          guardActive: false,
          phase: "idle",
          editorEntry: null,
          pending: { kind: "none" },
          approvalToken: null,
        };
        return {
          state: applied,
          effects: [
            { type: "releaseGuard" },
            { type: "leaveApproved", destination: event.destination },
            ...applyDestinationEffects(state, event.destination),
          ],
        };
      }

      if (state.phase !== "idle") {
        // 最初の保留先を固定し、新しい確認を重ねない。
        return { state, effects: [] };
      }

      return {
        state: { ...state, phase: "confirming", pending: event.destination },
        effects: [{ type: "showConfirm" }],
      };
    }

    case "confirmCancel": {
      if (state.phase !== "confirming") {
        return { state, effects: [] };
      }
      return {
        state: { ...state, phase: "idle", pending: { kind: "none" }, approvalToken: null },
        effects: [{ type: "hideConfirm" }],
      };
    }

    case "confirmSave": {
      if (state.phase !== "confirming") {
        return { state, effects: [] };
      }
      return {
        state: { ...state, phase: "saving", approvalToken: event.token },
        effects: [{ type: "requestSave", token: event.token }],
      };
    }

    case "saveFailed": {
      if (state.phase !== "saving" || state.approvalToken !== event.token) {
        return { state, effects: [] };
      }
      // 元の URL・画面・入力を維持したまま確認へ戻る。
      return { state: { ...state, phase: "confirming", approvalToken: null }, effects: [] };
    }

    case "saveSucceeded": {
      if (state.phase !== "saving" || state.approvalToken !== event.token) {
        return { state, effects: [] };
      }
      const destination = state.pending;
      const approved: NavigationState = {
        ...state,
        phase: "approved",
        hasChanges: false,
        approvalToken: null,
      };
      return {
        state: approved,
        effects: [
          { type: "hideConfirm" },
          { type: "leaveApproved", destination },
          ...applyDestinationEffects(approved, destination),
        ],
      };
    }

    case "confirmDiscard": {
      if (state.phase !== "confirming") {
        return { state, effects: [] };
      }
      const destination = state.pending;
      const approved: NavigationState = {
        ...state,
        phase: "approved",
        hasChanges: false,
        approvalToken: null,
      };
      return {
        state: approved,
        effects: [
          { type: "hideConfirm" },
          { type: "leaveApproved", destination },
          ...applyDestinationEffects(approved, destination),
        ],
      };
    }

    case "editorDetached": {
      // 確認中・復帰中・保存中・承認済みの移動は、それぞれの経路で決着させる。
      // 未保存の変更がある場合は、確認なしで承認せず popstate 側の復帰・3択に委ねる。
      if (!state.guardActive || state.phase !== "idle" || state.hasChanges) {
        return { state: { ...state, current: event.position }, effects: [] };
      }
      return {
        state: {
          ...state,
          current: event.position,
          guardActive: false,
          hasChanges: false,
          editorEntry: null,
          pending: { kind: "none" },
          approvalToken: null,
        },
        effects: [
          { type: "releaseGuard" },
          { type: "leaveApproved", destination: { kind: "history", position: event.position } },
        ],
      };
    }

    case "navigationCompleted": {
      if (state.phase !== "approved") {
        return { state: { ...state, current: event.position }, effects: [] };
      }
      return {
        state: {
          ...state,
          current: event.position,
          phase: "idle",
          guardActive: false,
          editorEntry: null,
          pending: { kind: "none" },
        },
        effects: [{ type: "releaseGuard" }],
      };
    }
  }
};

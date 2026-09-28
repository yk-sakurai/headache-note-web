"use client";

import { db } from "@/lib/firebase/firestore.client";
import {
  doc,
  getDoc,
  collection,
  query,
  orderBy,
  where,
  limit as firestoreLimit,
  getDocs,
  addDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  increment,
} from "firebase/firestore";
import type { FieldValue } from "firebase/firestore";
import type { SuggestionFieldKey, SuggestionSourceLog } from "../suggestion-types";
import {
  User,
  Subscription,
  Invoice,
  CheckoutSession,
  Device,
  HeadacheLog,
  HeadacheLogPreference,
} from "../types";
import { readRawSuggestionLog, readSuggestionSettingForEdit } from "../suggestion-types";
import {
  buildSuggestionSavePayload,
  UNREADABLE_SETTING_MESSAGE,
  type SuggestionEditorState,
} from "../suggestion-editor";
import { omitUndefinedDeep, sanitizeHeadacheLogStrings } from "./sanitize";

export type HeadacheLogUpdateData = {
  [K in keyof Omit<HeadacheLog, "id">]?:
    | Omit<HeadacheLog, "id">[K]
    | FieldValue;
};

type HeadacheLogPreferenceSaveData = Pick<
  HeadacheLogPreference,
  "userId" | "headacheLogFormOrder" | "durationInputType"
> & {
  visibleItems?: Record<string, boolean>;
};

/**
 * ユーザー情報の読み込み（ブラウザ用）
 */
export class ClientUserRepository {
  static async getUser(uid: string): Promise<User | null> {
    try {
      const docRef = doc(db, "users", uid);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      return docSnap.data() as User;
    } catch (error) {
      console.error("Error getting user:", error);
      throw new Error("ユーザー情報の取得に失敗しました");
    }
  }
}

/**
 * サブスクリプション（契約状態）の読み込み（ブラウザ用）
 */
export class ClientSubscriptionRepository {
  static async getSubscription(uid: string): Promise<Subscription | null> {
    try {
      const docRef = doc(db, "subscriptions", uid);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      return docSnap.data() as Subscription;
    } catch (error) {
      console.error("Error getting subscription:", error);
      throw new Error("サブスクリプション情報の取得に失敗しました");
    }
  }
}

/**
 * 請求履歴の読み込み（ブラウザ用）
 */
export class ClientInvoiceRepository {
  static async listInvoices(
    uid: string,
    limit: number = 10
  ): Promise<Invoice[]> {
    try {
      const invoicesRef = collection(db, "invoices", uid, "user_invoices");
      const q = query(
        invoicesRef,
        orderBy("createdAt", "desc"),
        firestoreLimit(limit)
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map((doc) => doc.data() as Invoice);
    } catch (error) {
      console.error("Error listing invoices:", error);
      throw new Error("請求履歴の取得に失敗しました");
    }
  }

  static async getInvoice(
    uid: string,
    invoiceId: string
  ): Promise<Invoice | null> {
    try {
      const docRef = doc(db, "invoices", uid, "user_invoices", invoiceId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      return docSnap.data() as Invoice;
    } catch (error) {
      console.error("Error getting invoice:", error);
      throw new Error("請求情報の取得に失敗しました");
    }
  }
}

/**
 * 決済手続き（チェックアウト）の記録を作る（ブラウザ用）
 */
export class ClientCheckoutSessionRepository {
  static async createSession(
    data: Omit<CheckoutSession, "createdAt">
  ): Promise<string> {
    try {
      const collectionRef = collection(db, "checkout_sessions");
      const docRef = await addDoc(collectionRef, {
        ...data,
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      console.error("Error creating checkout session:", error);
      throw new Error("チェックアウトセッションの作成に失敗しました");
    }
  }
}

/**
 * 端末情報とプッシュ通知設定の読み書き（ブラウザ用）
 */
export class ClientDeviceRepository {
  static async getDevice(
    uid: string,
    deviceId: string
  ): Promise<Device | null> {
    try {
      const docRef = doc(db, "users", uid, "devices", deviceId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      return docSnap.data() as Device;
    } catch (error) {
      console.error("Error getting device:", error);
      throw new Error("デバイス情報の取得に失敗しました");
    }
  }

  static async listDevices(uid: string): Promise<Device[]> {
    try {
      const devicesRef = collection(db, "users", uid, "devices");
      const q = query(devicesRef, orderBy("lastSeenAt", "desc"));
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map((doc) => doc.data() as Device);
    } catch (error) {
      console.error("Error listing devices:", error);
      throw new Error("デバイス一覧の取得に失敗しました");
    }
  }

  static async createOrUpdateDevice(
    uid: string,
    deviceId: string,
    data: Partial<Device>
  ): Promise<void> {
    try {
      const docRef = doc(db, "users", uid, "devices", deviceId);
      await setDoc(
        docRef,
        {
          ...data,
          userId: uid,
          lastSeenAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error("Error creating/updating device:", error);
      throw new Error("デバイス情報の作成/更新に失敗しました");
    }
  }

  static async updateDeviceToken(
    uid: string,
    deviceId: string,
    token: string
  ): Promise<void> {
    try {
      const docRef = doc(db, "users", uid, "devices", deviceId);
      await updateDoc(docRef, {
        token,
        tokenValid: true,
        lastRefreshedAt: serverTimestamp(),
        lastSeenAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error updating device token:", error);
      throw new Error("デバイストークンの更新に失敗しました");
    }
  }

  static async updatePushSettings(
    uid: string,
    deviceId: string,
    pushSettings: Partial<Device["push"]>
  ): Promise<void> {
    try {
      const docRef = doc(db, "users", uid, "devices", deviceId);

      const updateData: Record<string, boolean> = {};
      if (pushSettings.pushEnabled !== undefined) {
        updateData["push.pushEnabled"] = pushSettings.pushEnabled;
      }
      if (pushSettings.channels) {
        if (pushSettings.channels.headache_article !== undefined) {
          updateData["push.channels.headache_article"] =
            pushSettings.channels.headache_article;
        }
        if (pushSettings.channels.notification !== undefined) {
          updateData["push.channels.notification"] =
            pushSettings.channels.notification;
        }
      }

      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error("Error updating push settings:", error);
      throw new Error("プッシュ通知設定の更新に失敗しました");
    }
  }

  static async deleteDevice(uid: string, deviceId: string): Promise<void> {
    try {
      const docRef = doc(db, "users", uid, "devices", deviceId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error("Error deleting device:", error);
      throw new Error("デバイスの削除に失敗しました");
    }
  }
}

/**
 * 頭痛記録の読み書き（ブラウザ用）
 */
export class ClientHeadacheLogRepository {
  static async listLogs(uid: string, limit: number = 50): Promise<HeadacheLog[]> {
    try {
      const logsRef = collection(db, "headache_logs");
      const q = query(
        logsRef,
        where("userId", "==", uid),
        orderBy("timing", "desc"),
        firestoreLimit(limit)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((d) =>
        sanitizeHeadacheLogStrings({ id: d.id, ...(d.data() as Omit<HeadacheLog, "id">) })
      );
    } catch (error) {
      console.error("Error listing headache logs:", error);
      throw new Error("頭痛記録の取得に失敗しました");
    }
  }

  static async listLogsInRange(
    uid: string,
    startMs: number,
    endMs: number
  ): Promise<HeadacheLog[]> {
    try {
      const logsRef = collection(db, "headache_logs");
      const q = query(
        logsRef,
        where("userId", "==", uid),
        where("timing", ">=", Timestamp.fromMillis(startMs)),
        where("timing", "<=", Timestamp.fromMillis(endMs)),
        orderBy("timing", "desc")
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((d) =>
        sanitizeHeadacheLogStrings({ id: d.id, ...(d.data() as Omit<HeadacheLog, "id">) })
      );
    } catch (error) {
      console.error("Error listing headache logs in range:", error);
      throw new Error("頭痛記録の取得に失敗しました");
    }
  }

  /**
   * 入力候補を集計するために、頭痛記録を「手を加えずそのまま」取得する。
   *
   * 検索条件（本人の記録・指定期間・新しい順）は `listLogsInRange` と同じ。
   * ただし `sanitizeHeadacheLogStrings` による整形は行わないため、空白や全角/半角の違い、
   * 同じ値の重複、薬と服薬量の組み合わせは保存されたままの形で返る。
   * 各記録は `readRawSuggestionLog` で中身を確認し、集計に使えないものは除外する。
   */
  static async listLogsInRangeRaw(
    uid: string,
    startMs: number,
    endMs: number
  ): Promise<SuggestionSourceLog[]> {
    try {
      const logsRef = collection(db, "headache_logs");
      const q = query(
        logsRef,
        where("userId", "==", uid),
        where("timing", ">=", Timestamp.fromMillis(startMs)),
        where("timing", "<=", Timestamp.fromMillis(endMs)),
        orderBy("timing", "desc")
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs
        .map((d) => readRawSuggestionLog(d.data()))
        .filter((log): log is SuggestionSourceLog => log !== null);
    } catch (error) {
      console.error("Error listing headache logs in range (raw):", error);
      throw new Error("頭痛記録の取得に失敗しました");
    }
  }

  static async getLog(logId: string): Promise<HeadacheLog | null> {
    try {
      const docRef = doc(db, "headache_logs", logId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        return null;
      }
      return sanitizeHeadacheLogStrings({
        id: docSnap.id,
        ...(docSnap.data() as Omit<HeadacheLog, "id">),
      });
    } catch (error) {
      console.error("Error getting headache log:", error);
      throw new Error("頭痛記録の取得に失敗しました");
    }
  }

  static async createLog(data: Omit<HeadacheLog, "id">): Promise<string> {
    try {
      const collectionRef = collection(db, "headache_logs");
      const sanitized = sanitizeHeadacheLogStrings(data);
      const payload = omitUndefinedDeep(sanitized);
      const docRef = await addDoc(collectionRef, payload as Record<string, unknown>);
      return docRef.id;
    } catch (error) {
      console.error("Error creating headache log:", error);
      throw new Error("頭痛記録の作成に失敗しました");
    }
  }

  static async updateLog(logId: string, data: HeadacheLogUpdateData): Promise<void> {
    try {
      const docRef = doc(db, "headache_logs", logId);
      const sanitized = sanitizeHeadacheLogStrings(data);
      const payload = omitUndefinedDeep(sanitized);
      await updateDoc(docRef, payload as Record<string, unknown>);
    } catch (error) {
      console.error("Error updating headache log:", error);
      throw new Error("頭痛記録の更新に失敗しました");
    }
  }

  static async deleteLog(logId: string): Promise<void> {
    try {
      const docRef = doc(db, "headache_logs", logId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error("Error deleting headache log:", error);
      throw new Error("頭痛記録の削除に失敗しました");
    }
  }
}

/**
 * 頭痛記録フォームの設定（項目の並び順・表示・入力候補など）の読み書き（ブラウザ用）
 */
export class ClientHeadacheLogPreferenceRepository {
  static async getByUserId(
    uid: string
  ): Promise<{ docId: string; data: HeadacheLogPreference } | null> {
    try {
      const preferencesRef = collection(db, "headache_log_preferences");
      const q = query(preferencesRef, where("userId", "==", uid), firestoreLimit(1));
      const querySnapshot = await getDocs(q);
      const preferenceDoc = querySnapshot.docs[0];

      if (!preferenceDoc) {
        return null;
      }

      return {
        docId: preferenceDoc.id,
        data: preferenceDoc.data() as HeadacheLogPreference,
      };
    } catch (error) {
      console.error("Error getting headache log preference:", error);
      throw new Error("頭痛記録フォーム設定の取得に失敗しました");
    }
  }

  static async save(uid: string, fields: HeadacheLogPreferenceSaveData): Promise<void> {
    try {
      const payload = omitUndefinedDeep({
        userId: uid,
        headacheLogFormOrder: fields.headacheLogFormOrder,
        visibleItems: fields.visibleItems,
        durationInputType: fields.durationInputType,
      });
      const existing = await this.getByUserId(uid);

      if (existing) {
        const docRef = doc(db, "headache_log_preferences", existing.docId);
        await updateDoc(docRef, payload as Record<string, unknown>);
        return;
      }

      const collectionRef = collection(db, "headache_log_preferences");
      await addDoc(collectionRef, payload as Record<string, unknown>);
    } catch (error) {
      console.error("Error saving headache log preference:", error);
      throw new Error("頭痛記録フォーム設定の保存に失敗しました");
    }
  }

  /**
   * 1 つの項目（fieldKey）について、入力候補の設定を保存する。
   *
   * - 保存前に入力内容をチェックし、件数の上限超過や入力ルール違反があればエラーにする
   *   （はみ出した分を勝手に削って保存したことにはしない）。
   * - 保存先を決めるため、最新の設定を読み直す。保存済みの設定が壊れていて読めない場合は、
   *   上書きで消してしまわないよう保存を中止する。
   * - 設定がすでにあれば、その項目の部分だけを更新する。まだなければ新しく作成する。
   */
  static async saveSuggestionSetting(
    uid: string,
    fieldKey: SuggestionFieldKey,
    state: SuggestionEditorState
  ): Promise<void> {
    const payloadResult = buildSuggestionSavePayload(state);
    if (!payloadResult.ok) {
      throw new Error(payloadResult.errors[0]);
    }

    let existing: { docId: string; data: HeadacheLogPreference } | null;
    try {
      existing = await this.getByUserId(uid);
    } catch (error) {
      console.error("Error loading preference before saving suggestion setting:", error);
      throw new Error("入力候補設定の保存に失敗しました");
    }

    // 画面で開いた後に別の端末などで設定が変わっている可能性があるため、保存直前にもう一度中身を確認する。
    const latest = readSuggestionSettingForEdit(existing?.data.suggestionSettings, fieldKey);
    if (latest.containerStatus === "invalid" || latest.fieldStatus === "invalid") {
      throw new Error(UNREADABLE_SETTING_MESSAGE);
    }

    try {
      if (existing) {
        const docRef = doc(db, "headache_log_preferences", existing.docId);
        await updateDoc(docRef, {
          [`suggestionSettings.${fieldKey}`]: payloadResult.payload.fieldPayload,
        });
        return;
      }

      const collectionRef = collection(db, "headache_log_preferences");
      await addDoc(collectionRef, {
        userId: uid,
        suggestionSettings: {
          [fieldKey]: payloadResult.payload.fieldPayload,
        },
      });
    } catch (error) {
      console.error("Error saving headache log suggestion setting:", error);
      throw new Error("入力候補設定の保存に失敗しました");
    }
  }
}

/**
 * 利用状況の記録（ブラウザ用）
 */
export class ClientUsageTrackingRepository {
  static async trackSuggestionUsed(
    uid: string,
    sessionId: string,
    isNewEntry: boolean
  ): Promise<void> {
    const mode = isNewEntry ? "create" : "update";

    try {
      const usageRef = doc(db, "users", uid, "usage_tracking", "headacheLogUsage");
      const sessionRef = doc(
        db,
        "users",
        uid,
        "usage_tracking",
        "headacheLogUsage",
        "sessions",
        sessionId
      );

      await Promise.all([
        setDoc(
          usageRef,
          {
            [mode]: {
              suggestionUsed: increment(1),
            },
            lastEventAt: serverTimestamp(),
          },
          { merge: true }
        ),
        setDoc(
          sessionRef,
          {
            mode,
            suggestionUsedCount: increment(1),
          },
          { merge: true }
        ),
      ]);
    } catch (error) {
      console.warn("Error tracking suggestion usage:", error);
    }
  }
}

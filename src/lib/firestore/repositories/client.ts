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
} from "firebase/firestore";
import type { FieldValue } from "firebase/firestore";
import {
  User,
  Subscription,
  Invoice,
  CheckoutSession,
  Device,
  HeadacheLog,
  HeadacheLogPreference,
} from "../types";
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
 * User Repository (Client-side)
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
 * Subscription Repository (Client-side)
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
 * Invoice Repository (Client-side)
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
 * CheckoutSession Repository (Client-side)
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
 * Device Repository (Client-side)
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
 * HeadacheLog Repository (Client-side)
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
 * HeadacheLogPreference Repository (Client-side)
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
}

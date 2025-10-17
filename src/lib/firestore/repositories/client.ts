"use client";

import { db } from "@/lib/firebase/firestore.client";
import {
  doc,
  getDoc,
  collection,
  query,
  orderBy,
  limit as firestoreLimit,
  getDocs,
  addDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  deleteDoc,
  where,
} from "firebase/firestore";
import {
  User,
  Subscription,
  Invoice,
  CheckoutSession,
  Device,
} from "../types";

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
      const invoicesRef = collection(db, "invoices", uid, "invoices");
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
      const docRef = doc(db, "invoices", uid, "invoices", invoiceId);
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

      const updateData: Record<string, any> = {};
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

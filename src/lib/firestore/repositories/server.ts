import { getAdminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import {
  User,
  Subscription,
  Invoice,
  CheckoutSession,
  AuditLog,
  Device,
} from "../types";

const db = getAdminDb();

/**
 * User Repository (Server-side)
 */
export class UserRepository {
  static async getUser(uid: string): Promise<User | null> {
    try {
      const docRef = db.collection("users").doc(uid);
      const doc = await docRef.get();

      if (!doc.exists) {
        return null;
      }

      return doc.data() as User;
    } catch (error) {
      console.error("Error getting user:", error);
      throw new Error("ユーザー情報の取得に失敗しました");
    }
  }

  static async createUser(
    uid: string,
    data: Partial<User>
  ): Promise<void> {
    try {
      const docRef = db.collection("users").doc(uid);
      const now = FieldValue.serverTimestamp();

      const existingDoc = await docRef.get();
      if (existingDoc.exists) {
        await this.updateUser(uid, data);
        return;
      }

      await docRef.set({
        email: data.email || "",
        createdAt: now,
        lastLoginAt: now,
        ...(data.stripeCustomerId && { stripeCustomerId: data.stripeCustomerId }),
        ...(data.admin !== undefined && { admin: data.admin }),
      });
    } catch (error) {
      console.error("Error creating user:", error);
      throw new Error("ユーザーの作成に失敗しました");
    }
  }

  static async updateUser(
    uid: string,
    data: Partial<User>
  ): Promise<void> {
    try {
      const docRef = db.collection("users").doc(uid);
      
      if (Object.keys(data).length === 0) {
        return;
      }
      
      await docRef.update(data);
    } catch (error) {
      console.error("Error updating user:", error);
      throw new Error("ユーザー情報の更新に失敗しました");
    }
  }

  static async updateLastLogin(uid: string): Promise<void> {
    try {
      const docRef = db.collection("users").doc(uid);
      await docRef.update({
        lastLoginAt: FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error("Error updating last login:", error);
    }
  }

  static async setStripeCustomerId(
    uid: string,
    customerId: string
  ): Promise<void> {
    try {
      const docRef = db.collection("users").doc(uid);
      await docRef.update({
        stripeCustomerId: customerId,
      });
    } catch (error) {
      console.error("Error setting Stripe customer ID:", error);
      throw new Error("Stripe顧客IDの設定に失敗しました");
    }
  }
}

/**
 * Subscription Repository (Server-side)
 */
export class SubscriptionRepository {
  static async getSubscription(uid: string): Promise<Subscription | null> {
    try {
      const docRef = db.collection("subscriptions").doc(uid);
      const doc = await docRef.get();

      if (!doc.exists) {
        return null;
      }

      return doc.data() as Subscription;
    } catch (error) {
      console.error("Error getting subscription:", error);
      throw new Error("サブスクリプション情報の取得に失敗しました");
    }
  }

  static async setSubscription(
    uid: string,
    data: Subscription
  ): Promise<void> {
    try {
      const docRef = db.collection("subscriptions").doc(uid);
      await docRef.set({
        ...data,
        updatedAt: FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error("Error setting subscription:", error);
      throw new Error("サブスクリプションの設定に失敗しました");
    }
  }

  static async updateSubscription(
    uid: string,
    data: Partial<Subscription>
  ): Promise<void> {
    try {
      const docRef = db.collection("subscriptions").doc(uid);
      await docRef.update({
        ...data,
        updatedAt: FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error("Error updating subscription:", error);
      throw new Error("サブスクリプションの更新に失敗しました");
    }
  }

  static async deleteSubscription(uid: string): Promise<void> {
    try {
      const docRef = db.collection("subscriptions").doc(uid);
      await docRef.delete();
    } catch (error) {
      console.error("Error deleting subscription:", error);
      throw new Error("サブスクリプションの削除に失敗しました");
    }
  }
}

/**
 * Invoice Repository (Server-side)
 */
export class InvoiceRepository {
  static async listInvoices(
    uid: string,
    limit: number = 10
  ): Promise<Invoice[]> {
    try {
      const collectionRef = db.collection("invoices").doc(uid).collection("invoices");
      const snapshot = await collectionRef
        .orderBy("createdAt", "desc")
        .limit(limit)
        .get();

      return snapshot.docs.map((doc) => doc.data() as Invoice);
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
      const docRef = db
        .collection("invoices")
        .doc(uid)
        .collection("invoices")
        .doc(invoiceId);
      const doc = await docRef.get();

      if (!doc.exists) {
        return null;
      }

      return doc.data() as Invoice;
    } catch (error) {
      console.error("Error getting invoice:", error);
      throw new Error("請求情報の取得に失敗しました");
    }
  }

  static async createInvoice(
    uid: string,
    invoiceId: string,
    data: Invoice
  ): Promise<void> {
    try {
      const docRef = db
        .collection("invoices")
        .doc(uid)
        .collection("invoices")
        .doc(invoiceId);
      await docRef.set(data);
    } catch (error) {
      console.error("Error creating invoice:", error);
      throw new Error("請求情報の作成に失敗しました");
    }
  }

  static async updateInvoice(
    uid: string,
    invoiceId: string,
    data: Partial<Invoice>
  ): Promise<void> {
    try {
      const docRef = db
        .collection("invoices")
        .doc(uid)
        .collection("invoices")
        .doc(invoiceId);
      await docRef.update(data);
    } catch (error) {
      console.error("Error updating invoice:", error);
      throw new Error("請求情報の更新に失敗しました");
    }
  }
}

/**
 * CheckoutSession Repository (Server-side)
 */
export class CheckoutSessionRepository {
  static async getSession(sessionId: string): Promise<CheckoutSession | null> {
    try {
      const docRef = db.collection("checkout_sessions").doc(sessionId);
      const doc = await docRef.get();

      if (!doc.exists) {
        return null;
      }

      return doc.data() as CheckoutSession;
    } catch (error) {
      console.error("Error getting checkout session:", error);
      throw new Error("チェックアウトセッションの取得に失敗しました");
    }
  }

  static async createSession(
    sessionId: string,
    data: CheckoutSession
  ): Promise<void> {
    try {
      const docRef = db.collection("checkout_sessions").doc(sessionId);
      await docRef.set(data);
    } catch (error) {
      console.error("Error creating checkout session:", error);
      throw new Error("チェックアウトセッションの作成に失敗しました");
    }
  }

  static async updateSession(
    sessionId: string,
    data: Partial<CheckoutSession>
  ): Promise<void> {
    try {
      const docRef = db.collection("checkout_sessions").doc(sessionId);
      await docRef.update(data);
    } catch (error) {
      console.error("Error updating checkout session:", error);
      throw new Error("チェックアウトセッションの更新に失敗しました");
    }
  }
}

/**
 * AuditLog Repository (Server-side)
 */
export class AuditLogRepository {
  static async createLog(data: AuditLog): Promise<void> {
    try {
      const collectionRef = db.collection("audit_logs");
      await collectionRef.add(data);
    } catch (error) {
      console.error("Error creating audit log:", error);
      throw new Error("監査ログの作成に失敗しました");
    }
  }

  static async getLogsByType(
    type: string,
    limit: number = 100
  ): Promise<AuditLog[]> {
    try {
      const collectionRef = db.collection("audit_logs");
      const snapshot = await collectionRef
        .where("type", "==", type)
        .orderBy("ts", "desc")
        .limit(limit)
        .get();

      return snapshot.docs.map((doc) => doc.data() as AuditLog);
    } catch (error) {
      console.error("Error getting audit logs:", error);
      throw new Error("監査ログの取得に失敗しました");
    }
  }

  static async getLogsByUid(
    uid: string,
    limit: number = 100
  ): Promise<AuditLog[]> {
    try {
      const collectionRef = db.collection("audit_logs");
      const snapshot = await collectionRef
        .where("uid", "==", uid)
        .orderBy("ts", "desc")
        .limit(limit)
        .get();

      return snapshot.docs.map((doc) => doc.data() as AuditLog);
    } catch (error) {
      console.error("Error getting audit logs by uid:", error);
      throw new Error("ユーザーの監査ログ取得に失敗しました");
    }
  }
}

/**
 * Device Repository (Server-side)
 */
export class DeviceRepository {
  static async getDevice(
    uid: string,
    deviceId: string
  ): Promise<Device | null> {
    try {
      const docRef = db
        .collection("users")
        .doc(uid)
        .collection("devices")
        .doc(deviceId);
      const doc = await docRef.get();

      if (!doc.exists) {
        return null;
      }

      return doc.data() as Device;
    } catch (error) {
      console.error("Error getting device:", error);
      throw new Error("デバイス情報の取得に失敗しました");
    }
  }

  static async listDevices(uid: string): Promise<Device[]> {
    try {
      const collectionRef = db
        .collection("users")
        .doc(uid)
        .collection("devices");
      const snapshot = await collectionRef
        .orderBy("lastSeenAt", "desc")
        .get();

      return snapshot.docs.map((doc) => doc.data() as Device);
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
      const docRef = db
        .collection("users")
        .doc(uid)
        .collection("devices")
        .doc(deviceId);
      
      await docRef.set(
        {
          ...data,
          userId: uid,
          lastSeenAt: FieldValue.serverTimestamp(),
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
    token: string,
    tokenValid: boolean = true
  ): Promise<void> {
    try {
      const docRef = db
        .collection("users")
        .doc(uid)
        .collection("devices")
        .doc(deviceId);
      
      await docRef.update({
        token,
        tokenValid,
        lastRefreshedAt: FieldValue.serverTimestamp(),
        lastSeenAt: FieldValue.serverTimestamp(),
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
      const docRef = db
        .collection("users")
        .doc(uid)
        .collection("devices")
        .doc(deviceId);
      
      const updateData: Record<string, any> = {};
      if (pushSettings.pushEnabled !== undefined) {
        updateData["push.pushEnabled"] = pushSettings.pushEnabled;
      }
      if (pushSettings.channels) {
        if (pushSettings.channels.headache_article !== undefined) {
          updateData["push.channels.headache_article"] = pushSettings.channels.headache_article;
        }
        if (pushSettings.channels.notification !== undefined) {
          updateData["push.channels.notification"] = pushSettings.channels.notification;
        }
      }

      await docRef.update(updateData);
    } catch (error) {
      console.error("Error updating push settings:", error);
      throw new Error("プッシュ通知設定の更新に失敗しました");
    }
  }

  static async invalidateToken(
    uid: string,
    deviceId: string
  ): Promise<void> {
    try {
      const docRef = db
        .collection("users")
        .doc(uid)
        .collection("devices")
        .doc(deviceId);
      
      await docRef.update({
        tokenValid: false,
      });
    } catch (error) {
      console.error("Error invalidating token:", error);
      throw new Error("トークンの無効化に失敗しました");
    }
  }

  static async deleteDevice(
    uid: string,
    deviceId: string
  ): Promise<void> {
    try {
      const docRef = db
        .collection("users")
        .doc(uid)
        .collection("devices")
        .doc(deviceId);
      
      await docRef.delete();
    } catch (error) {
      console.error("Error deleting device:", error);
      throw new Error("デバイスの削除に失敗しました");
    }
  }

  static async getValidDevicesForPush(
    uid: string,
    channel: "headache_article" | "notification"
  ): Promise<Device[]> {
    try {
      const collectionRef = db
        .collection("users")
        .doc(uid)
        .collection("devices");
      
      const snapshot = await collectionRef
        .where("tokenValid", "==", true)
        .where("push.pushEnabled", "==", true)
        .where(`push.channels.${channel}`, "==", true)
        .get();

      return snapshot.docs.map((doc) => doc.data() as Device);
    } catch (error) {
      console.error("Error getting valid devices for push:", error);
      throw new Error("プッシュ通知可能なデバイスの取得に失敗しました");
    }
  }
}

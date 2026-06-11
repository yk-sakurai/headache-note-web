import {
  CollectionReference,
  DocumentData,
  DocumentReference,
  Query,
  QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { DeletedUserSnapshot } from "../types";
import { omitUndefinedDeep } from "./sanitize";

const db = getAdminDb();

async function deleteDocsInBatches(
  docs: QueryDocumentSnapshot<DocumentData>[]
) {
  let batch = db.batch();
  let count = 0;

  for (const doc of docs) {
    batch.delete(doc.ref);
    count += 1;

    if (count === 500) {
      await batch.commit();
      batch = db.batch();
      count = 0;
    }
  }

  if (count > 0) {
    await batch.commit();
  }
}

async function deleteQueryInBatches(query: Query<DocumentData>) {
  const snapshot = await query.get();
  await deleteDocsInBatches(snapshot.docs);
}

async function deleteCollectionInBatches(collectionRef: CollectionReference<DocumentData>) {
  const snapshot = await collectionRef.get();
  await deleteDocsInBatches(snapshot.docs);
}

export class DeletedUserSnapshotRepository {
  static async exists(uid: string): Promise<boolean> {
    const doc = await db.collection("deleted_user_snapshots").doc(uid).get();
    return doc.exists;
  }

  static async create(uid: string, snapshot: DeletedUserSnapshot): Promise<void> {
    const payload = omitUndefinedDeep(snapshot);
    await db.collection("deleted_user_snapshots").doc(uid).set(payload);
  }
}

export class WithdrawalDataRepository {
  static async getUser(uid: string): Promise<Record<string, unknown> | null> {
    const doc = await db.collection("users").doc(uid).get();
    return doc.exists ? doc.data() ?? null : null;
  }

  static async getSubscription(uid: string): Promise<Record<string, unknown> | null> {
    const doc = await db.collection("subscriptions").doc(uid).get();
    return doc.exists ? doc.data() ?? null : null;
  }

  static async getUserAppVersion(uid: string): Promise<Record<string, unknown> | null> {
    const snapshot = await db
      .collection("user_app_versions")
      .where("userId", "==", uid)
      .limit(1)
      .get();
    return snapshot.empty ? null : snapshot.docs[0].data();
  }

  static async listHeadacheLogs(uid: string): Promise<Record<string, unknown>[]> {
    const snapshot = await db
      .collection("headache_logs")
      .where("userId", "==", uid)
      .get();
    return snapshot.docs.map((doc) => doc.data());
  }

  static async listAiReportRequests(uid: string): Promise<Record<string, unknown>[]> {
    const snapshot = await db
      .collection("users")
      .doc(uid)
      .collection("ai_report_requests")
      .get();
    return snapshot.docs.map((doc) => doc.data());
  }

  static async listAiReports(uid: string): Promise<Record<string, unknown>[]> {
    const snapshot = await db
      .collection("users")
      .doc(uid)
      .collection("ai_reports")
      .get();
    return snapshot.docs.map((doc) => doc.data());
  }

  static async countInputSets(uid: string): Promise<number> {
    const snapshot = await db
      .collection("headache_log_input_sets")
      .where("userId", "==", uid)
      .get();
    return snapshot.size;
  }

  static async getUsageTrackingSummary(
    uid: string
  ): Promise<Record<string, unknown> | undefined> {
    const doc = await db
      .collection("users")
      .doc(uid)
      .collection("usage_tracking")
      .doc("headacheLogUsage")
      .get();
    return doc.exists ? doc.data() : undefined;
  }

  static async getHeadacheAlertAccuracy(
    uid: string
  ): Promise<Record<string, unknown> | undefined> {
    const doc = await db
      .collection("users")
      .doc(uid)
      .collection("metrics")
      .doc("headacheAlertAccuracy")
      .get();
    return doc.exists ? doc.data() : undefined;
  }

  static async deleteHeadacheLogs(uid: string): Promise<void> {
    await deleteQueryInBatches(
      db.collection("headache_logs").where("userId", "==", uid)
    );
  }

  static async deleteHeadacheLogPreferences(uid: string): Promise<void> {
    await deleteQueryInBatches(
      db.collection("headache_log_preferences").where("userId", "==", uid)
    );
  }

  static async deletePrivacyConsents(uid: string): Promise<void> {
    await deleteQueryInBatches(
      db.collection("privacy_consents").where("userId", "==", uid)
    );
  }

  static async deleteUserAppVersions(uid: string): Promise<void> {
    await deleteQueryInBatches(
      db.collection("user_app_versions").where("userId", "==", uid)
    );
  }

  static async deleteAiReportRequests(uid: string): Promise<void> {
    await deleteCollectionInBatches(
      db.collection("users").doc(uid).collection("ai_report_requests")
    );
  }

  static async deleteAiReports(uid: string): Promise<void> {
    await deleteCollectionInBatches(
      db.collection("users").doc(uid).collection("ai_reports")
    );
  }

  static async deleteAiReportAutoGenerationPreference(uid: string): Promise<void> {
    await db
      .collection("users")
      .doc(uid)
      .collection("ai_report_preferences")
      .doc("auto_generation")
      .delete();
  }

  static async deleteHeadacheLogInputSets(uid: string): Promise<void> {
    await deleteQueryInBatches(
      db.collection("headache_log_input_sets").where("userId", "==", uid)
    );
  }

  static async deleteUsageTracking(uid: string): Promise<void> {
    const docRef = db
      .collection("users")
      .doc(uid)
      .collection("usage_tracking")
      .doc("headacheLogUsage") as DocumentReference<DocumentData>;
    await db.recursiveDelete(docRef);
  }

  static async deleteDevices(uid: string): Promise<void> {
    await deleteCollectionInBatches(
      db.collection("users").doc(uid).collection("devices")
    );
  }

  static async deleteUserSettings(uid: string): Promise<void> {
    const base = db.collection("users").doc(uid).collection("userSettings");
    await Promise.all([
      base.doc("location").delete(),
      base.doc("headacheAlertLocation").delete(),
    ]);
  }

  static async deleteHeadacheAlertAccuracy(uid: string): Promise<void> {
    await db
      .collection("users")
      .doc(uid)
      .collection("metrics")
      .doc("headacheAlertAccuracy")
      .delete();
  }
}

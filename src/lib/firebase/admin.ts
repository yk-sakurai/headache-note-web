import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getAuth, Auth } from "firebase-admin/auth";

let _adminApp: App | undefined;
let _adminFirestore: Firestore | undefined;
let _adminAuth: Auth | undefined;

function getAdminApp(): App {
  if (_adminApp) {
    return _adminApp;
  }

  const apps = getApps();
  if (apps.length > 0) {
    _adminApp = apps[0];
    return _adminApp;
  }

  if (process.env.FIRESTORE_EMULATOR_HOST) {
    _adminApp = initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-project",
    });
    return _adminApp;
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const serviceAccount = JSON.parse(
        process.env.FIREBASE_SERVICE_ACCOUNT_KEY
      );
      _adminApp = initializeApp({
        credential: cert(serviceAccount),
      });
      return _adminApp;
    } catch (error) {
      console.error("FIREBASE_SERVICE_ACCOUNT_KEY のパースに失敗:", error);
    }
  }

  if (
    process.env.FIREBASE_ADMIN_PROJECT_ID &&
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
    process.env.FIREBASE_ADMIN_PRIVATE_KEY
  ) {
    _adminApp = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(
          /\\n/g,
          "\n"
        ),
      }),
    });
    return _adminApp;
  }

  throw new Error(
    "Firebase Admin SDK が初期化できません。環境変数を確認してください。\n" +
      "以下のいずれかを設定してください：\n" +
      "1. FIRESTORE_EMULATOR_HOST (Emulator使用時)\n" +
      "2. FIREBASE_SERVICE_ACCOUNT_KEY (JSON形式)\n" +
      "3. FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY"
  );
}

export function getAdminDb(): Firestore {
  if (!_adminFirestore) {
    getAdminApp();
    _adminFirestore = getFirestore();
  }
  return _adminFirestore;
}

export function getAdminAuth(): Auth {
  if (!_adminAuth) {
    getAdminApp();
    _adminAuth = getAuth();
  }
  return _adminAuth;
}

export const adminApp = getAdminApp();
export const adminDb = getAdminDb();
export const adminAuth = getAdminAuth();

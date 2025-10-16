import * as admin from "firebase-admin";

function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  
  try {
    if (serviceAccountKey) {
      const serviceAccount = JSON.parse(serviceAccountKey);
      
      return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      console.warn(
        "FIREBASE_SERVICE_ACCOUNT_KEY not found. Using Application Default Credentials."
      );
      return admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    }
  } catch (error) {
    console.error("Failed to initialize Firebase Admin SDK:", error);
    throw error;
  }
}

export const adminApp = initializeFirebaseAdmin();
export const adminAuth = admin.auth(adminApp);

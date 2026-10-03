// src/lib/firebase-admin.ts
// Firebase Admin SDK — server-side only, used in API routes
import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

let adminApp: App;

function getAdminApp(): App {
  if (getApps().length === 0) {
    // When GOOGLE_APPLICATION_CREDENTIALS env var is set, or use service account JSON
    // For simplicity, we use the project ID from env and rely on Application Default Credentials
    // OR users can set FIREBASE_SERVICE_ACCOUNT_JSON with the full JSON string
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    if (serviceAccountJson) {
      const serviceAccount = JSON.parse(serviceAccountJson);
      adminApp = initializeApp({
        credential: cert(serviceAccount),
      });
    } else {
      // Fallback: use project ID directly (works with Application Default Credentials)
      adminApp = initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
    }
  } else {
    adminApp = getApps()[0];
  }
  return adminApp;
}

export function getAdminDb() {
  const app = getAdminApp();
  return getFirestore(app);
}

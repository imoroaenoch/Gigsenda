import { getApps, initializeApp, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";

function parsePrivateKey(key: string): string {
  return key
    .replace(/^["']|["']$/g, "")  // strip surrounding quotes if any
    .replace(/\\n/g, "\n");        // literal \n → real newline
}

export function getAdminApp(): App {
  if (getApps().length > 0) return getApps()[0];
  return initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey: parsePrivateKey(process.env.FIREBASE_PRIVATE_KEY!),
    }),
  });
}

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}

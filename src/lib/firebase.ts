import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, doc, getDocFromServer } from "firebase/firestore";
import firebaseConfigJson from "../../firebase-applet-config.json";

const app = initializeApp({
  apiKey: firebaseConfigJson.apiKey,
  authDomain: firebaseConfigJson.authDomain,
  projectId: firebaseConfigJson.projectId,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
  appId: firebaseConfigJson.appId,
  measurementId: firebaseConfigJson.measurementId
}, "splendid-medref-app");

export const auth = getAuth(app);

const dbId = firebaseConfigJson.firestoreDatabaseId || "(default)";

export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
}, dbId);

// Test connection on boot gracefully
async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, '_health', 'check'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firestore operating in offline/cached mode.");
    }
  }
}
testFirestoreConnection();

export async function ensureAnonymousAuth(): Promise<{ uid: string }> {
  if (auth.currentUser) {
    return auth.currentUser;
  }
  try {
    let localUid = localStorage.getItem("splendid_device_uid");
    if (!localUid) {
      localUid = "user_" + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
      localStorage.setItem("splendid_device_uid", localUid);
    }
    return { uid: localUid };
  } catch (_e) {
    return { uid: "user_default_session" };
  }
}


"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { signInAnonymously } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export default function DebugPage() {
  const [firebaseStatus, setFirebaseStatus] = useState<string>("Checking...");
  const [authStatus, setAuthStatus] = useState<string>("Checking...");
  const [firestoreStatus, setFirestoreStatus] = useState<string>("Checking...");
  const [envVars, setEnvVars] = useState<Record<string, string>>({});

  useEffect(() => {
    // Check environment variables
    const vars: Record<string, string> = {
      API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? "✅ Set" : "❌ Missing",
      AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? "✅ Set" : "❌ Missing",
      PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? "✅ Set" : "❌ Missing",
      STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ? "✅ Set" : "❌ Missing",
      MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ? "✅ Set" : "❌ Missing",
      APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? "✅ Set" : "❌ Missing",
    };
    setEnvVars(vars);

    // Check Firebase initialization
    try {
      if (auth && db) {
        setFirebaseStatus("✅ Firebase initialized successfully");
      } else {
        setFirebaseStatus("❌ Firebase not initialized");
      }
    } catch (error: any) {
      setFirebaseStatus(`❌ Error: ${error.message}`);
    }

    // Check Auth
    try {
      const unsubscribe = auth.onAuthStateChanged(
        (user) => {
          if (user) {
            setAuthStatus(`✅ Auth working - User: ${user.uid.substring(0, 8)}...`);
          } else {
            setAuthStatus("✅ Auth working - No user signed in");
          }
        },
        (error) => {
          setAuthStatus(`❌ Auth error: ${error.message}`);
        }
      );
      return () => unsubscribe();
    } catch (error: any) {
      setAuthStatus(`❌ Error: ${error.message}`);
    }

    // Check Firestore
    const checkFirestore = async () => {
      try {
        // Try to read a document that likely doesn't exist (just to test connection)
        const testDoc = await getDoc(doc(db, "_test_", "_test_"));
        setFirestoreStatus("✅ Firestore connection working");
      } catch (error: any) {
        if (error.code === "permission-denied" || error.code === "not-found") {
          setFirestoreStatus("✅ Firestore connection working (permission denied is OK)");
        } else {
          setFirestoreStatus(`❌ Firestore error: ${error.message}`);
        }
      }
    };
    checkFirestore();
  }, []);

  const testAnonymousLogin = async () => {
    try {
      const result = await signInAnonymously(auth);
      alert(`Anonymous login successful! UID: ${result.user.uid.substring(0, 8)}...`);
    } catch (error: any) {
      alert(`Anonymous login failed: ${error.message} (${error.code})`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Firebase Debug</h1>
        
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-xl">
            <h2 className="font-semibold text-blue-900 mb-2">Environment Variables</h2>
            {Object.entries(envVars).map(([key, value]) => (
              <div key={key} className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">{key}</span>
                <span className={value.includes("✅") ? "text-green-600" : "text-red-600"}>
                  {value}
                </span>
              </div>
            ))}
          </div>

          <div className="p-4 bg-gray-50 rounded-xl">
            <h2 className="font-semibold text-gray-900 mb-2">Firebase Status</h2>
            <p className="text-sm">{firebaseStatus}</p>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl">
            <h2 className="font-semibold text-gray-900 mb-2">Auth Status</h2>
            <p className="text-sm">{authStatus}</p>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl">
            <h2 className="font-semibold text-gray-900 mb-2">Firestore Status</h2>
            <p className="text-sm">{firestoreStatus}</p>
          </div>

          <button
            onClick={testAnonymousLogin}
            className="w-full py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors"
          >
            Test Anonymous Login
          </button>

          <div className="text-center">
            <a href="/login" className="text-orange-600 font-medium hover:underline">
              Back to Login
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

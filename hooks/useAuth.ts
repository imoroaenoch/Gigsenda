"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { User } from "@/types";

export const useAuth = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const [sessionWarning, setSessionWarning] = useState<boolean>(false);

  // Session timeout duration (30 minutes of inactivity)
  const SESSION_TIMEOUT = 30 * 60 * 1000;
  const WARNING_TIMEOUT = 25 * 60 * 1000; // Show warning at 25 minutes

  // Update last activity on user interaction
  useEffect(() => {
    const updateActivity = () => {
      setLastActivity(Date.now());
      setSessionWarning(false);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, updateActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity, true);
      });
    };
  }, []);

  // Check for session timeout
  useEffect(() => {
    if (!user) return;

    const checkSessionTimeout = () => {
      const now = Date.now();
      const timeSinceActivity = now - lastActivity;

      if (timeSinceActivity > SESSION_TIMEOUT) {
        // Session expired, sign out user
        auth.signOut();
        console.log("Session expired due to inactivity");
      } else if (timeSinceActivity > WARNING_TIMEOUT && !sessionWarning) {
        // Show warning
        setSessionWarning(true);
        console.log("Session will expire soon due to inactivity");
      }
    };

    const interval = setInterval(checkSessionTimeout, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [user, lastActivity, sessionWarning]);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;
    let profileSafetyTimeout: ReturnType<typeof setTimeout> | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);

      // Cleanup previous profile listener
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }
      if (profileSafetyTimeout) {
        clearTimeout(profileSafetyTimeout);
        profileSafetyTimeout = null;
      }

      if (firebaseUser) {
        setLastActivity(Date.now());
        setSessionWarning(false);

        // Safety timeout in case Firestore hangs
        profileSafetyTimeout = setTimeout(() => {
          console.log("Profile fetch safety timeout - forcing loading false");
          setLoading(false);
        }, 5000);

        // Listen to Firestore profile
        unsubscribeProfile = onSnapshot(
          doc(db, "users", firebaseUser.uid),
          (docSnap) => {
            if (docSnap.exists()) {
              setProfile(docSnap.data() as User);
            } else {
              setProfile(null);
            }
            if (profileSafetyTimeout) clearTimeout(profileSafetyTimeout);
            setLoading(false);
          },
          (err) => {
            console.error("Error listening to profile changes:", err);
            setError(err instanceof Error ? err : new Error(String(err)));
            if (profileSafetyTimeout) clearTimeout(profileSafetyTimeout);
            setLoading(false);
          }
        );
      } else {
        setProfile(null);
        setSessionWarning(false);
        setLoading(false);
      }
    }, (err) => {
      console.error("Auth state change error:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (profileSafetyTimeout) clearTimeout(profileSafetyTimeout);
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const role = profile?.role || profile?.accountType || null;
  
  // Function to manually refresh session
  const refreshSession = async () => {
    if (user) {
      try {
        await user.getIdToken(true);
        setLastActivity(Date.now());
        setSessionWarning(false);
      } catch (error) {
        console.error("Error refreshing session:", error);
      }
    }
  };

  return { 
    user, 
    profile, 
    role, 
    loading, 
    error, 
    sessionWarning,
    refreshSession,
    timeUntilTimeout: Math.max(0, SESSION_TIMEOUT - (Date.now() - lastActivity))
  };
};

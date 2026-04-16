"use client";

export const dynamic = 'force-dynamic';

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    let navigated = false;

    const doNavigate = (loggedIn: boolean) => {
      if (navigated) return;
      navigated = true;
      const hasSeenOnboarding = localStorage.getItem("hasSeenOnboarding");
      if (loggedIn) {
        router.replace("/home");
      } else if (hasSeenOnboarding) {
        router.replace("/login");
      } else {
        router.replace("/onboarding");
      }
    };

    // Hard cap: never stuck more than 3 seconds regardless of Firebase
    const hardCap = setTimeout(() => doNavigate(false), 3000);

    // Listen directly to Firebase auth — fastest possible signal
    const unsub = onAuthStateChanged(auth, (user) => {
      clearTimeout(hardCap);
      // Small delay so splash is visible briefly
      setTimeout(() => doNavigate(!!user), 800);
    });

    return () => {
      clearTimeout(hardCap);
      unsub();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-orange-50 via-white to-orange-50 p-4 text-center">
      {/* Logo/Brand Area */}
      <div className="animate-pulse">
        {/* Logo Icon */}
        <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-xl transform transition-all duration-500 hover:scale-105">
          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
            <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" />
          </svg>
        </div>
        
        {/* Brand Name */}
        <h1 className="text-3xl font-medium tracking-tighter text-gray-900 mb-2">
          Gigsenda
        </h1>
        
        {/* Tagline */}
        <p className="text-xs font-medium text-gray-600 max-w-xs mx-auto leading-relaxed">
          Find trusted local service providers near you
        </p>
      </div>
      
      {/* Enhanced Loading Indicator */}
      <div className="mt-12 flex space-x-2">
        <div className="h-3 w-3 animate-bounce rounded-full bg-gradient-to-r from-orange-400 to-orange-600 shadow-md [animation-delay:-0.3s]"></div>
        <div className="h-3 w-3 animate-bounce rounded-full bg-gradient-to-r from-orange-400 to-orange-600 shadow-md [animation-delay:-0.15s]"></div>
        <div className="h-3 w-3 animate-bounce rounded-full bg-gradient-to-r from-orange-400 to-orange-600 shadow-md"></div>
      </div>

      {/* Subtle loading text */}
      <p className="mt-6 text-xs font-medium text-gray-400 animate-pulse">
        Loading amazing services...
      </p>
    </main>
  );
}

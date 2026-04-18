"use client";

import { Zap, WifiOff, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

export default function OfflinePage() {
  const router = useRouter();

  const handleRetry = () => {
    if (navigator.onLine) {
      router.push("/home");
    } else {
      window.location.reload();
    }
  };

  return (
    <main className="min-h-screen bg-[#FFFDF7] flex flex-col items-center justify-center px-6 text-center">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-10">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/30">
          <Zap className="h-8 w-8 fill-white text-white" />
        </div>
        <span className="text-[26px] font-black text-text tracking-tight">Gigsenda</span>
      </div>

      {/* Icon */}
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gray-100 mb-6">
        <WifiOff className="h-12 w-12 text-gray-400" />
      </div>

      {/* Message */}
      <h1 className="text-[22px] font-black text-text mb-2">You&apos;re Offline</h1>
      <p className="text-[14px] font-medium text-text-light max-w-[260px] leading-relaxed mb-8">
        Please check your internet connection and try again.
      </p>

      {/* Retry button */}
      <button
        onClick={handleRetry}
        className="flex items-center gap-2 rounded-2xl bg-primary px-8 py-4 text-[15px] font-black text-white shadow-xl shadow-primary/25 active:scale-95 transition-all"
      >
        <RefreshCw className="h-5 w-5" />
        Retry
      </button>
    </main>
  );
}

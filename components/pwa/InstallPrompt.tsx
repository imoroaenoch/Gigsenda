"use client";

import { useEffect, useState } from "react";
import { Zap, X, Download, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandaloneMode() {
  if (typeof window === "undefined") return false;
  return (window.navigator as any).standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showAndroidBanner, setShowAndroidBanner] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    if (isInStandaloneMode()) return;
    const dismissed = sessionStorage.getItem("pwa-prompt-dismissed");
    if (dismissed) return;

    if (isIOS()) {
      setShowIOSModal(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowAndroidBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setShowAndroidBanner(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    sessionStorage.setItem("pwa-prompt-dismissed", "1");
    setShowAndroidBanner(false);
    setShowIOSModal(false);
  };

  if (showAndroidBanner) {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-[200] animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center gap-3 rounded-2xl bg-gray-900 px-4 py-3 shadow-2xl border border-gray-700">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary flex-shrink-0">
            <Zap className="h-5 w-5 fill-white text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-black text-white leading-tight">Install Gigsenda</p>
            <p className="text-[11px] font-medium text-gray-400">Get the full app experience</p>
          </div>
          <button
            onClick={handleInstall}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-[11px] font-black text-white flex-shrink-0 active:opacity-80"
          >
            <Download className="h-3.5 w-3.5" />
            Install
          </button>
          <button onClick={handleDismiss} className="flex-shrink-0 text-gray-500 active:opacity-70">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  if (showIOSModal) {
    return (
      <div className="fixed inset-0 z-[200] flex items-end justify-center">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleDismiss} />
        <div className="relative w-full max-w-sm mx-4 mb-4 rounded-3xl bg-white shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
                <Zap className="h-5 w-5 fill-white text-white" />
              </div>
              <div>
                <p className="text-[14px] font-black text-gray-900">Install Gigsenda</p>
                <p className="text-[10px] font-medium text-gray-400">Add to your Home Screen</p>
              </div>
            </div>
            <button onClick={handleDismiss} className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>

          {/* Steps */}
          <div className="px-5 py-4 space-y-4">
            {[
              {
                step: 1,
                icon: <Share className="h-5 w-5 text-blue-500" />,
                bg: "bg-blue-50",
                text: "Tap the",
                bold: "Share button",
                sub: "at the bottom of your browser",
              },
              {
                step: 2,
                icon: <span className="text-lg">➕</span>,
                bg: "bg-orange-50",
                text: "Scroll down and tap",
                bold: '"Add to Home Screen"',
                sub: "",
              },
              {
                step: 3,
                icon: <span className="text-lg font-black text-primary">✓</span>,
                bg: "bg-green-50",
                text: "Tap",
                bold: '"Add"',
                sub: "in the top right corner",
              },
            ].map(({ step, icon, bg, text, bold, sub }) => (
              <div key={step} className="flex items-start gap-3">
                <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${bg}`}>
                  {icon}
                </div>
                <div className="pt-1">
                  <p className="text-[13px] font-medium text-gray-700">
                    {text} <span className="font-black text-gray-900">{bold}</span>
                  </p>
                  {sub && <p className="text-[11px] font-medium text-gray-400 mt-0.5">{sub}</p>}
                </div>
              </div>
            ))}
          </div>

          <div className="px-5 pb-5">
            <button
              onClick={handleDismiss}
              className="w-full rounded-2xl bg-gray-100 py-3 text-[13px] font-black text-gray-600 active:scale-95 transition-all"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

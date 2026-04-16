"use client";

export const dynamic = 'force-dynamic';

import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, MessageCircle, HelpCircle } from "lucide-react";
import AuthGuard from "@/components/auth/AuthGuard";

export default function SupportPage() {
  const router = useRouter();

  return (
    <AuthGuard>
      <main className="min-h-screen bg-white pb-24 lg:pb-8">
        <header className="bg-white px-6 pt-12 pb-6 shadow-sm border-b border-gray-100 lg:pt-8">
          <div className="flex items-center gap-4 lg:max-w-2xl lg:mx-auto">
            <button onClick={() => router.back()} className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 border border-gray-100 active:scale-95 transition-all">
              <ArrowLeft className="h-5 w-5 text-text" />
            </button>
            <h1 className="text-xl font-medium text-text">Help & Support</h1>
          </div>
        </header>

        <div className="px-6 pt-8 space-y-4 lg:max-w-2xl lg:mx-auto">
          <a href="mailto:support@gigsenda.com" className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm border border-gray-100 active:scale-[0.98] transition-all">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Mail className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-medium text-text">Email Support</h3>
              <p className="text-xs font-medium text-text-light mt-0.5">support@gigsenda.com</p>
            </div>
          </a>

          <button
            onClick={() => router.push("/chat")}
            className="flex w-full items-center gap-4 rounded-2xl bg-white p-5 shadow-sm border border-gray-100 active:scale-[0.98] transition-all"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-green-600">
              <MessageCircle className="h-6 w-6" />
            </div>
            <div className="text-left">
              <h3 className="font-medium text-text">Live Chat</h3>
              <p className="text-xs font-medium text-text-light mt-0.5">Chat with our support team</p>
            </div>
          </button>

          <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <HelpCircle className="h-5 w-5 text-primary" />
              <h3 className="font-medium text-text">FAQs</h3>
            </div>
            <div className="space-y-3">
              {[
                { q: "How do I book a provider?", a: "Browse providers on the Home page, tap on one to view their profile, then tap Schedule." },
                { q: "How do I cancel a booking?", a: "Go to Bookings, find your pending or upcoming booking, and tap Cancel." },
                { q: "How are payments handled?", a: "Payments are processed securely. Providers receive 90% of the booking fee after completion." },
                { q: "How do I become a provider?", a: "Tap Profile > Become a Provider to submit your application for review." },
              ].map(({ q, a }) => (
                <details key={q} className="rounded-xl bg-gray-50 px-4 py-3 group">
                  <summary className="text-sm font-medium text-text cursor-pointer list-none flex items-center justify-between">
                    {q}
                    <span className="text-primary text-lg leading-none group-open:rotate-45 transition-transform">+</span>
                  </summary>
                  <p className="text-xs font-medium text-text-light mt-3 leading-relaxed">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}

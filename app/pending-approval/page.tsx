"use client";

export const dynamic = 'force-dynamic';

import { ShieldAlert, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth";
import { useState } from "react";

export default function PendingApprovalPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    try {
      setLoading(true);
      await signOut();
      router.replace("/login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background-cream px-6 text-center">
      <div className="rounded-full bg-primary/10 p-8">
        <ShieldAlert className="h-16 w-16 text-primary" />
      </div>
      <h1 className="mt-8 text-2xl font-medium text-text">Your account is under review</h1>
      <p className="mt-3 max-w-md text-text-light">
        We are reviewing your profile. You will be notified once approved. This usually takes 24-48 hours.
      </p>
      <button
        onClick={handleLogout}
        disabled={loading}
        className={`mt-10 inline-flex items-center space-x-2 rounded-2xl px-6 py-3 text-lg font-medium ${
          loading ? "bg-gray-300 text-gray-500" : "bg-primary text-white active:scale-95"
        }`}
      >
        <LogOut className="h-5 w-5" />
        <span>{loading ? "Logging out..." : "Logout"}</span>
      </button>
    </main>
  );
}


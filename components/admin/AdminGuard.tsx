"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ShieldAlert } from "lucide-react";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { profile, loading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || profile?.accountType !== "admin")) {
      // In a real app, you might redirect to a specific 403 page or login
      // For now, let's just let the UI handle the "Access Denied" state
    }
  }, [user, profile, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!user || profile?.accountType !== "admin") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6 text-center">
        <div className="rounded-full bg-red-50 p-6 text-red-500 mb-6">
          <ShieldAlert className="h-16 w-16" />
        </div>
        <h1 className="text-2xl font-black text-text mb-2">Access Denied</h1>
        <p className="text-text-light max-w-md mb-8">
          You do not have administrative privileges to access this area. If you believe this is an error, please contact support.
        </p>
        <button 
          onClick={() => router.push("/home")}
          className="rounded-xl bg-primary px-8 py-4 font-bold text-white shadow-lg active:scale-95 transition-all"
        >
          Return to App
        </button>
      </div>
    );
  }

  return <>{children}</>;
}

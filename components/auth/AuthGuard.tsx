"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
  requireApproval?: boolean;
}

export default function AuthGuard({ children, requireApproval = true }: AuthGuardProps) {
  const { user, profile, loading, error } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !error) {
      if (!user) {
        router.push(`/login?redirect=${pathname}`);
      } else if (profile) {
        const role = profile.role || profile.accountType;
        const viewAsCustomer = typeof window !== "undefined" && localStorage.getItem("viewAsCustomer") === "true";
        
        // Admin users always go to /admin/dashboard
        if (role === "admin" && !pathname.startsWith("/admin")) {
          router.push("/admin");
        }
        // Approved providers go to /provider/dashboard (unless viewing as customer)
        else if (role === "provider" && profile.isApproved && !pathname.startsWith("/provider") && !pathname.startsWith("/chat")) {
          if (!viewAsCustomer) {
            router.push("/provider/dashboard");
          }
        }
        // Unapproved providers go to pending-approval (unless viewing as customer)
        else if (role === "provider" && !profile.isApproved && requireApproval) {
          if (pathname !== "/pending-approval" && !viewAsCustomer) {
            router.push("/pending-approval");
          }
        }
      }
    }
  }, [user, profile, loading, error, router, pathname, requireApproval]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background-cream p-6 text-center">
        <div className="rounded-full bg-red-50 p-6 text-red-500 mb-6">
          <AlertCircle className="h-12 w-12" />
        </div>
        <h2 className="text-xl font-black text-text mb-2">Connection Error</h2>
        <p className="text-sm font-bold text-text-light max-w-xs leading-relaxed mb-8">
          We're having trouble connecting to our authentication servers. This might be due to a network issue or a browser extension.
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 rounded-2xl bg-primary px-8 py-4 font-black text-white shadow-xl shadow-primary/20 active:scale-95 transition-all"
        >
          <RefreshCw className="h-5 w-5" />
          Retry Connection
        </button>
      </div>
    );
  }

  // Block unapproved providers from non-pending pages (unless viewing as customer)
  if (user && profile) {
    const role = profile.role || profile.accountType;
    const viewAsCustomer = typeof window !== "undefined" && localStorage.getItem("viewAsCustomer") === "true";
    if (role === "provider" && !profile.isApproved && requireApproval && pathname !== "/pending-approval" && !viewAsCustomer) {
      return null;
    }
  }

  return user ? <>{children}</> : null;
}

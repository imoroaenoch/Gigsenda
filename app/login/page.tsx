"use client";

export const dynamic = 'force-dynamic';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { signInWithEmail, signInWithGoogle } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const getAuthError = (code: string): string => {
    switch (code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        return "Incorrect email or password. Please try again.";
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/user-disabled":
        return "This account has been disabled. Contact support.";
      case "auth/too-many-requests":
        return "Too many failed attempts. Please try again later.";
      case "auth/network-request-failed":
        return "Network error. Check your connection and try again.";
      case "auth/popup-closed-by-user":
        return "Sign-in popup was closed. Please try again.";
      default:
        return "Login failed. Please try again.";
    }
  };

  const redirectAfterLogin = async (uid: string) => {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) {
      const data = snap.data() as any;
      const role = data.role || data.accountType;
      if (role === "admin") {
        router.replace("/admin");
      } else if (role === "provider" && data.isApproved) {
        router.replace("/provider/dashboard");
      } else if (role === "provider" && !data.isApproved) {
        router.replace("/pending-approval");
      } else {
        router.replace("/home");
      }
    } else {
      router.replace("/home");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      setLoading(true);
      console.log("Attempting login with email:", email.trim());
      const user = await signInWithEmail(email.trim(), password);
      console.log("Login successful, user UID:", user.uid);
      await redirectAfterLogin(user.uid);
    } catch (err: any) {
      console.error("Login error:", err);
      console.error("Error code:", err?.code);
      console.error("Error message:", err?.message);
      setError(getAuthError(err?.code || ""));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    try {
      setLoading(true);
      const user = await signInWithGoogle("customer");
      await redirectAfterLogin(user.uid);
    } catch (err: any) {
      setError(getAuthError(err?.code || ""));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white">
      {/* Orange Top Section - Straight, No Curve */}
      <div className="bg-gradient-to-r from-orange-400 to-orange-600 h-56">
        <div className="flex flex-col items-center justify-center h-full px-6 text-center">
          <h1 className="text-3xl font-medium text-white mb-1">Login</h1>
          <p className="text-sm text-white/90">Welcome back! Please login to your account.</p>
        </div>
      </div>

      {/* Form Section - No Card, Direct on Page, Closer Fields */}
      <div className="px-6 pt-6 pb-12">
        <div className="max-w-md mx-auto">
          <form onSubmit={handleLogin} className="space-y-3">
            {/* Email Input */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all bg-gray-50 focus:bg-white text-sm"
              />
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all bg-gray-50 focus:bg-white text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="mt-1 text-right">
                <a href="/forgot-password" className="text-xs font-medium text-orange-600 hover:text-orange-700 transition-colors">
                  Forgot Password?
                </a>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading || !email || !password}
              className={`w-full py-2 px-4 rounded-lg font-semibold text-sm transition-all duration-200 ${
                loading || !email || !password
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-orange-400 to-orange-600 text-white hover:shadow-lg transform hover:scale-[1.02] active:scale-95"
              }`}
            >
              {loading ? (
                <span className="inline-flex items-center justify-center">
                  <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Signing In...
                </span>
              ) : (
                "Login"
              )}
            </button>

            {/* Divider */}
            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            {/* Google Button */}
            <button
              type="button"
              onClick={handleGoogle}
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 py-2 px-3 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-all duration-200 hover:shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span className="text-gray-700 font-medium text-sm">Google</span>
            </button>

            {/* Sign Up Link */}
            <p className="text-center text-gray-600 pt-2 text-sm">
              Don&apos;t have an account?{" "}
              <a href="/choose-account" className="font-semibold text-orange-600 hover:text-orange-700 transition-colors">
                Sign Up
              </a>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}


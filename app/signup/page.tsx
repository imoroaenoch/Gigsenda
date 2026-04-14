"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Mail, Phone, Lock, User as UserIcon, Eye, EyeOff } from "lucide-react";
import { signUpWithEmail, signInWithGoogle } from "@/lib/auth";
import type { AccountType } from "@/types";

function SignUpPage() {
  const router = useRouter();
  const params = useSearchParams();
  const initialType = (params.get("type") as AccountType) || "customer";

  const [accountType] = useState<AccountType>(initialType);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const disabled = useMemo(() => {
    return (
      !name.trim() ||
      !email.trim() ||
      !phone.trim() ||
      !password ||
      !confirm ||
      password !== confirm
    );
  }, [name, email, phone, password, confirm]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    try {
      setLoading(true);
      await signUpWithEmail(email.trim(), password, name.trim(), phone.trim(), accountType);
      if (accountType === "customer") {
        router.replace("/home");
      } else {
        router.replace("/provider-setup");
      }
    } catch (err: any) {
      setError(err?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async () => {
    setError("");
    try {
      setLoading(true);
      await signInWithGoogle(accountType);
      if (accountType === "customer") {
        router.replace("/home");
      } else {
        router.replace("/provider-setup");
      }
    } catch (err: any) {
      setError(err?.message || "Google sign in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white">
      {/* Orange Top Section - Straight, No Curve */}
      <div className="bg-gradient-to-r from-orange-400 to-orange-600 h-56">
        <div className="flex flex-col items-center justify-center h-full px-6 text-center">
          <div className="self-start mb-2">
            <button
              aria-label="Back"
              onClick={() => router.back()}
              className="rounded-xl p-2 text-white hover:bg-white/20 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          </div>
          <h1 className="text-3xl font-extrabold text-white mb-1">Create Account</h1>
          <p className="text-sm text-white/90">Fill in your information to create an account</p>
        </div>
      </div>

      {/* Form Section - No Card, Direct on Page, Closer Fields */}
      <div className="px-6 pt-6 pb-12">
        <div className="max-w-md mx-auto">
          <form onSubmit={onSubmit} className="space-y-3">
            {/* Name Input */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all bg-gray-50 focus:bg-white text-sm"
              />
            </div>

            {/* Email Input */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
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

            {/* Phone Input */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                placeholder="Enter your phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all bg-gray-50 focus:bg-white text-sm"
              />
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
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
            </div>

            {/* Confirm Password Input */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all bg-gray-50 focus:bg-white text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Sign Up Button */}
            <button
              type="submit"
              disabled={disabled || loading}
              className={`w-full py-2 px-4 rounded-lg font-semibold text-sm transition-all duration-200 ${
                disabled || loading
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-orange-400 to-orange-600 text-white hover:shadow-lg transform hover:scale-[1.02] active:scale-95"
              }`}
            >
              {loading ? (
                <span className="inline-flex items-center justify-center">
                  <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Signing Up...
                </span>
              ) : (
                "Sign Up"
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
              onClick={onGoogle}
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
              <span className="text-gray-700 font-semibold text-sm">Google</span>
            </button>

            {/* Login Link */}
            <p className="text-center text-gray-600 pt-2 text-sm">
              Already have an account?{" "}
              <a href="/login" className="font-semibold text-orange-600 hover:text-orange-700 transition-colors">
                Login
              </a>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}

export default function SignUpPageWrapper() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
      <SignUpPage />
    </Suspense>
  );
}


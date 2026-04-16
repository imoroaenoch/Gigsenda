"use client";

export const dynamic = 'force-dynamic';

import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError("");
    try {
      setLoading(true);
      await sendPasswordResetEmail(auth, email.trim());
      setMessage("Reset link sent. Check your email.");
    } catch (err: any) {
      setError(err?.message || "Failed to send reset link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background-cream px-6 py-6">
      <div className="mx-auto mt-8 max-w-md">
        <h1 className="text-3xl font-medium text-text">Forgot Password</h1>
        <p className="mt-2 text-text-light">Enter your email to receive a reset link</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="flex items-center rounded-2xl border border-gray-200 bg-white px-4">
            <Mail className="mr-3 h-5 w-5 text-primary" />
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent py-4 outline-none"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-green-600">{message}</p>}

          <button
            type="submit"
            disabled={loading || !email}
            className={`w-full rounded-2xl py-4 text-lg font-medium ${
              loading || !email ? "bg-gray-300 text-gray-500" : "bg-primary text-white active:scale-95"
            }`}
          >
            {loading ? (
              <span className="inline-flex items-center justify-center">
                <span className="mr-2 inline-block h-5 w-5 animate-spin rounded-full border-b-2 border-t-2 border-white" />
                Sending...
              </span>
            ) : (
              "Send Reset Link"
            )}
          </button>
        </form>
      </div>
    </main>
  );
}


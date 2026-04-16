"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";
import toast from "react-hot-toast";

const formatNaira = (amount: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 }).format(amount);

interface VerificationResult {
  success: boolean;
  message: string;
  data?: {
    reference: string;
    amount: number;
    bookingId: string;
    status: string;
  };
}

function PaymentVerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [countdown, setCountdown] = useState(3);

  const reference = searchParams.get("reference");

  useEffect(() => {
    if (!reference) {
      setVerificationResult({
        success: false,
        message: "No payment reference found",
      });
      setIsVerifying(false);
      return;
    }

    verifyPayment();
  }, [reference]);

  useEffect(() => {
    if (verificationResult?.success && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);

      return () => clearTimeout(timer);
    } else if (verificationResult?.success && countdown === 0) {
      router.push(`/booking-success/${verificationResult.data?.bookingId}`);
    }
  }, [countdown, verificationResult, router]);

  // Helper function to create notification
  const createNotification = async (userId: string, title: string, message: string, type: string) => {
    try {
      const { addDoc, collection } = await import("firebase/firestore");
      await addDoc(collection(db, "notifications"), {
        userId,
        title,
        message,
        type,
        read: false,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error creating notification:", error);
    }
  };

  const verifyPayment = async () => {
    try {
      const response = await fetch("/api/paystack/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reference,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Payment verification failed");
      }

      const bookingId = result.data?.bookingId;

      if (bookingId) {
        try {
          // Fetch booking to get provider and customer IDs
          const bookingRef = doc(db, "bookings", bookingId);
          const bookingSnap = await getDoc(bookingRef);

          if (bookingSnap.exists()) {
            const bookingData = bookingSnap.data();

            // Update booking with paid status and escrow details
            await updateDoc(bookingRef, {
              status: "paid",
              paymentStatus: "paid",
              paymentReference: result.data.reference,
              paymentDate: serverTimestamp(),
              escrowStatus: "holding",
              fundsReleased: false,
              updatedAt: serverTimestamp(),
            });

            // Send notification to provider
            if (bookingData.providerId) {
              await createNotification(
                bookingData.providerId,
                "New Paid Booking!",
                `You have a new paid booking from ${bookingData.customerName}. Get ready to deliver!`,
                "booking"
              );
            }

            // Send notification to customer
            if (bookingData.customerId) {
              await createNotification(
                bookingData.customerId,
                "Payment Successful!",
                "Your payment was successful and your booking is confirmed. The provider has been notified.",
                "payment"
              );
            }

            toast.success("Payment verified and booking confirmed!");
          }
        } catch (updateError) {
          console.error("Error updating booking after payment:", updateError);
          // Don't fail the verification if notification fails
        }
      }

      setVerificationResult({
        success: true,
        message: "Payment successful! Your booking is confirmed.",
        data: result.data,
      });
    } catch (error) {
      console.error("Payment verification error:", error);
      
      // Update booking status back to pending_payment on failure
      const bookingId = searchParams.get("bookingId");
      if (bookingId) {
        try {
          await updateDoc(doc(db, "bookings", bookingId), {
            status: "pending_payment",
            paymentStatus: "failed",
            paymentError: error instanceof Error ? error.message : "Payment failed",
            updatedAt: serverTimestamp(),
          });
        } catch (updateError) {
          console.error("Error updating booking status on failure:", updateError);
        }
      }
      
      setVerificationResult({
        success: false,
        message: error instanceof Error ? error.message : "Payment verification failed",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleTryAgain = () => {
    // Get bookingId from URL and redirect back to payment checkout
    const bookingId = searchParams.get("bookingId") || verificationResult?.data?.bookingId;
    if (bookingId) {
      router.push(`/payment/checkout?bookingId=${bookingId}`);
    } else {
      router.push("/bookings");
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <h2 className="text-lg text-gray-900 mb-2">Verifying Payment</h2>
          <p className="text-sm text-gray-600">Please wait while we confirm your payment...</p>
        </div>
      </div>
    );
  }

  if (verificationResult?.success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          {/* Success Icon */}
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          {/* Success Message */}
          <h1 className="text-2xl text-gray-900 mb-2">Payment Successful!</h1>
          <p className="text-gray-600 mb-6">Your booking is confirmed</p>

          {/* Booking Summary */}
          {verificationResult.data && (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Amount Paid</span>
                  <span className="text-green-600">
                    {formatNaira(verificationResult.data.amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Reference</span>
                  <span className="text-sm font-mono text-gray-700">
                    {verificationResult.data.reference}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Status</span>
                  <span className="text-sm font-medium text-green-600">Confirmed</span>
                </div>
              </div>
            </div>
          )}

          {/* Countdown */}
          <div className="text-sm text-gray-500">
            Redirecting to booking details in {countdown} seconds...
          </div>

          {/* Manual Redirect Button */}
          <button
            onClick={() => router.push(`/booking-success/${verificationResult.data?.bookingId}`)}
            className="mt-4 px-6 py-2 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 transition-colors"
          >
            View Booking
          </button>
        </div>
      </div>
    );
  }

  // Failed Payment Screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Error Icon */}
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>

        {/* Error Message */}
        <h1 className="text-2xl text-gray-900 mb-2">Payment Failed</h1>
        <p className="text-gray-600 mb-6">
          {verificationResult?.message || "Please try again"}
        </p>

        {/* Try Again Button */}
        <button
          onClick={handleTryAgain}
          className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

export default function PaymentVerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent"></div></div>}>
      <PaymentVerifyContent />
    </Suspense>
  );
}

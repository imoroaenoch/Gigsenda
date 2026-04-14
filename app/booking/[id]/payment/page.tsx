"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ChevronLeft, CreditCard, Shield, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import { getBookingById } from "@/lib/firestore";
import { useAuth } from "@/hooks/useAuth";
import AuthGuard from "@/components/auth/AuthGuard";
import Image from "next/image";

export default function PaymentPage() {
  const router = useRouter();
  const { id } = useParams();
  const { user } = useAuth();

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (id) {
      fetchBooking();
    }
  }, [id]);

  const fetchBooking = async () => {
    try {
      const bookingData = await getBookingById(id as string);
      if (!bookingData) {
        toast.error("Booking not found");
        router.push("/bookings");
        return;
      }

      // Check if booking belongs to current user
      if (bookingData.customerId !== user?.uid) {
        toast.error("Unauthorized access");
        router.push("/bookings");
        return;
      }

      // Check if payment is already completed
      if (bookingData.paymentStatus === "paid") {
        toast.success("Payment already completed");
        router.push(`/bookings/${id}`);
        return;
      }

      setBooking(bookingData);
    } catch (error) {
      console.error("Error fetching booking:", error);
      toast.error("Failed to load booking");
      router.push("/bookings");
    } finally {
      setLoading(false);
    }
  };

  const initializePayment = async () => {
    if (!booking) return;

    setProcessing(true);
    try {
      // Initialize Paystack payment with proper metadata structure
      const response = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user?.email,
          amount: booking.totalAmount,
          metadata: {
            bookingId: booking.id,
            customerId: booking.customerId,
            providerId: booking.providerId,
            customerName: booking.customerName,
            providerName: booking.providerName,
            serviceName: booking.serviceTitle || booking.category,
          },
        }),
      });

      const data = await response.json();

      if (data.success || data.data?.authorization_url) {
        // Redirect to Paystack payment page
        window.location.href = data.data.authorization_url;
      } else {
        toast.error(data.error || data.message || "Failed to initialize payment");
      }
    } catch (error) {
      console.error("Payment initialization error:", error);
      toast.error("Failed to initialize payment");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-background-cream flex items-center justify-center">
          <div className="text-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-text-light">Loading payment details...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (success) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-background-cream flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-black text-text mb-2">Payment Successful!</h2>
            <p className="text-text-light mb-6">Your booking has been confirmed and payment received.</p>
            <button
              onClick={() => router.push(`/bookings/${id}`)}
              className="w-full bg-primary text-white py-3 rounded-2xl font-black hover:bg-primary/90 transition-all"
            >
              View Booking
            </button>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background-cream">
        {/* Header */}
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-md mx-auto px-4 py-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-text-light hover:text-text transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
              <span className="font-medium">Back</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-md mx-auto px-4 py-6">
          <div className="text-center mb-8">
            <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-black text-text mb-2">Complete Payment</h1>
            <p className="text-text-light">Secure payment powered by Paystack</p>
          </div>

          {/* Booking Details */}
          {booking && (
            <div className="bg-white rounded-3xl p-6 mb-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-black text-text mb-4">Booking Details</h2>
              
              <div className="space-y-4">
                {/* Provider Info */}
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-gray-100 overflow-hidden">
                    {booking.providerPhoto && booking.providerPhoto !== null ? (
                      <Image src={booking.providerPhoto} alt={booking.providerName || "Provider"} width={48} height={48} className="object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-gray-200">
                        <span className="text-sm font-black text-gray-500">
                          {booking.providerName?.charAt(0).toUpperCase() || "P"}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-text">{booking.providerName || "Provider"}</p>
                    <p className="text-sm font-bold text-text-light">{booking.category || "Service"}</p>
                  </div>
                </div>

                {/* Service Details */}
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-sm font-bold text-text-light mb-1">Service</p>
                  <p className="font-black text-text">{booking.serviceTitle || booking.category || "Service"}</p>
                  {booking.servicePackage && (
                    <p className="text-sm text-text-light mt-1">{booking.servicePackage}</p>
                  )}
                </div>

                {/* Date */}
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-sm font-bold text-text-light mb-1">Date</p>
                  <p className="font-black text-text">
                    {booking.date ? new Date(booking.date.seconds * 1000).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    }) : 'To be scheduled'}
                  </p>
                </div>

                {/* Amount */}
                <div className="border-t border-gray-100 pt-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-text-light">Total Amount</p>
                    <p className="text-2xl font-black text-primary">₦{(booking.totalAmount || 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Security Badge */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <Shield className="h-4 w-4 text-green-600" />
            <span className="text-xs font-bold text-green-600">Secured by Paystack</span>
          </div>

          {/* Pay Button */}
          <button
            onClick={initializePayment}
            disabled={processing || !booking}
            className="w-full bg-primary text-white py-4 rounded-2xl font-black hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {processing ? (
              <>
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                <span>Processing...</span>
              </>
            ) : (
              <>
                <CreditCard className="h-5 w-5" />
                <span>{booking ? "Pay Now" : "Loading..."}</span>
              </>
            )}
          </button>

          {/* Terms */}
          <p className="text-center text-xs font-bold text-text-light/70 mt-4">
            By completing this payment, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </AuthGuard>
  );
}

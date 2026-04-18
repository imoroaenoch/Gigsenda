"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Shield, Calendar, Clock } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getAuth } from "firebase/auth";
import { format } from "date-fns";
import toast from "react-hot-toast";

interface BookingDetails {
  id: string;
  providerId: string;
  providerName: string;
  providerPhoto?: string;
  serviceTitle: string;
  category: string;
  date: any;
  totalAmount: number;
  commission?: number;
  providerEarning?: number;
  servicePackage?: string;
}

interface ProviderDetails {
  name: string;
  photoURL?: string;
  serviceTitle?: string;
}

function PaymentCheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const bookingId = searchParams.get("bookingId");

  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [provider, setProvider] = useState<ProviderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch booking details
  useEffect(() => {
    if (!bookingId) {
      toast.error("No booking ID found");
      router.push("/bookings");
      return;
    }

    const fetchBooking = async () => {
      try {
        const bookingRef = doc(db, "bookings", bookingId);
        const bookingSnap = await getDoc(bookingRef);

        if (!bookingSnap.exists()) {
          toast.error("Booking not found");
          router.push("/bookings");
          return;
        }

        const bookingData = { id: bookingSnap.id, ...bookingSnap.data() } as BookingDetails & { status: string };

        // Guard: only allow payment for accepted bookings with unpaid paymentStatus
        const ps = (bookingData as any).paymentStatus;
        if (bookingData.status !== "accepted") {
          toast.error(bookingData.status === "paid" ? "This booking is already paid." : "Provider hasn't accepted this booking yet.");
          router.push(`/bookings/${bookingId}`);
          return;
        }
        if (ps === "success") {
          toast.error("This booking is already paid.");
          router.push(`/bookings/${bookingId}`);
          return;
        }

        setBooking(bookingData);

        // Fetch provider details
        if (bookingData.providerId) {
          const providerRef = doc(db, "providers", bookingData.providerId);
          const providerSnap = await getDoc(providerRef);
          if (providerSnap.exists()) {
            setProvider(providerSnap.data() as ProviderDetails);
          }
        }
      } catch (error) {
        console.error("Error fetching booking:", error);
        toast.error("Failed to load booking details");
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId, router]);

  const handlePay = async () => {
    if (!booking || !user) return;
    setIsProcessing(true);

    try {
      const idToken = await getAuth().currentUser?.getIdToken();
      if (!idToken) throw new Error("Not authenticated");

      const response = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
        body: JSON.stringify({
          email: user.email,
          amount: booking.totalAmount * 100, // Paystack expects amount in kobo
          bookingId: booking.id,
          metadata: {
            bookingId: booking.id,
            customerId: user.uid,
            providerId: booking.providerId,
            customerName: user.displayName || user.email || "Customer",
            providerName: booking.providerName,
            serviceName: booking.serviceTitle || booking.category,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const errMsg = result.error || "Payment initialization failed";
        console.error("Payment API error:", errMsg, result);
        throw new Error(errMsg);
      }

      // Redirect to Paystack checkout
      window.location.href = result.data.authorization_url;
    } catch (error) {
      console.error("Payment error:", error);
      const msg = error instanceof Error ? error.message : "Failed to initialize payment. Please try again.";
      toast.error(msg, { duration: 6000 });
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!booking) return;
    
    if (confirm("Are you sure you want to cancel this booking?")) {
      try {
        // Update booking status back to pending or delete it
        const { updateDoc, doc } = await import("firebase/firestore");
        await updateDoc(doc(db, "bookings", booking.id), {
          status: "cancelled",
          cancelledAt: new Date(),
        });
        toast.success("Booking cancelled");
        router.push("/bookings");
      } catch (error) {
        toast.error("Failed to cancel booking");
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading checkout...</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-600">Booking not found</p>
      </div>
    );
  }

  const formattedDate = booking.date?.toDate
    ? format(booking.date.toDate(), "EEEE, MMMM d, yyyy")
    : "Date not set";

  const formattedTime = booking.date?.toDate
    ? format(booking.date.toDate(), "h:mm a")
    : "9:00 AM";

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Complete Your Booking</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Provider Card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4">
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
              {provider?.photoURL || booking.providerPhoto ? (
                <Image
                  src={provider?.photoURL || booking.providerPhoto || ""}
                  alt={provider?.name || booking.providerName}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-primary/10">
                  <span className="text-xl font-bold text-primary">
                    {(provider?.name || booking.providerName)?.charAt(0)}
                  </span>
                </div>
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {provider?.name || booking.providerName}
              </h2>
              <p className="text-sm text-gray-500">
                {booking.serviceTitle || booking.category}
              </p>
              {booking.servicePackage && (
                <span className="inline-block mt-1 px-2 py-0.5 bg-orange-50 text-orange-600 text-xs font-medium rounded-full">
                  {booking.servicePackage}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Date & Time */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Service Details</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-orange-50 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-[#FF8C00]" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{formattedDate}</p>
                <p className="text-xs text-gray-500">Service Date</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-orange-50 flex items-center justify-center">
                <Clock className="h-5 w-5 text-[#FF8C00]" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{formattedTime}</p>
                <p className="text-xs text-gray-500">Service Time</p>
              </div>
            </div>
          </div>
        </div>

        {/* Price Breakdown */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Price Breakdown</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Service Fee</span>
              <span className="font-medium text-gray-900">
                ₦{(booking.providerEarning ?? booking.totalAmount).toLocaleString()}
              </span>
            </div>
            {booking.commission != null && booking.commission > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Platform Fee</span>
                <span className="font-medium text-gray-900">₦{booking.commission.toLocaleString()}</span>
              </div>
            )}
          </div>

          <div className="my-4 h-px bg-gray-200"></div>

          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-gray-900">Total</span>
            <span className="text-xl font-black text-[#FF8C00]">
              ₦{booking.totalAmount.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Security Note */}
        <div className="flex items-start gap-3 bg-blue-50 rounded-xl p-4 mb-6">
          <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700">
            Your payment is held securely until the service is completed.
            Funds are only released to the provider after you confirm satisfactory service delivery.
          </p>
        </div>

        {/* Pay Button */}
        <div className="space-y-3">
          <button
            onClick={handlePay}
            disabled={isProcessing}
            className="w-full bg-[#FF8C00] text-white font-bold py-4 rounded-2xl shadow-lg shadow-orange-200 hover:bg-[#E67D00] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <span className="flex items-center justify-center gap-2">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                Processing...
              </span>
            ) : (
              `Pay ₦${booking.totalAmount.toLocaleString()} Securely`
            )}
          </button>

          <button
            onClick={handleCancel}
            disabled={isProcessing}
            className="w-full text-gray-500 font-medium py-3 hover:text-gray-700 transition-colors disabled:opacity-50"
          >
            Cancel Booking
          </button>
        </div>
      </main>
    </div>
  );
}

export default function PaymentCheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent"></div></div>}>
      <PaymentCheckoutContent />
    </Suspense>
  );
}

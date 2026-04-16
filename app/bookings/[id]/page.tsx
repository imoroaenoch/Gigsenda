"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import StatusTimeline from "@/components/bookings/StatusTimeline";
import BookingCard from "@/components/bookings/BookingCard";
import PaystackButton from "@/components/payment/PaystackButton";
import { releaseFunds, createDispute } from "@/lib/escrow";
import { ChevronLeft, MessageSquare, AlertTriangle, CheckCircle, Clock, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";

interface Booking {
  id: string;
  customerId: string;
  providerId: string;
  serviceId: string;
  serviceName: string;
  serviceTitle?: string;
  category: string;
  date: any;
  time: any;
  location: string;
  amount: number;
  totalAmount?: number;
  price?: number;
  referenceNumber: string;
  status: "pending" | "pending_payment" | "confirmed" | "paid" | "in_progress" | "completed" | "disputed" | "refunded" | "cancelled";
  escrowStatus?: "holding" | "released" | "refunded" | "disputed" | "none";
  fundsReleased?: boolean;
  inProgressAt?: any;
  createdAt: any;
  updatedAt: any;
  providerName?: string;
  customerName?: string;
}

interface UserInfo {
  id: string;
  fullName: string;
  name?: string;
  email: string;
  photoURL?: string;
  rating?: number;
}

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [customerInfo, setCustomerInfo] = useState<UserInfo | null>(null);
  const [providerInfo, setProviderInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const bookingId = params.id as string;

  useEffect(() => {
    fetchBooking();
  }, [bookingId]);

  const fetchBooking = async () => {
    try {
      const bookingDoc = await getDoc(doc(db, "bookings", bookingId));
      
      if (!bookingDoc.exists()) {
        toast.error("Booking not found");
        router.push("/bookings");
        return;
      }

      const bookingData = { id: bookingDoc.id, ...bookingDoc.data() } as Booking;
      setBooking(bookingData);

      // Fetch customer and provider info
      const customerDoc = await getDoc(doc(db, "users", bookingData.customerId));
      if (customerDoc.exists()) {
        setCustomerInfo({ id: customerDoc.id, ...customerDoc.data() } as UserInfo);
      }

      const providerDoc = await getDoc(doc(db, "users", bookingData.providerId));
      if (providerDoc.exists()) {
        setProviderInfo({ id: providerDoc.id, ...providerDoc.data() } as UserInfo);
      }
    } catch (error) {
      console.error("Error fetching booking:", error);
      toast.error("Failed to load booking details");
    } finally {
      setLoading(false);
    }
  };

  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeLoading, setDisputeLoading] = useState(false);

  const updateBookingStatus = async (newStatus: string) => {
    if (!booking) return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, "bookings", booking.id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      setBooking({ ...booking, status: newStatus as Booking["status"] });
      toast.success("Booking updated");
    } catch {
      toast.error("Failed to update booking");
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkInProgress = async () => {
    if (!booking) return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, "bookings", booking.id), {
        status: "in_progress",
        inProgressAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setBooking({ ...booking, status: "in_progress" });
      toast.success("Marked as in progress!");
    } catch {
      toast.error("Failed to update booking");
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkCompleted = async () => {
    if (!booking) return;
    if (!confirm("Are you sure the service has been completed satisfactorily?")) return;
    setActionLoading(true);
    try {
      const amount = booking.totalAmount || booking.amount || booking.price || 0;
      await releaseFunds(booking.id, booking.providerId, amount);
      toast.success("Payment released to provider!");
      router.push(`/review/${booking.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to release payment");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRaiseDispute = async () => {
    if (!booking || !user) return;
    if (!disputeReason.trim()) { toast.error("Please describe the issue"); return; }
    setDisputeLoading(true);
    try {
      const amount = booking.totalAmount || booking.amount || booking.price || 0;
      await createDispute(booking.id, booking.customerId, booking.providerId, disputeReason, amount);
      // Notify admin
      const { addDoc, collection: col } = await import("firebase/firestore");
      await addDoc(col(db, "notifications"), {
        userId: "admin",
        title: "New Dispute Raised",
        message: `Dispute raised for booking #${booking.id}. Reason: ${disputeReason}`,
        type: "dispute",
        read: false,
        createdAt: serverTimestamp(),
      });
      setShowDisputeModal(false);
      setBooking({ ...booking, status: "disputed", escrowStatus: "disputed" });
      toast.success("Dispute raised. Admin will review within 24 hours.");
    } catch {
      toast.error("Failed to raise dispute");
    } finally {
      setDisputeLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    await updateBookingStatus("cancelled");
  };

  const handleSendMessage = () => {
    const conversationId = booking ? `${booking.customerId}_${booking.providerId}` : "";
    router.push(`/chat/${conversationId}`);
  };

  const handleLeaveReview = () => router.push(`/review/${bookingId}`);

  // Auto-release check: if provider marked in_progress 72h+ ago and customer hasn't confirmed
  useEffect(() => {
    if (!booking || booking.status !== "in_progress" || !booking.inProgressAt || booking.fundsReleased) return;
    const inProgressDate = booking.inProgressAt?.toDate ? booking.inProgressAt.toDate() : new Date(booking.inProgressAt);
    const hoursSince = (Date.now() - inProgressDate.getTime()) / (1000 * 60 * 60);
    if (hoursSince >= 72) {
      const amount = booking.totalAmount || booking.amount || booking.price || 0;
      releaseFunds(booking.id, booking.providerId, amount).then(async () => {
        const { addDoc, collection: col } = await import("firebase/firestore");
        await addDoc(col(db, "notifications"), {
          userId: booking.customerId,
          title: "Booking Auto-Completed",
          message: "Your booking has been automatically completed. Funds have been released to the provider.",
          type: "payment",
          read: false,
          createdAt: serverTimestamp(),
        });
      }).catch(console.error);
    }
  }, [booking]);

  const isCustomer = user?.uid === booking?.customerId;
  const isProvider = user?.uid === booking?.providerId;
  const otherUser = isCustomer ? providerInfo : customerInfo;
  const bookingAmount = booking?.totalAmount || booking?.amount || booking?.price || 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Booking not found</p>
          <button
            onClick={() => router.push("/bookings")}
            className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            Back to Bookings
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="px-4 py-3">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg text-gray-900">Booking Details</h1>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6 max-w-2xl mx-auto">
        {/* Status Timeline */}
        <StatusTimeline currentStatus={booking.status} />

        {/* Booking Info Card */}
        {(() => {
          // Normalise date — could be a Firestore Timestamp, JS Date, or already a string
          const rawDate = booking.date;
          const dateObj = rawDate?.toDate
            ? rawDate.toDate()
            : rawDate instanceof Date
            ? rawDate
            : rawDate
            ? new Date(rawDate)
            : null;
          const dateStr = dateObj
            ? dateObj.toLocaleDateString("en-NG", { weekday: "short", year: "numeric", month: "short", day: "numeric" })
            : String(rawDate ?? "");
          const timeStr = booking.time
            ? (typeof booking.time === "object" && (booking.time as any)?.toDate
                ? (booking.time as any).toDate().toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })
                : String(booking.time))
            : (dateObj ? dateObj.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" }) : "");
          return (
            <BookingCard
              serviceName={booking.serviceName}
              category={booking.category}
              date={dateStr}
              time={timeStr}
              location={booking.location}
              amount={booking.amount}
              referenceNumber={booking.referenceNumber}
            />
          );
        })()}

        {/* Provider/Customer Info Card */}
        {otherUser && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              {isCustomer ? "Provider Information" : "Customer Information"}
            </h3>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center">
                {otherUser.photoURL ? (
                  <img
                    src={otherUser.photoURL}
                    alt={otherUser.fullName ?? otherUser.name ?? ""}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-white text-lg">
                    {(otherUser.fullName ?? otherUser.name ?? "?").charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <h4 className="text-gray-900">{otherUser.fullName ?? otherUser.name ?? "Unknown"}</h4>
                <div className="flex items-center space-x-2">
                  {otherUser.rating && (
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <svg
                          key={i}
                          className={`w-3 h-3 ${
                            i < Math.floor(otherUser.rating!)
                              ? "text-yellow-400"
                              : "text-gray-300"
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                      <span className="text-xs text-gray-600 ml-1">
                        {otherUser.rating.toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={handleSendMessage}
                className="px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors"
              >
                Send Message
              </button>
            </div>
          </div>
        )}

        {/* Escrow Status Banner */}
        {booking.escrowStatus === "holding" && (
          <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
            <ShieldCheck className="h-5 w-5 text-yellow-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-yellow-800">Funds Held in Escrow</p>
              <p className="text-xs text-yellow-700 mt-0.5">
                {isCustomer
                  ? "Payment is secured. Release funds once service is completed."
                  : "Payment received — deliver the service to get paid."}
              </p>
            </div>
          </div>
        )}

        {booking.escrowStatus === "released" && (
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl p-4">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
            <p className="text-sm font-semibold text-green-800">Funds Released to Provider ✓</p>
          </div>
        )}

        {booking.escrowStatus === "disputed" && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-800">Dispute Raised</p>
              <p className="text-xs text-red-700 mt-0.5">Admin is reviewing. Funds are held.</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">

          {/* Customer: cancel before payment */}
          {isCustomer && (booking.status === "pending" || booking.status === "pending_payment") && (
            <button onClick={handleCancelBooking} disabled={actionLoading}
              className="w-full py-3 px-4 bg-red-500 text-white font-semibold rounded-2xl hover:bg-red-600 transition-colors disabled:opacity-50">
              {actionLoading ? "Cancelling..." : "Cancel Booking"}
            </button>
          )}

          {/* Customer: pay for confirmed booking */}
          {isCustomer && booking.status === "confirmed" && (
            <PaystackButton
              amount={bookingAmount}
              email={customerInfo?.email || ""}
              bookingId={booking.id}
              providerId={booking.providerId}
              providerName={providerInfo?.fullName || ""}
              customerName={customerInfo?.fullName || ""}
              serviceName={booking.serviceName}
            />
          )}

          {/* Customer: pay for pending_payment booking */}
          {isCustomer && booking.status === "pending_payment" && (
            <button onClick={() => router.push(`/payment/checkout?bookingId=${booking.id}`)}
              className="w-full py-3 px-4 bg-[#FF8C00] text-white font-semibold rounded-2xl hover:bg-[#E67D00] transition-colors">
              Complete Payment
            </button>
          )}

          {/* Provider: start job after payment */}
          {isProvider && booking.status === "paid" && booking.escrowStatus === "holding" && (
            <button onClick={handleMarkInProgress} disabled={actionLoading}
              className="w-full py-3 px-4 bg-[#FF8C00] text-white font-semibold rounded-2xl hover:bg-[#E67D00] transition-colors disabled:opacity-50">
              {actionLoading ? "Updating..." : "Start Job — Mark In Progress"}
            </button>
          )}

          {/* Customer: in_progress — release or dispute */}
          {isCustomer && booking.status === "in_progress" && !booking.fundsReleased && (
            <>
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl p-3 mb-1">
                <Clock className="h-4 w-4 text-blue-500 flex-shrink-0" />
                <p className="text-xs text-blue-700">Service in progress. Confirm completion to release payment.</p>
              </div>
              <button onClick={handleMarkCompleted} disabled={actionLoading}
                className="w-full py-3 px-4 bg-green-500 text-white font-semibold rounded-2xl hover:bg-green-600 transition-colors disabled:opacity-50">
                {actionLoading ? "Processing..." : "✅ Mark as Completed — Release Payment"}
              </button>
              <button onClick={() => setShowDisputeModal(true)}
                className="w-full py-3 px-4 border-2 border-red-400 text-red-500 font-semibold rounded-2xl hover:bg-red-50 transition-colors">
                ⚠️ Raise a Dispute
              </button>
            </>
          )}

          {/* Provider: waiting for customer confirmation */}
          {isProvider && booking.status === "in_progress" && !booking.fundsReleased && (
            <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-2xl p-4">
              <Clock className="h-5 w-5 text-orange-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-orange-800">Awaiting Customer Confirmation</p>
                <p className="text-xs text-orange-700 mt-0.5">Funds auto-release 72h after you marked In Progress.</p>
              </div>
            </div>
          )}

          {/* Review after completion */}
          {isCustomer && booking.status === "completed" && (
            <button onClick={handleLeaveReview}
              className="w-full py-3 px-4 bg-[#FF8C00] text-white font-semibold rounded-2xl hover:bg-[#E67D00] transition-colors">
              Leave a Review
            </button>
          )}

          {/* Message button always visible */}
          <button onClick={handleSendMessage}
            className="w-full py-3 px-4 border-2 border-gray-200 text-gray-700 font-semibold rounded-2xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Send Message
          </button>
        </div>
      </div>

      {/* Dispute Modal */}
      {showDisputeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Raise a Dispute</h3>
            <p className="text-sm text-gray-500 mb-4">Describe the issue. Funds will be held until admin resolves it.</p>
            <textarea
              value={disputeReason}
              onChange={e => setDisputeReason(e.target.value)}
              rows={4}
              placeholder="What went wrong with this service?"
              className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-orange-400"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowDisputeModal(false)}
                className="flex-1 py-3 border-2 border-gray-200 text-gray-600 font-semibold rounded-2xl">
                Cancel
              </button>
              <button onClick={handleRaiseDispute} disabled={disputeLoading}
                className="flex-1 py-3 bg-red-500 text-white font-semibold rounded-2xl hover:bg-red-600 disabled:opacity-50">
                {disputeLoading ? "Submitting..." : "Submit Dispute"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

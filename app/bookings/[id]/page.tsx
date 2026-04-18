"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { doc, onSnapshot, getDoc, updateDoc, serverTimestamp, addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import StatusTimeline from "@/components/bookings/StatusTimeline";
import StatusBadge from "@/components/bookings/StatusBadge";
import BookingCard from "@/components/bookings/BookingCard";
import ReviewModal from "@/components/bookings/ReviewModal";
import { releaseFunds, createDispute } from "@/lib/escrow";
import { getCustomerStatusMessage } from "@/lib/booking-status";
import { MessageSquare, AlertTriangle, CheckCircle, Clock, ShieldCheck } from "lucide-react";
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
  status: "pending" | "accepted" | "rejected" | "pending_payment" | "confirmed" | "paid" | "in_progress" | "completed" | "disputed" | "refunded" | "cancelled";
  paymentStatus?: "not_initiated" | "pending" | "success" | "failed" | "refunded";
  escrowStatus?: "holding" | "released" | "refunded" | "disputed" | "none";
  fundsReleased?: boolean;
  inProgressAt?: any;
  expiresAt?: any;
  createdAt: any;
  updatedAt: any;
  providerName?: string;
  customerName?: string;
  providerPhoto?: string;
  customerPhoto?: string;
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
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [elapsed, setElapsed] = useState("");

  const bookingId = params.id as string;

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "bookings", bookingId), async (snap) => {
      if (!snap.exists()) {
        toast.error("Booking not found");
        router.push("/bookings");
        return;
      }
      const bookingData = { id: snap.id, ...snap.data() } as Booking;
      setBooking(bookingData);
      setLoading(false);

      // Fetch user info once on first load
      if (!customerInfo) {
        const customerDoc = await getDoc(doc(db, "users", bookingData.customerId));
        if (customerDoc.exists()) setCustomerInfo({ id: customerDoc.id, ...customerDoc.data() } as UserInfo);
      }
      if (!providerInfo) {
        const providerDoc = await getDoc(doc(db, "users", bookingData.providerId));
        if (providerDoc.exists()) setProviderInfo({ id: providerDoc.id, ...providerDoc.data() } as UserInfo);
      }
    }, (error) => {
      console.error("Error fetching booking:", error);
      toast.error("Failed to load booking details");
      setLoading(false);
    });
    return () => unsub();
  }, [bookingId]);

  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeCategory, setDisputeCategory] = useState("other");
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
    if (!disputeReason.trim() || disputeReason.length < 20) { toast.error("Please describe the issue (min 20 characters)"); return; }
    setDisputeLoading(true);
    try {
      const amount = booking.totalAmount || booking.amount || booking.price || 0;
      await createDispute(booking.id, booking.customerId, booking.providerId, disputeReason, amount);
      // Write to disputes collection
      await addDoc(collection(db, "disputes"), {
        bookingId: booking.id,
        raisedBy: "customer",
        customerId: booking.customerId,
        providerId: booking.providerId,
        category: disputeCategory,
        description: disputeReason.trim(),
        status: "open",
        createdAt: serverTimestamp(),
      });
      // Notify admin
      await addDoc(collection(db, "notifications"), {
        userId: "admin",
        title: "New Dispute Raised",
        message: `Customer raised a dispute for booking #${booking.id.slice(-8).toUpperCase()}. Category: ${disputeCategory}`,
        type: "dispute",
        bookingId: booking.id,
        read: false,
        createdAt: serverTimestamp(),
      });
      // Notify provider
      await addDoc(collection(db, "notifications"), {
        userId: booking.providerId,
        title: "Dispute Raised",
        message: "The customer has raised an issue with this booking. Admin will review within 24 hours.",
        type: "dispute",
        bookingId: booking.id,
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

  const handleLeaveReview = () => setShowReviewModal(true);

  // Live elapsed timer for in_progress (customer view)
  useEffect(() => {
    if (booking?.status !== "in_progress" || !booking?.inProgressAt) return;
    const tick = () => {
      const start = booking.inProgressAt?.toDate ? booking.inProgressAt.toDate() : new Date(booking.inProgressAt);
      const diff  = Math.floor((Date.now() - start.getTime()) / 1000);
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setElapsed(h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [booking?.status, booking?.inProgressAt]);

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

  // State-driven payment gate — persistent across page reloads and return visits.
  // "pending" paymentStatus means customer left mid-payment — still let them retry.
  const canPay = isCustomer &&
    booking?.status === "accepted" &&
    booking?.paymentStatus !== "success";

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
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
              className="p-2 rounded-lg active:bg-gray-100"
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
        {/* Status badge */}
        <div className="flex justify-center">
          <StatusBadge status={booking.status} viewerType={isCustomer ? "customer" : "provider"} size="md" />
        </div>
        {/* Status Timeline */}
        <StatusTimeline currentStatus={booking.status} viewerType={isCustomer ? "customer" : "provider"} />

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

        {/* ── STATE-DRIVEN ACTION PANEL ─────────────────────────────────────── */}
        {/* Derives UI entirely from booking.status + booking.paymentStatus */}
        {/* Works on first visit, after refresh, or returning days later */}
        <div className="space-y-3">

          {/* ── CUSTOMER STATES ── */}
          {isCustomer && (() => {
            const ps = booking.paymentStatus;

            // 1. Pending — waiting for provider response
            if (booking.status === "pending") return (
              <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-yellow-500 border-t-transparent flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-yellow-800">⏳ Waiting for Provider</p>
                  <p className="text-xs text-yellow-700 mt-0.5">{getCustomerStatusMessage("pending")}</p>
                </div>
              </div>
            );

            // 2. Rejected
            if (booking.status === "rejected") return (
              <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
                <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-800">❌ Declined</p>
                  <p className="text-xs text-red-700 mt-0.5">{getCustomerStatusMessage("rejected")}</p>
                </div>
              </div>
            );

            // 3. Accepted + payment failed — show warning banner + Pay Now
            // 4. Accepted + not yet paid (incl. abandoned "pending") — primary Pay Now CTA
            if (canPay) return (
              <>
                {ps === "failed" && (
                  <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
                    <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-red-800">Previous payment failed</p>
                      <p className="text-xs text-red-700 mt-0.5">Please try again to complete your booking.</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-2xl p-4">
                  <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-blue-800">🟡 Awaiting Payment</p>
                    <p className="text-xs text-blue-700 mt-0.5">{getCustomerStatusMessage("accepted")}</p>
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Service</span>
                    <span className="font-semibold text-gray-800">{booking.serviceName || booking.category}</span>
                  </div>
                  {(providerInfo?.fullName || providerInfo?.name) && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Provider</span>
                      <span className="font-semibold text-gray-800">{providerInfo.fullName || providerInfo.name}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm border-t border-gray-100 pt-2 mt-2">
                    <span className="text-gray-500 font-semibold">Amount</span>
                    <span className="font-black text-[#FF8C00] text-base">₦{bookingAmount.toLocaleString()}</span>
                  </div>
                </div>
                <button
                  onClick={() => router.push(`/payment/checkout?bookingId=${booking.id}`)}
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                  className="w-full py-4 px-4 bg-[#FF8C00] text-white font-black text-[16px] rounded-2xl active:opacity-80 shadow-md">
                  Pay Now — ₦{bookingAmount.toLocaleString()}
                </button>
                <button onClick={handleCancelBooking} disabled={actionLoading}
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                  className="w-full py-2 text-sm text-red-500 disabled:opacity-50">
                  {actionLoading ? "Cancelling..." : "Cancel Booking"}
                </button>
              </>
            );

            // 6. Paid — payment done, waiting for provider to start
            if (booking.status === "paid" || booking.status === "upcoming" || booking.status === "confirmed") return (
              <>
                {/* Status message */}
                <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl p-4">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-green-800">🟢 Payment Confirmed</p>
                    <p className="text-xs text-green-700 mt-0.5">{getCustomerStatusMessage("paid")}</p>
                  </div>
                </div>
                {/* Progress steps */}
                <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                  <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Booking Progress</p>
                  <div className="space-y-3">
                    {[
                      { label: "Booking Accepted",   done: true  },
                      { label: "Payment Confirmed",   done: true  },
                      { label: "Service In Progress", done: false },
                      { label: "Service Completed",   done: false },
                    ].map((step, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className={`h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 ${step.done ? "bg-green-500" : "bg-gray-100 border-2 border-dashed border-gray-300"}`}>
                          {step.done && <CheckCircle className="h-3.5 w-3.5 text-white" />}
                        </div>
                        <p className={`text-sm font-semibold ${step.done ? "text-gray-800" : "text-gray-400"}`}>{step.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-2xl p-4">
                  <Clock className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-blue-800">Waiting for provider to start</p>
                    <p className="text-xs text-blue-700 mt-0.5">You'll be notified when the service begins. Your payment is held securely in escrow.</p>
                  </div>
                </div>
              </>
            );

            // 7. In progress — customer confirms completion to release funds
            if (booking.status === "in_progress" && !booking.fundsReleased) return (
              <>
                {/* Progress steps */}
                <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                  <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Booking Progress</p>
                  <div className="space-y-3">
                    {[
                      { label: "Booking Accepted",   done: true  },
                      { label: "Payment Confirmed",   done: true  },
                      { label: "Service In Progress", done: true  },
                      { label: "Service Completed",   done: false },
                    ].map((step, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className={`h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 ${step.done ? "bg-green-500" : "bg-gray-100 border-2 border-dashed border-gray-300"}`}>
                          {step.done && <CheckCircle className="h-3.5 w-3.5 text-white" />}
                        </div>
                        <p className={`text-sm font-semibold ${step.done ? "text-gray-800" : "text-gray-400"}`}>{step.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
                  <p className="text-sm font-semibold text-orange-800">� In Progress</p>
                  {elapsed && (
                    <p className="text-xs text-orange-600 mt-1 font-bold">⏱ Running for {elapsed}</p>
                  )}
                  <p className="text-xs text-orange-700 mt-1">{getCustomerStatusMessage("in_progress")} — confirm below once done to release payment. Funds auto-release after 72 hours.</p>
                </div>
                <button onClick={handleMarkCompleted} disabled={actionLoading}
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                  className="w-full py-4 px-4 bg-green-500 text-white font-black text-[15px] rounded-2xl active:opacity-80 disabled:opacity-50 shadow-md shadow-green-200">
                  {actionLoading ? "Processing..." : "✅ Service Done — Release Payment to Provider"}
                </button>
                <button onClick={() => setShowDisputeModal(true)}
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                  className="w-full py-3 px-4 border-2 border-red-300 text-red-500 font-semibold rounded-2xl active:opacity-80 text-sm">
                  ⚠️ Something went wrong — Raise a Dispute
                </button>
              </>
            );

            // 7b. Funds already released (completed via auto-release or manual)
            if (booking.status === "in_progress" && booking.fundsReleased) return (
              <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl p-4">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-800">Payment released to provider</p>
                  <p className="text-xs text-green-700 mt-0.5">Service is marked complete.</p>
                </div>
              </div>
            );

            // 8. Completed
            if (booking.status === "completed") return (
              <>
                {/* All steps done */}
                <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                  <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Booking Progress</p>
                  <div className="space-y-3">
                    {["Booking Accepted", "Payment Confirmed", "Service In Progress", "Service Completed"].map((label, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                          <CheckCircle className="h-3.5 w-3.5 text-white" />
                        </div>
                        <p className="text-sm font-semibold text-gray-800">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl p-4">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-green-800">✅ Completed</p>
                    <p className="text-xs text-green-700 mt-0.5">{getCustomerStatusMessage("completed")} Payment has been released to the provider.</p>
                  </div>
                </div>
                <button onClick={handleLeaveReview}
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                  className="w-full py-4 px-4 bg-[#FF8C00] text-white font-black text-[15px] rounded-2xl active:opacity-80 shadow-md">
                  ⭐ Leave a Review
                </button>
              </>
            );

            // 9. Disputed
            if (booking.status === "disputed") return (
              <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
                <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-800">Dispute Under Review</p>
                  <p className="text-xs text-red-700 mt-0.5">Admin will review within 24 hours. Funds are held securely.</p>
                </div>
              </div>
            );

            // 10. Cancelled
            if (booking.status === "cancelled") return (
              <div className="flex items-center gap-3 bg-gray-100 border border-gray-200 rounded-2xl p-4">
                <AlertTriangle className="h-5 w-5 text-gray-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-gray-700">⚫ Cancelled</p>
                  <p className="text-xs text-gray-500 mt-0.5">{getCustomerStatusMessage("cancelled")}</p>
                </div>
              </div>
            );

            return null;
          })()}

          {/* Cancel button — only while waiting for provider (no payment made) */}
          {isCustomer && booking.status === "pending" && (
            <button onClick={handleCancelBooking} disabled={actionLoading}
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
              className="w-full py-3 px-4 bg-red-500 text-white font-semibold rounded-2xl active:opacity-80 disabled:opacity-50">
              {actionLoading ? "Cancelling..." : "Cancel Booking"}
            </button>
          )}

          {/* ── PROVIDER STATES ── */}
          {isProvider && (() => {
            // Provider: payment received, ready to start
            if (booking.status === "paid") return (
              <button onClick={handleMarkInProgress} disabled={actionLoading}
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                className="w-full py-3 px-4 bg-[#FF8C00] text-white font-semibold rounded-2xl active:opacity-80 disabled:opacity-50">
                {actionLoading ? "Updating..." : "Start Job — Mark In Progress"}
              </button>
            );

            // Provider: job in progress — awaiting customer confirmation
            if (booking.status === "in_progress" && !booking.fundsReleased) return (
              <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-2xl p-4">
                <Clock className="h-5 w-5 text-orange-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-orange-800">Awaiting Customer Confirmation</p>
                  <p className="text-xs text-orange-700 mt-0.5">Funds auto-release 72h after you marked In Progress.</p>
                </div>
              </div>
            );

            return null;
          })()}

          {/* Message button — always visible for active bookings */}
          {!["cancelled", "rejected"].includes(booking.status) && (
            <button onClick={handleSendMessage}
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
              className="w-full py-3 px-4 border-2 border-gray-200 text-gray-700 font-semibold rounded-2xl active:bg-gray-50 flex items-center justify-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Send Message
            </button>
          )}
        </div>
      </div>

      {/* Dispute Modal */}
      {showDisputeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Report an Issue</h3>
            <p className="text-sm text-gray-500 mb-4">Describe the problem. Funds will be held until admin resolves it.</p>
            <select
              value={disputeCategory}
              onChange={e => setDisputeCategory(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm mb-3 focus:outline-none focus:border-orange-400 bg-white"
            >
              <option value="no_show">Provider didn't show up</option>
              <option value="poor_quality">Poor quality of work</option>
              <option value="incomplete">Service incomplete</option>
              <option value="unprofessional">Provider was rude/unprofessional</option>
              <option value="other">Other</option>
            </select>
            <textarea
              value={disputeReason}
              onChange={e => setDisputeReason(e.target.value)}
              rows={4}
              placeholder="Describe the issue in detail (min 20 characters)..."
              className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-orange-400"
            />
            <p className="text-[10px] font-bold text-gray-400 mt-1 text-right">{disputeReason.length}/1000</p>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowDisputeModal(false)}
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                className="flex-1 py-3 border-2 border-gray-200 text-gray-600 font-semibold rounded-2xl active:opacity-70">
                Cancel
              </button>
              <button onClick={handleRaiseDispute} disabled={disputeLoading}
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                className="flex-1 py-3 bg-red-500 text-white font-semibold rounded-2xl active:opacity-80 disabled:opacity-50">
                {disputeLoading ? "Submitting..." : "Submit Dispute"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && booking && (
        <ReviewModal
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          booking={{
            id: booking.id,
            providerId: booking.providerId,
            providerName: providerInfo?.fullName || providerInfo?.name || booking.providerName || "Provider",
            customerId: booking.customerId,
            customerName: customerInfo?.fullName || customerInfo?.name || booking.customerName || "Customer",
            customerPhoto: customerInfo?.photoURL,
          }}
          onSuccess={() => {
            setShowReviewModal(false);
            toast.success("Review submitted! Thank you.");
          }}
        />
      )}
    </main>
  );
}

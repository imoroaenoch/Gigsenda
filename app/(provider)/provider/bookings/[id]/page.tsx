"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft, Clock, Calendar, User as UserIcon, MessageSquare,
  CheckCircle2, XCircle, Loader2, Banknote, ShieldCheck,
  Phone, MapPin, Star, Package, ClipboardList,
} from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import AuthGuard from "@/components/auth/AuthGuard";
import ProviderBottomNav from "@/components/provider/ProviderBottomNav";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, updateDoc, serverTimestamp, addDoc, collection } from "firebase/firestore";
import { createConversation } from "@/lib/chat";
import { notifyBookingAccepted, notifyBookingDeclined } from "@/lib/notifications";
import { format, formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";

const STATUS_CONFIG: Record<string, { label: string; message: string; bg: string; text: string; icon: any }> = {
  pending:     { label: "🟠 New Request",       message: "New booking request",                    bg: "bg-yellow-50",  text: "text-yellow-700", icon: Clock },
  accepted:    { label: "🟡 Awaiting Payment",  message: "Waiting for customer payment",           bg: "bg-blue-50",    text: "text-blue-700",   icon: Clock },
  paid:        { label: "🟢 Ready to Start",    message: "Payment received. Ready to start",       bg: "bg-green-50",   text: "text-green-700",  icon: Banknote },
  in_progress: { label: "🔵 In Progress",       message: "You are currently working on this job",  bg: "bg-orange-50",  text: "text-orange-700", icon: Loader2 },
  completed:   { label: "✅ Completed",          message: "Job completed",                          bg: "bg-green-50",   text: "text-green-700",  icon: CheckCircle2 },
  rejected:    { label: "❌ Declined",           message: "You declined this request",              bg: "bg-red-50",     text: "text-red-600",    icon: XCircle },
  cancelled:   { label: "⚫ Cancelled",          message: "Booking cancelled",                      bg: "bg-gray-100",   text: "text-gray-600",   icon: XCircle },
  disputed:    { label: "⚠️ Under Review",      message: "A dispute has been raised. Admin is reviewing", bg: "bg-purple-50", text: "text-purple-700", icon: ShieldCheck },
  // legacy aliases
  upcoming:    { label: "🟢 Ready to Start",    message: "Payment received. Ready to start",       bg: "bg-green-50",   text: "text-green-700",  icon: Banknote },
  confirmed:   { label: "🟢 Ready to Start",    message: "Payment received. Ready to start",       bg: "bg-green-50",   text: "text-green-700",  icon: Banknote },
};

export default function BookingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, profile } = useAuth();
  const bookingId = params.id as string;

  const [booking, setBooking]         = useState<any>(null);
  const [loading, setLoading]         = useState(true);
  const [actionId, setActionId]       = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [showDispute, setShowDispute] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeLoading, setDisputeLoading] = useState(false);
  const [elapsed, setElapsed]         = useState("");

  useEffect(() => {
    if (!bookingId) return;
    const unsub = onSnapshot(doc(db, "bookings", bookingId), (snap) => {
      if (snap.exists()) setBooking({ id: snap.id, ...snap.data() });
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [bookingId]);

  // Live elapsed timer for in_progress
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

  const handleAccept = async () => {
    if (!booking) return;
    setActionId("accept");
    try {
      await updateDoc(doc(db, "bookings", booking.id), { status: "accepted", updatedAt: serverTimestamp() });
      notifyBookingAccepted(booking.customerId, profile?.name || "Your provider", booking.id);
      setBooking((prev: any) => ({ ...prev, status: "accepted" }));
      toast.success("Booking accepted!");
    } catch {
      toast.error("Failed to accept booking");
    } finally {
      setActionId(null);
    }
  };

  const handleDecline = async () => {
    if (!booking) return;
    setActionId("decline");
    try {
      await updateDoc(doc(db, "bookings", booking.id), { status: "rejected", updatedAt: serverTimestamp() });
      notifyBookingDeclined(booking.customerId, profile?.name || "Your provider", booking.id);
      setBooking((prev: any) => ({ ...prev, status: "rejected" }));
      toast.success("Booking declined");
    } catch {
      toast.error("Failed to decline booking");
    } finally {
      setActionId(null);
    }
  };

  const handleMarkInProgress = async () => {
    if (!booking) return;
    setActionId("progress");
    try {
      await updateDoc(doc(db, "bookings", booking.id), {
        status: "in_progress",
        escrowStatus: "holding",
        inProgressAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setBooking((prev: any) => ({ ...prev, status: "in_progress", escrowStatus: "holding" }));
      toast.success("Marked as In Progress");
    } catch {
      toast.error("Failed to update status");
    } finally {
      setActionId(null);
    }
  };

  const handleMarkCompleted = async () => {
    if (!booking) return;
    if (!confirm("Signal to customer that the job is done? They will be asked to confirm and release payment.")) return;
    setActionId("complete");
    try {
      await updateDoc(doc(db, "bookings", booking.id), {
        status: "completed",
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await addDoc(collection(db, "notifications"), {
        userId: booking.customerId,
        title: "Service Completed!",
        message: `Your provider has marked the job as done. Please confirm to release payment.`,
        type: "booking",
        bookingId: booking.id,
        read: false,
        createdAt: serverTimestamp(),
      });
      toast.success("Job marked as completed! Waiting for customer to confirm.");
    } catch {
      toast.error("Failed to update status");
    } finally {
      setActionId(null);
    }
  };

  const handleRaiseDispute = async () => {
    if (!disputeReason.trim() || disputeReason.length < 20) {
      toast.error("Please describe the issue (min 20 characters)");
      return;
    }
    setDisputeLoading(true);
    try {
      await addDoc(collection(db, "disputes"), {
        bookingId: booking.id,
        raisedBy: "provider",
        customerId: booking.customerId,
        providerId: user?.uid,
        category: "other",
        description: disputeReason.trim(),
        status: "open",
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "bookings", booking.id), { status: "disputed", updatedAt: serverTimestamp() });
      await addDoc(collection(db, "notifications"), {
        userId: "admin",
        title: "New Dispute (Provider)",
        message: `Provider raised a dispute for booking #${booking.id.slice(-8).toUpperCase()}`,
        type: "dispute",
        bookingId: booking.id,
        read: false,
        createdAt: serverTimestamp(),
      });
      await addDoc(collection(db, "notifications"), {
        userId: booking.customerId,
        title: "Dispute Raised",
        message: "Your provider has raised an issue with this booking. Admin will review within 24 hours.",
        type: "dispute",
        bookingId: booking.id,
        read: false,
        createdAt: serverTimestamp(),
      });
      setShowDispute(false);
      toast.success("Dispute submitted. Admin will review within 24 hours.");
    } catch {
      toast.error("Failed to submit dispute");
    } finally {
      setDisputeLoading(false);
    }
  };

  const handleOpenChat = async () => {
    if (!booking || !user) return;
    if (booking.conversationId) {
      router.push(`/chat/${booking.conversationId}`);
      return;
    }
    setChatLoading(true);
    try {
      const convId = await createConversation(booking.customerId, user.uid, booking.id);
      await updateDoc(doc(db, "bookings", booking.id), { conversationId: convId });
      router.push(`/chat/${convId}`);
    } catch {
      toast.error("Could not open chat");
    } finally {
      setChatLoading(false);
    }
  };

  const fmtDate = (ts: any) => {
    if (!ts) return "—";
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return format(d, "EEEE, MMMM d, yyyy");
  };

  const fmtTime = (ts: any) => {
    if (!ts) return "";
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return format(d, "h:mm a");
  };

  const fmtRelative = (ts: any) => {
    if (!ts) return "";
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return formatDistanceToNow(d, { addSuffix: true });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FFF8F0]">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#FFF8F0] px-5 text-center">
        <ClipboardList className="h-12 w-12 text-gray-300 mb-4" />
        <p className="text-[16px] font-black text-text">Booking not found</p>
        <p className="text-[12px] font-bold text-text-light mt-1">This booking may have been removed</p>
        <button onClick={() => router.back()} className="mt-6 rounded-xl bg-primary px-6 py-3 text-[13px] font-black text-white">
          Go Back
        </button>
      </div>
    );
  }

  const status = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
  const StatusIcon = status.icon;
  const net = Math.round((booking.totalAmount || booking.price || 0) * 0.9);
  const commission = Math.round((booking.totalAmount || booking.price || 0) * 0.1);

  return (
    <AuthGuard>
      <main className="min-h-screen bg-[#FFF8F0] pb-28 lg:pb-12 overflow-x-hidden">

        {/* Header */}
        <header className="bg-white border-b border-gray-100 px-5 lg:px-8 pt-12 pb-4 lg:pt-7 lg:pb-5 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }} className="rounded-xl p-2 active:bg-gray-100">
              <ArrowLeft className="h-5 w-5 text-text" />
            </button>
            <div>
              <h1 className="text-[17px] lg:text-[20px] font-black text-text">Booking Details</h1>
              <p className="text-[10px] font-bold text-text-light">#{booking.id.slice(-8).toUpperCase()}</p>
            </div>
            <div className="ml-auto">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-black ${status.bg} ${status.text}`}>
                {status.label}
              </span>
            </div>
          </div>
        </header>

        {/* Status message banner */}
        <div className={`px-5 lg:px-8 py-3 flex items-center gap-2 border-b ${status.bg} ${status.text}`}>
          <StatusIcon className="h-4 w-4 flex-shrink-0" />
          <p className="text-[12px] font-black">{status.message}</p>
        </div>

        {/* Two-column on desktop */}
        <div className="px-5 lg:px-8 py-5 lg:py-7 lg:grid lg:grid-cols-2 lg:gap-8 lg:items-start">

          {/* LEFT column */}
          <div className="space-y-4">

            {/* Customer card */}
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
              <p className="text-[10px] font-black uppercase tracking-wider text-text-light mb-3">Customer</p>
              <div className="flex items-center gap-3">
                <div className="relative h-14 w-14 rounded-full overflow-hidden bg-primary/10 flex-shrink-0 border border-gray-100">
                  {booking.customerPhoto
                    ? <Image src={booking.customerPhoto} alt={booking.customerName || ""} fill className="object-cover" />
                    : <div className="h-full w-full flex items-center justify-center">
                        <span className="text-[18px] font-black text-primary">
                          {(booking.customerName || "?").charAt(0).toUpperCase()}
                        </span>
                      </div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[16px] font-black text-text">{booking.customerName || "Customer"}</p>
                  {booking.customerPhone && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Phone className="h-3 w-3 text-text-light" />
                      <p className="text-[12px] font-bold text-text-light">{booking.customerPhone}</p>
                    </div>
                  )}
                  {booking.customerLocation && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 text-text-light" />
                      <p className="text-[12px] font-bold text-text-light">{booking.customerLocation}</p>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleOpenChat}
                  disabled={chatLoading}
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                  className="flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-2 text-[12px] font-black text-primary active:opacity-80 disabled:opacity-60"
                >
                  {chatLoading
                    ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    : <MessageSquare className="h-4 w-4" />}
                  Chat
                </button>
              </div>
            </div>

            {/* Service & schedule */}
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-text-light">Service & Schedule</p>

              {(booking.servicePackage || booking.serviceTitle || booking.category) && (
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Package className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-[13px] font-black text-text">{booking.servicePackage || booking.serviceTitle}</p>
                    {booking.category && <p className="text-[11px] font-bold text-text-light">{booking.category}</p>}
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-[13px] font-black text-text">{fmtDate(booking.date)}</p>
                  {booking.timeSlot && (
                    <p className="text-[11px] font-bold text-text-light">{booking.timeSlot}</p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                  <Clock className="h-4 w-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-text-light">Booked {fmtRelative(booking.createdAt)}</p>
                  {booking.createdAt && (
                    <p className="text-[11px] font-bold text-gray-400">{fmtDate(booking.createdAt)} at {fmtTime(booking.createdAt)}</p>
                  )}
                </div>
              </div>

              {booking.notes && (
                <div className="mt-2 rounded-xl bg-gray-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-wider text-text-light mb-1">Customer Notes</p>
                  <p className="text-[12px] font-bold text-text leading-relaxed">{booking.notes}</p>
                </div>
              )}
            </div>

            {/* Rating if completed */}
            {booking.rating && (
              <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
                <p className="text-[10px] font-black uppercase tracking-wider text-text-light mb-3">Customer Review</p>
                <div className="flex items-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} className={`h-5 w-5 ${s <= booking.rating ? "fill-primary text-primary" : "text-gray-200"}`} />
                  ))}
                  <span className="ml-2 text-[13px] font-black text-text">{booking.rating}/5</span>
                </div>
                {booking.review && (
                  <p className="text-[12px] font-bold text-text-light leading-relaxed">"{booking.review}"</p>
                )}
              </div>
            )}
          </div>

          {/* RIGHT column */}
          <div className="space-y-4 mt-4 lg:mt-0">

            {/* Payment breakdown */}
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
              <p className="text-[10px] font-black uppercase tracking-wider text-text-light mb-3">Payment</p>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold text-text-light">Service Total</span>
                  <span className="text-[14px] font-black text-text">₦{(booking.totalAmount || booking.price || 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold text-text-light">Platform Fee (10%)</span>
                  <span className="text-[13px] font-bold text-red-400">−₦{commission.toLocaleString()}</span>
                </div>
                <div className="border-t border-gray-100 pt-2.5 flex items-center justify-between">
                  <span className="text-[13px] font-black text-text">Your Earnings</span>
                  <span className="text-[18px] font-black text-green-600">₦{net.toLocaleString()}</span>
                </div>
              </div>
              {(booking.status === "paid" || booking.status === "in_progress") && booking.escrowStatus === "holding" && (
                <div className="mt-3 flex items-start gap-2 rounded-xl bg-orange-50 border border-orange-100 p-3">
                  <ShieldCheck className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] font-bold text-orange-700 leading-tight">
                    Payment is in escrow. Funds release 72h after marking In Progress, or when customer confirms.
                  </p>
                </div>
              )}
            </div>

            {/* Action buttons */}
            {booking.status === "pending" && (
              <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-wider text-text-light mb-1">Actions</p>
                <button
                  onClick={handleAccept}
                  disabled={!!actionId}
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                  className="w-full rounded-xl bg-green-500 py-3.5 text-[13px] font-black text-white active:opacity-80 disabled:opacity-60"
                >
                  {actionId === "accept" ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "✓ Accept Booking"}
                </button>
                <button
                  onClick={handleDecline}
                  disabled={!!actionId}
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                  className="w-full rounded-xl bg-red-50 border border-red-200 py-3.5 text-[13px] font-black text-red-500 active:opacity-80 disabled:opacity-60"
                >
                  {actionId === "decline" ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "✕ Decline Booking"}
                </button>
              </div>
            )}

            {booking.status === "accepted" && (
              <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
                <p className="text-[10px] font-black uppercase tracking-wider text-text-light mb-3">Status</p>
                <div className="flex items-center gap-2 rounded-xl bg-yellow-50 border border-yellow-100 p-3">
                  <Clock className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                  <p className="text-[12px] font-bold text-yellow-700">Waiting for customer payment</p>
                </div>
              </div>
            )}

            {booking.status === "paid" && (
              <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
                <p className="text-[10px] font-black uppercase tracking-wider text-text-light mb-3">Actions</p>
                <button
                  onClick={handleMarkInProgress}
                  disabled={!!actionId}
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                  className="w-full rounded-xl bg-primary py-3.5 text-[13px] font-black text-white active:opacity-80 disabled:opacity-60"
                >
                  {actionId === "progress"
                    ? <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                    : "Start Job"}
                </button>
              </div>
            )}

            {booking.status === "in_progress" && (
              <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-wider text-text-light mb-1">Actions</p>
                {/* Live timer */}
                {elapsed && (
                  <div className="flex items-center gap-2 rounded-xl bg-blue-50 border border-blue-100 p-3">
                    <Clock className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    <p className="text-[12px] font-black text-blue-700">In progress for {elapsed}</p>
                  </div>
                )}
                <button
                  onClick={handleMarkCompleted}
                  disabled={!!actionId}
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                  className="w-full rounded-xl bg-green-500 py-3.5 text-[13px] font-black text-white active:opacity-80 disabled:opacity-60"
                >
                  {actionId === "complete"
                    ? <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                    : "✅ Mark as Completed"}
                </button>
                <button
                  onClick={() => setShowDispute(true)}
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                  className="w-full rounded-xl border-2 border-red-200 bg-red-50 py-3 text-[12px] font-black text-red-500 active:opacity-80"
                >
                  ⚠️ Report an Issue
                </button>
              </div>
            )}

            {booking.status === "completed" && (
              <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-wider text-text-light mb-1">Settlement</p>
                <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-center">
                  <p className="text-[11px] font-bold text-green-700">Your earnings</p>
                  <p className="text-[28px] font-black text-green-600 mt-1">₦{net.toLocaleString()}</p>
                  <p className="text-[10px] font-bold text-green-600 mt-0.5">after 10% platform fee</p>
                </div>
                <div className="flex items-start gap-2 rounded-xl bg-orange-50 border border-orange-100 p-3">
                  <ShieldCheck className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] font-bold text-orange-700 leading-snug">
                    Funds will settle to your bank within 24 hours of completion.
                  </p>
                </div>
                <button
                  onClick={() => router.push("/provider/earnings")}
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                  className="w-full rounded-xl bg-primary/10 border border-primary/20 py-3 text-[12px] font-black text-primary active:opacity-80"
                >
                  View Earnings
                </button>
              </div>
            )}

            {/* Booking metadata */}
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-text-light mb-1">Booking Info</p>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-text-light">Booking ID</span>
                <span className="text-[11px] font-black text-text font-mono">#{booking.id.slice(-8).toUpperCase()}</span>
              </div>
              {booking.conversationId && (
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-text-light">Chat</span>
                  <button
                    onClick={handleOpenChat}
                    style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                    className="text-[11px] font-black text-primary active:opacity-70"
                  >
                    Open conversation
                  </button>
                </div>
              )}
              {booking.updatedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-text-light">Last updated</span>
                  <span className="text-[11px] font-bold text-text">{fmtRelative(booking.updatedAt)}</span>
                </div>
              )}
            </div>

          </div>
        </div>

        <ProviderBottomNav />

        {/* Dispute Modal */}
        {showDispute && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-lg p-6">
              <h3 className="text-[16px] font-black text-text mb-1">Report an Issue</h3>
              <p className="text-[12px] font-bold text-text-light mb-4">Describe the problem. Funds will be held until admin resolves it.</p>
              <textarea
                value={disputeReason}
                onChange={e => setDisputeReason(e.target.value)}
                rows={4}
                placeholder="Describe the issue in detail (min 20 characters)..."
                className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-orange-400"
              />
              <p className="text-[10px] font-bold text-text-light mt-1 text-right">{disputeReason.length}/1000</p>
              <div className="flex gap-3 mt-4">
                <button onClick={() => setShowDispute(false)}
                  className="flex-1 py-3 border-2 border-gray-200 text-gray-600 font-semibold rounded-2xl">
                  Cancel
                </button>
                <button onClick={handleRaiseDispute} disabled={disputeLoading}
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                  className="flex-1 py-3 bg-red-500 text-white font-black rounded-2xl active:opacity-80 disabled:opacity-50">
                  {disputeLoading ? "Submitting..." : "Submit Dispute"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </AuthGuard>
  );
}

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
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { createConversation } from "@/lib/chat";
import { notifyBookingAccepted, notifyBookingDeclined } from "@/lib/notifications";
import { format, formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: any }> = {
  pending:    { label: "Pending",    bg: "bg-yellow-50",  text: "text-yellow-600", icon: Clock },
  upcoming:   { label: "Confirmed", bg: "bg-blue-50",    text: "text-blue-600",   icon: CheckCircle2 },
  completed:  { label: "Completed", bg: "bg-green-50",   text: "text-green-600",  icon: CheckCircle2 },
  cancelled:  { label: "Cancelled", bg: "bg-red-50",     text: "text-red-500",    icon: XCircle },
  paid:       { label: "Paid",       bg: "bg-purple-50",  text: "text-purple-600", icon: Banknote },
  in_progress:{ label: "In Progress",bg: "bg-blue-50",   text: "text-blue-700",   icon: Loader2 },
};

export default function BookingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, profile } = useAuth();
  const bookingId = params.id as string;

  const [booking, setBooking]       = useState<any>(null);
  const [loading, setLoading]       = useState(true);
  const [actionId, setActionId]     = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    if (!bookingId) return;
    getDoc(doc(db, "bookings", bookingId)).then((snap) => {
      if (snap.exists()) {
        setBooking({ id: snap.id, ...snap.data() });
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [bookingId]);

  const handleAccept = async () => {
    if (!booking) return;
    setActionId("accept");
    try {
      await updateDoc(doc(db, "bookings", booking.id), { status: "upcoming", updatedAt: serverTimestamp() });
      notifyBookingAccepted(booking.customerId, profile?.name || "Your provider", booking.id);
      setBooking((prev: any) => ({ ...prev, status: "upcoming" }));
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
      await updateDoc(doc(db, "bookings", booking.id), { status: "cancelled", updatedAt: serverTimestamp() });
      notifyBookingDeclined(booking.customerId, profile?.name || "Your provider", booking.id);
      setBooking((prev: any) => ({ ...prev, status: "cancelled" }));
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
            <button onClick={() => router.back()} className="rounded-xl p-2 hover:bg-gray-100 transition-colors">
              <ArrowLeft className="h-5 w-5 text-text" />
            </button>
            <div>
              <h1 className="text-[17px] lg:text-[20px] font-black text-text">Booking Details</h1>
              <p className="text-[10px] font-bold text-text-light">#{booking.id.slice(-8).toUpperCase()}</p>
            </div>
            <div className="ml-auto">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black ${status.bg} ${status.text}`}>
                <StatusIcon className="h-3.5 w-3.5" />
                {status.label}
              </span>
            </div>
          </div>
        </header>

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
                  className="flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-2 text-[12px] font-black text-primary active:scale-95 transition-all hover:bg-primary/20 disabled:opacity-60"
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
                  className="w-full rounded-xl bg-green-500 hover:bg-green-600 py-3.5 text-[13px] font-black text-white active:scale-95 transition-all disabled:opacity-60"
                >
                  {actionId === "accept" ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "✓ Accept Booking"}
                </button>
                <button
                  onClick={handleDecline}
                  disabled={!!actionId}
                  className="w-full rounded-xl bg-red-50 border border-red-200 hover:bg-red-100 py-3.5 text-[13px] font-black text-red-500 active:scale-95 transition-all disabled:opacity-60"
                >
                  {actionId === "decline" ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "✕ Decline Booking"}
                </button>
              </div>
            )}

            {booking.status === "upcoming" && (
              <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
                <p className="text-[10px] font-black uppercase tracking-wider text-text-light mb-3">Actions</p>
                <button
                  onClick={handleMarkInProgress}
                  disabled={!!actionId}
                  className="w-full rounded-xl bg-primary hover:bg-primary/90 py-3.5 text-[13px] font-black text-white active:scale-95 transition-all disabled:opacity-60"
                >
                  {actionId === "progress"
                    ? <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                    : "Mark as In Progress"}
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
                    className="text-[11px] font-black text-primary hover:underline"
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
      </main>
    </AuthGuard>
  );
}

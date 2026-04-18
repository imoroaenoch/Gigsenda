"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Calendar, Clock, MapPin, MessageSquare,
  ChevronRight, Star, Home as HomeIcon,
  MessageSquare as MessageIcon, User as UserIcon, Briefcase,
  AlertCircle, CheckCircle2, Loader2, XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import ReviewModal from "@/components/bookings/ReviewModal";
import AuthGuard from "@/components/auth/AuthGuard";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { createConversation } from "@/lib/chat";
import toast from "react-hot-toast";

type TabType = "awaiting" | "pay_now" | "confirmed" | "in_progress" | "completed" | "cancelled";

// Normalise legacy statuses so old bookings still appear correctly
function normaliseStatus(raw: string): string {
  if (!raw) return "pending";
  const map: Record<string, string> = {
    upcoming:        "paid",       // old "upcoming" = confirmed + paid
    confirmed:       "paid",
    pending_payment: "accepted",   // old "pending_payment" = accepted, awaiting payment
  };
  return map[raw] ?? raw;
}

// Which tab a booking belongs to
function tabForStatus(status: string): TabType {
  const s = normaliseStatus(status);
  if (s === "pending")     return "awaiting";
  if (s === "accepted")    return "pay_now";
  if (s === "paid")        return "confirmed";
  if (s === "in_progress") return "in_progress";
  if (s === "completed")   return "completed";
  return "cancelled"; // cancelled, rejected, disputed, refunded
}

// Human-readable status labels for the card badge — from central source of truth
function statusLabel(raw: string): string {
  const s = normaliseStatus(raw);
  const labels: Record<string, string> = {
    pending:     "⏳ Waiting for Provider",
    accepted:    "🟡 Awaiting Payment",
    paid:        "🟢 Payment Confirmed",
    in_progress: "🔵 In Progress",
    completed:   "✅ Completed",
    cancelled:   "⚫ Cancelled",
    disputed:    "⚠️ Under Review",
    refunded:    "↩️ Refunded",
    rejected:    "❌ Declined",
  };
  return labels[s] ?? s;
}

// Badge colour per status — muted, mature palette
function statusBadgeClass(raw: string): string {
  const s = normaliseStatus(raw);
  if (s === "pending")     return "bg-gray-100 text-gray-500";
  if (s === "accepted")    return "bg-amber-50 text-amber-700";
  if (s === "paid")        return "bg-blue-50 text-blue-600";
  if (s === "in_progress") return "bg-indigo-50 text-indigo-600";
  if (s === "completed")   return "bg-emerald-50 text-emerald-700";
  if (s === "disputed")    return "bg-red-50 text-red-600";
  if (s === "rejected")    return "bg-gray-100 text-gray-500";
  return "bg-gray-100 text-gray-500";
}

// Single CTA shown on the card footer
function CardCTA({ booking, onCancel, onPay, onManage, onReview, actionLoading }: any) {
  const s = normaliseStatus(booking.status);

  if (s === "accepted" && booking.paymentStatus !== "success") {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); onPay(); }}
        style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
        className="rounded-xl bg-gray-900 px-4 py-2 text-[11px] font-bold text-white active:opacity-80"
      >
        Pay Now
      </button>
    );
  }
  if (s === "paid") {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); onManage(); }}
        style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
        className="rounded-xl bg-gray-900 px-4 py-2 text-[11px] font-bold text-white active:opacity-80"
      >
        Track
      </button>
    );
  }
  if (s === "in_progress") {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); onManage(); }}
        style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
        className="rounded-xl bg-gray-900 px-4 py-2 text-[11px] font-bold text-white active:opacity-80"
      >
        Manage
      </button>
    );
  }
  if (s === "completed" && !booking.isReviewed) {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); onReview(); }}
        style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
        className="flex items-center gap-1.5 rounded-xl bg-gray-100 px-4 py-2 text-[11px] font-bold text-gray-700 active:opacity-80"
      >
        <Star className="h-3 w-3" />
        Review
      </button>
    );
  }
  if (s === "pending") {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); onCancel(); }}
        disabled={actionLoading}
        style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
        className="rounded-xl bg-gray-100 px-4 py-2 text-[11px] font-bold text-gray-500 active:opacity-80 disabled:opacity-60"
      >
        {actionLoading ? "..." : "Cancel"}
      </button>
    );
  }
  return null;
}

export default function BookingsPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab]         = useState<TabType>("awaiting");
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [bookings, setBookings]           = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [chatLoading, setChatLoading]     = useState<string | null>(null);

  const isProvider = profile?.accountType === "provider";

  // ── Fetch bookings ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.uid || !profile) return;
    const roleField = isProvider ? "providerId" : "customerId";
    const q = query(collection(db, "bookings"), where(roleField, "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => {
        const raw = d.data();
        return {
          ...raw,
          id: d.id,
          // Normalise date
          date: raw.date?.toDate ? raw.date.toDate() : (raw.date ? new Date(raw.date) : new Date()),
          // Canonical amount — try every field name
          amount: raw.totalAmount ?? raw.amount ?? raw.price ?? 0,
        };
      }).sort((a, b) => b.date.getTime() - a.date.getTime());
      setBookings(data);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [user?.uid, profile]);

  // ── Tab helpers ──────────────────────────────────────────────────────────
  const tabs: { key: TabType; label: string; hint: string }[] = [
    { key: "awaiting",    label: "Awaiting",   hint: "Waiting for provider" },
    { key: "pay_now",     label: "Pay Now",    hint: "Payment required" },
    { key: "confirmed",   label: "Confirmed",  hint: "Waiting to start" },
    { key: "in_progress", label: "In Progress", hint: "Service ongoing" },
    { key: "completed",   label: "Completed",  hint: "Done" },
    { key: "cancelled",   label: "Cancelled",  hint: "Closed" },
  ];

  const filtered = bookings.filter(b => tabForStatus(b.status) === activeTab);

  const counts: Record<TabType, number> = {
    awaiting:    bookings.filter(b => tabForStatus(b.status) === "awaiting").length,
    pay_now:     bookings.filter(b => tabForStatus(b.status) === "pay_now").length,
    confirmed:   bookings.filter(b => tabForStatus(b.status) === "confirmed").length,
    in_progress: bookings.filter(b => tabForStatus(b.status) === "in_progress").length,
    completed:   bookings.filter(b => tabForStatus(b.status) === "completed").length,
    cancelled:   bookings.filter(b => tabForStatus(b.status) === "cancelled").length,
  };

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleOpenChat = async (booking: any) => {
    if (booking.conversationId) { router.push(`/chat/${booking.conversationId}`); return; }
    if (!booking.customerId || !booking.providerId) { toast.error("Booking data incomplete"); return; }
    setChatLoading(booking.id);
    try {
      const convId = await createConversation(booking.customerId, booking.providerId, booking.id);
      await updateDoc(doc(db, "bookings", booking.id), { conversationId: convId });
      router.push(`/chat/${convId}`);
    } catch { toast.error("Could not open chat"); }
    finally { setChatLoading(null); }
  };

  const handleCancel = async (bookingId: string) => {
    if (!confirm("Cancel this booking?")) return;
    setActionLoading(bookingId);
    try {
      await updateDoc(doc(db, "bookings", bookingId), { status: "cancelled" });
      toast.success("Booking cancelled");
    } catch { toast.error("Failed to cancel"); }
    finally { setActionLoading(null); }
  };

  const emptyMessages: Record<TabType, string> = {
    awaiting:    "No bookings waiting for provider response.",
    pay_now:     "No bookings awaiting payment.",
    confirmed:   "No confirmed bookings waiting to start.",
    in_progress: "No services currently in progress.",
    completed:   "No completed bookings yet.",
    cancelled:   "No cancelled bookings.",
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <AuthGuard>
      <main className="min-h-screen bg-[#FAFAFA] pb-28 lg:pb-8">

        {/* ── Header ── */}
        <header className="sticky top-0 z-50 bg-white border-b border-gray-100 px-5 pt-5 pb-3 lg:pt-6 lg:px-8">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => router.push("/home")} style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }} className="rounded-full p-2 active:opacity-70">
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <h1 className="text-[20px] font-black text-gray-900">My Bookings</h1>
          </div>

          {/* Tabs — scrollable so all 6 fit on any screen */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
            {tabs.map(tab => {
              const isActive = activeTab === tab.key;
              const hasAlert = tab.key === "pay_now" && counts[tab.key] > 0;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap ${
                    isActive
                      ? "bg-gray-900 text-white shadow-sm"
                      : hasAlert
                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {tab.label}
                  {counts[tab.key] > 0 && (
                    <span className={`inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full text-[9px] font-black ${
                      isActive ? "bg-white text-gray-900" :
                      hasAlert ? "bg-amber-500 text-white" :
                      "bg-gray-300 text-white"
                    }`}>
                      {counts[tab.key]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </header>

        {/* ── List ── */}
        <div className="px-4 py-5 lg:px-8">
          {loading ? (
            <div className="flex flex-col items-center py-20 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#FF8C00]" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="mt-16 flex flex-col items-center text-center px-8">
              <div className="rounded-full bg-gray-50 p-10 border border-gray-100">
                <Calendar className="h-12 w-12 text-gray-200" />
              </div>
              <h2 className="mt-6 text-lg font-black text-gray-800">
                No {activeTab} bookings
              </h2>
              <p className="mt-2 text-sm font-medium text-gray-400">{emptyMessages[activeTab]}</p>
              {["awaiting", "pay_now", "confirmed"].includes(activeTab) && (
                <button onClick={() => router.push("/home")}
                  className="mt-8 rounded-3xl bg-[#FF8C00] px-8 py-4 font-black text-white shadow-xl active:scale-95 transition-all">
                  Find a Provider
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((booking) => {
                const ns = normaliseStatus(booking.status);
                const isActionable = ["paid", "in_progress", "accepted"].includes(ns);

                return (
                  <div
                    key={booking.id}
                    onClick={() => router.push(`/bookings/${booking.id}`)}
                    style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', cursor: 'pointer' }}
                    className={`bg-white rounded-2xl border-2 shadow-sm overflow-hidden active:opacity-90 ${
                      ns === "accepted"    ? "border-amber-300" :
                      ns === "paid"        ? "border-blue-300" :
                      ns === "in_progress" ? "border-indigo-300" :
                      ns === "completed"   ? "border-emerald-300" :
                      "border-gray-200"
                    }`}
                  >
                    {/* Action banners — one per status, tells customer exactly where they are */}
                    {ns === "pending" && (
                      <div className="bg-gray-50 border-b border-gray-100 px-4 py-2 flex items-center justify-between">
                        <p className="text-[11px] font-semibold text-gray-500">⏳ Waiting for provider to accept your booking</p>
                        <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
                      </div>
                    )}
                    {ns === "accepted" && booking.paymentStatus !== "success" && (
                      <div className="bg-amber-50 border-b border-amber-100 px-4 py-2 flex items-center justify-between">
                        <p className="text-[11px] font-semibold text-amber-700">⚡ Provider accepted — tap to pay and confirm</p>
                        <ChevronRight className="h-3.5 w-3.5 text-amber-400" />
                      </div>
                    )}
                    {ns === "paid" && (
                      <div className="bg-blue-50 border-b border-blue-100 px-4 py-2 flex items-center justify-between">
                        <p className="text-[11px] font-semibold text-blue-600">✅ Payment confirmed — waiting for provider to start</p>
                        <ChevronRight className="h-3.5 w-3.5 text-blue-400" />
                      </div>
                    )}
                    {ns === "in_progress" && (
                      <div className="bg-indigo-50 border-b border-indigo-100 px-4 py-2 flex items-center justify-between">
                        <p className="text-[11px] font-semibold text-indigo-600">🔧 Service in progress — tap to manage or confirm done</p>
                        <ChevronRight className="h-3.5 w-3.5 text-indigo-400" />
                      </div>
                    )}
                    {ns === "completed" && (
                      <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-2 flex items-center justify-between">
                        <p className="text-[11px] font-semibold text-emerald-600">✅ Service completed — leave a review for your provider</p>
                        <ChevronRight className="h-3.5 w-3.5 text-emerald-400" />
                      </div>
                    )}
                    {(ns === "cancelled" || ns === "rejected") && (
                      <div className="bg-gray-50 border-b border-gray-100 px-4 py-2 flex items-center justify-between">
                        <p className="text-[11px] font-semibold text-gray-400">⚫ {ns === "rejected" ? "Provider declined this request" : "This booking was cancelled"}</p>
                        <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
                      </div>
                    )}

                    {/* Card body */}
                    <div className="p-5">
                      <div className="flex items-start gap-3">
                        {/* Neutral icon box */}
                        <div className="h-11 w-11 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                          <Calendar className="h-5 w-5 text-gray-400" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="text-[14px] font-bold text-gray-900 truncate">
                                {booking.providerName || "Provider"}
                              </h3>
                              <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                                {booking.serviceTitle || booking.serviceName || booking.category || "Service"}
                              </p>
                            </div>
                            {/* Status badge — small, monochrome feel */}
                            <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold tracking-wide ${statusBadgeClass(booking.status)}`}>
                              {statusLabel(booking.status)}
                            </span>
                          </div>

                          {/* Date / time */}
                          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className="flex items-center gap-1 text-[11px] text-gray-400">
                              <Calendar className="h-3 w-3" />
                              {format(booking.date, "EEE, MMM d")}
                            </span>
                            <span className="flex items-center gap-1 text-[11px] text-gray-400">
                              <Clock className="h-3 w-3" />
                              {format(booking.date, "h:mm a")}
                            </span>
                            {booking.address && (
                              <span className="flex items-center gap-1 text-[11px] text-gray-400 truncate max-w-[140px]">
                                <MapPin className="h-3 w-3 shrink-0" />
                                {booking.address}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="border-t border-gray-50 px-5 py-3 flex items-center justify-between">
                      <span className="text-[16px] font-bold text-gray-900">
                        ₦{(booking.amount || 0).toLocaleString()}
                      </span>

                      <div className="flex items-center gap-2">
                        {/* Chat icon */}
                        {!["completed", "cancelled", "rejected", "disputed", "refunded"].includes(ns) && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleOpenChat(booking); }}
                            disabled={chatLoading === booking.id}
                            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                            className="h-9 w-9 flex items-center justify-center rounded-lg bg-gray-100 text-gray-500 active:opacity-70 disabled:opacity-60"
                          >
                            {chatLoading === booking.id
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <MessageSquare className="h-3.5 w-3.5" />}
                          </button>
                        )}

                        {/* Primary CTA */}
                        <CardCTA
                          booking={booking}
                          onPay={() => router.push(`/payment/checkout?bookingId=${booking.id}`)}
                          onManage={() => router.push(`/bookings/${booking.id}`)}
                          onCancel={() => handleCancel(booking.id)}
                          onReview={() => { setSelectedBooking(booking); setIsReviewModalOpen(true); }}
                          actionLoading={actionLoading === booking.id}
                        />

                        {/* Rebook */}
                        {ns === "completed" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); router.push(`/book/${booking.providerId}`); }}
                            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                            className="rounded-lg bg-gray-100 px-3 py-1.5 text-[11px] font-bold text-gray-600 active:opacity-70"
                          >
                            Rebook
                          </button>
                        )}

                        {/* Book again */}
                        {(ns === "cancelled" || ns === "rejected") && booking.providerId && (
                          <button
                            onClick={(e) => { e.stopPropagation(); router.push(`/book/${booking.providerId}`); }}
                            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                            className="rounded-lg bg-gray-900 px-3 py-1.5 text-[11px] font-bold text-white active:opacity-70"
                          >
                            Book Again
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Review Modal */}
        {selectedBooking && (
          <ReviewModal
            isOpen={isReviewModalOpen}
            onClose={() => setIsReviewModalOpen(false)}
            booking={{
              id: selectedBooking.id,
              providerId: selectedBooking.providerId,
              providerName: selectedBooking.providerName || "Provider",
              customerId: user?.uid || "",
              customerName: profile?.name || "Customer",
              customerPhoto: profile?.photoURL ?? undefined,
            }}
            onSuccess={() => setIsReviewModalOpen(false)}
          />
        )}

        {/* Bottom Navigation */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 flex items-center justify-around bg-white px-4 py-3 border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] z-50">
          <button className="flex flex-col items-center gap-1 text-[#FF8C00]">
            <div className="p-1 rounded-xl bg-[#FF8C00]/10"><Calendar className="h-5 w-5" /></div>
            <span className="text-[9px] font-black uppercase tracking-widest">Bookings</span>
          </button>
          <button style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }} className="flex flex-col items-center gap-1 text-gray-400" onClick={() => router.push("/chat")}>
            <div className="p-1"><MessageIcon className="h-5 w-5" /></div>
            <span className="text-[9px] font-black uppercase tracking-widest">Chat</span>
          </button>
          <button style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }} className="flex flex-col items-center gap-1 text-gray-400" onClick={() => router.push("/home")}>
            <div className="p-1"><HomeIcon className="h-5 w-5" /></div>
            <span className="text-[9px] font-black uppercase tracking-widest">Home</span>
          </button>
          <button style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }} className="flex flex-col items-center gap-1 text-gray-400" onClick={() => router.push("/search")}>
            <div className="p-1"><Briefcase className="h-5 w-5" /></div>
            <span className="text-[9px] font-black uppercase tracking-widest">Services</span>
          </button>
          <button style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }} className="flex flex-col items-center gap-1 text-gray-400" onClick={() => router.push("/profile")}>
            <div className="p-1"><UserIcon className="h-5 w-5" /></div>
            <span className="text-[9px] font-black uppercase tracking-widest">Profile</span>
          </button>
        </nav>
      </main>
    </AuthGuard>
  );
}

"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Bell, Star, TrendingUp, ClipboardList, Clock, CheckCircle2,
  MessageSquare, User as UserIcon, ChevronRight, Wallet, Calendar,
  Search, UserPlus, ShieldCheck,
} from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import AuthGuard from "@/components/auth/AuthGuard";
import ProviderBottomNav from "@/components/provider/ProviderBottomNav";
import NotificationBell from "@/components/common/NotificationBell";
import { db } from "@/lib/firebase";
import {
  collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, getDoc,
} from "firebase/firestore";
import { createConversation } from "@/lib/chat";
import { notifyBookingAccepted, notifyBookingDeclined } from "@/lib/notifications";
import { getProviderStatusLabel, getStatusColor, getStatusIcon } from "@/lib/booking-status";
import { getSettingSection } from "@/lib/admin-settings";
import { formatDistanceToNow, format } from "date-fns";
import toast from "react-hot-toast";


export default function ProviderDashboardPage() {
  const router = useRouter();
  const { user, profile } = useAuth();

  const [bookings, setBookings]         = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [actionId, setActionId]         = useState<string | null>(null);
  const [chatLoading, setChatLoading]   = useState<string | null>(null);
  const [availability, setAvailability] = useState<Record<string, any>>({});
  const [commissionRate, setCommissionRate] = useState(0.1);
  const [providerPhotoUrl, setProviderPhotoUrl] = useState<string | null>(null);
  const [providerRating, setProviderRating] = useState<number | null>(null);

  // Live bookings subscription
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, "bookings"), where("providerId", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a: any, b: any) => {
          const ta = a.createdAt?.toDate?.()?.getTime() ?? 0;
          const tb = b.createdAt?.toDate?.()?.getTime() ?? 0;
          return tb - ta;
        });
      setBookings(data);
      setLoading(false);
    });
    return () => unsub();
  }, [user?.uid]);

  // Fetch commission rate
  useEffect(() => {
    getSettingSection("commission")
      .then((s: any) => { if (s?.percentage > 0) setCommissionRate(s.percentage / 100); })
      .catch(() => {});
  }, []);

  // Fetch availability + provider photo fallback
  useEffect(() => {
    if (!user?.uid) return;
    const fetchProviderData = async () => {
      try {
        // Try providers collection first (has photo + structured availability)
        const providerDoc = await getDoc(doc(db, "providers", user.uid));
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const providerData = providerDoc.exists() ? providerDoc.data() : {};
        const userData = userDoc.exists() ? userDoc.data() : {};

        // Photo: prefer users (latest upload), fall back to providers
        const photo = userData.photoURL || providerData.photoURL;
        if (photo) setProviderPhotoUrl(photo);

        // Rating from providers doc
        const rating = providerData.rating ?? userData.rating ?? null;
        if (rating !== null && rating !== undefined) setProviderRating(Number(rating));

        // Availability from users doc (canonical source for this page)
        const avail = userData.availability || providerData.availability || [];
        if (Array.isArray(avail)) {
          setAvailability(avail);
        } else {
          setAvailability(avail);
        }
      } catch (error) {
        console.error("Error fetching provider data:", error);
      }
    };
    fetchProviderData();
  }, [user?.uid]);

  // ── Derived stats ──────────────────────────────────────────────────────
  const pending     = bookings.filter((b: any) => b.status === "pending");
  const readyToStart = bookings.filter((b: any) => b.status === "paid");
  const inProgress  = bookings.filter((b: any) => b.status === "in_progress");
  const active      = bookings.filter((b: any) => ["accepted", "paid", "in_progress", "upcoming"].includes(b.status));
  const completed   = bookings.filter((b: any) => b.status === "completed");

  const totalEarnings = completed.reduce((sum: number, b: any) => sum + ((b.price || 0) * (1 - commissionRate)), 0);

  const avgRating = providerRating !== null && providerRating > 0
    ? providerRating.toFixed(1)
    : "—";

  const availableDays = Array.isArray(availability)
    ? availability.length
    : Object.values(availability).filter((v: any) => v?.available).length;

  const recentEarnings = completed.slice(0, 5);

  // Pending payouts: paid/in_progress bookings where funds not released
  const pendingPayouts = bookings.filter((b: any) =>
    (b.status === "paid" || b.status === "in_progress") &&
    b.escrowStatus === "holding" &&
    !b.fundsReleased
  );

  // ── Actions ───────────────────────────────────────────────────────────
  const handleAccept = async (b: any) => {
    setActionId(b.id);
    try {
      await updateDoc(doc(db, "bookings", b.id), { status: "accepted", updatedAt: serverTimestamp() });
      notifyBookingAccepted(b.customerId, profile?.name || "Your provider", b.id);
      toast.success("Booking accepted! Waiting for customer payment.");
    } catch {
      toast.error("Failed to accept booking");
    } finally {
      setActionId(null);
    }
  };

  const handleOpenChat = async (b: any) => {
    if (b.conversationId) {
      router.push(`/chat/${b.conversationId}`);
      return;
    }
    if (!b.customerId) {
      toast.error("Customer info missing on this booking");
      return;
    }
    setChatLoading(b.id);
    try {
      const convId = await createConversation(b.customerId, user!.uid, b.id);
      await updateDoc(doc(db, "bookings", b.id), { conversationId: convId });
      router.push(`/chat/${convId}`);
    } catch (err) {
      console.error("[Chat] error:", err);
      toast.error("Could not open chat");
    } finally {
      setChatLoading(null);
    }
  };

  const handleDecline = async (b: any) => {
    setActionId(b.id);
    try {
      await updateDoc(doc(db, "bookings", b.id), { status: "rejected", updatedAt: serverTimestamp() });
      notifyBookingDeclined(b.customerId, profile?.name || "Your provider", b.id);
      toast.success("Booking declined");
    } catch {
      toast.error("Failed to decline booking");
    } finally {
      setActionId(null);
    }
  };

  const firstName = profile?.name?.split(" ")[0] || "Provider";
  const photoURL  = profile?.photoURL || providerPhotoUrl || null;

  // ── Helpers ───────────────────────────────────────────────────────────
  const fmtDate = (ts: any) => {
    if (!ts) return "—";
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return format(d, "EEE, MMM d");
  };

  // Helper: avatar with initials fallback
  const Avatar = ({ photo, name, size = "md" }: { photo?: string | null; name?: string; size?: "sm" | "md" }) => {
    const dim = size === "sm" ? "h-9 w-9" : "h-11 w-11";
    const initials = (name || "?").charAt(0).toUpperCase();
    return (
      <div className={`relative ${dim} rounded-full overflow-hidden bg-primary/10 flex-shrink-0 border border-gray-100`}>
        {photo
          ? <Image src={photo} alt={name || ""} fill className="object-cover" />
          : <div className="h-full w-full flex items-center justify-center">
              <span className="text-[13px] font-black text-primary">{initials}</span>
            </div>
        }
      </div>
    );
  };

  return (
    <AuthGuard>
      <main className="min-h-screen bg-[#FFF8F0] pb-28 lg:pb-12 overflow-x-hidden">

        {/* ── Header ───────────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-[#FF8C00] to-[#FF7B00] sticky top-0 z-50">
          <header className="w-full px-5 lg:px-8 pt-5 pb-5 lg:pt-7 lg:pb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative h-12 w-12 lg:h-14 lg:w-14 rounded-full overflow-hidden border-2 border-white/30 bg-gray-100 flex-shrink-0">
                  {photoURL
                    ? <Image src={photoURL} alt={firstName} fill className="object-cover" />
                    : <div className="h-full w-full flex items-center justify-center"><UserIcon className="h-6 w-6 text-gray-400" /></div>
                  }
                </div>
                <div>
                  <p className="text-[11px] lg:text-[12px] font-bold text-white/80 uppercase tracking-wider">Welcome back,</p>
                  <h1 className="text-[18px] lg:text-[22px] font-black text-white leading-tight">{firstName}</h1>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-black text-white border border-white/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-300" />Active
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { localStorage.setItem("viewAsCustomer", "true"); router.push("/home"); }}
                  className="hidden lg:flex items-center gap-2 rounded-xl bg-white/20 hover:bg-white/30 border border-white/30 px-4 py-2 text-[13px] font-bold text-white transition-all active:scale-95"
                >
                  <Search className="h-4 w-4" />
                  Customer Mode
                </button>
                <div className="lg:hidden"><NotificationBell /></div>
              </div>
            </div>
          </header>
        </div>

        {/* ── Page Title bar (mobile only customer mode btn) ─────── */}
        <div className="w-full px-5 lg:px-8 pt-5 pb-1 flex items-center justify-between lg:hidden">
          <h2 className="text-[15px] font-black text-text">Provider Dashboard</h2>
          <button
            onClick={() => { localStorage.setItem("viewAsCustomer", "true"); router.push("/home"); }}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-bold text-white shadow-sm active:scale-95"
          >
            <Search className="h-3 w-3" />Customer Mode
          </button>
        </div>
        <div className="hidden lg:flex w-full px-8 pt-6 pb-1 items-center">
          <h2 className="text-[16px] font-black text-text">Overview</h2>
        </div>

        {/* ── Stats Grid ─────────────────────────────────────────────── */}
        <section className="px-5 lg:px-8 mt-4 lg:mt-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4">
            {[
              { label: "Total Bookings", value: bookings.length,                              icon: ClipboardList, bg: "bg-blue-50",       color: "text-blue-500",   onClick: () => router.push("/provider/bookings") },
              { label: "New Requests",   value: pending.length,                               icon: Clock,         bg: "bg-yellow-50",     color: "text-yellow-500", onClick: () => router.push("/provider/bookings?tab=pending") },
              { label: "Earnings",       value: `₦${Math.round(totalEarnings).toLocaleString()}`, icon: Wallet,    bg: "bg-green-50",      color: "text-green-600",  onClick: () => router.push("/provider/earnings") },
              { label: "Avg Rating",     value: avgRating,                                    icon: Star,          bg: "bg-[#FFF4E5]",     color: "text-primary",    onClick: undefined },
              { label: "Availability",   value: `${availableDays}/7 days`,                    icon: Calendar,      bg: "bg-orange-50",     color: "text-orange-500", onClick: () => router.push("/provider/availability") },
            ].map((stat) => {
              const inner = (
                <>
                  <div className={`h-10 w-10 lg:h-11 lg:w-11 rounded-xl ${stat.bg} flex items-center justify-center`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div className="mt-3">
                    <p className="text-[22px] lg:text-[26px] font-black text-text leading-none">{loading ? "—" : stat.value}</p>
                    <p className="text-[10px] lg:text-[11px] font-bold text-text-light uppercase tracking-wider mt-1">{stat.label}</p>
                  </div>
                </>
              );
              return stat.onClick ? (
                <button key={stat.label} onClick={stat.onClick}
                  className="flex flex-col p-4 lg:p-5 rounded-2xl bg-white border border-gray-100 shadow-sm text-left hover:shadow-md hover:border-gray-200 active:scale-[0.97] transition-all">
                  {inner}
                </button>
              ) : (
                <div key={stat.label}
                  className="flex flex-col p-4 lg:p-5 rounded-2xl bg-white border border-gray-100 shadow-sm">
                  {inner}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Main content grid ─────────────────────────────────────── */}
        <div className="px-5 lg:px-8 mt-7 lg:mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">

          {/* ── Incoming Requests ─────────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[14px] lg:text-[16px] font-black text-text">Incoming Requests</h2>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold bg-yellow-50 text-yellow-600 px-2.5 py-1 rounded-full">{pending.length} new</span>
                <button onClick={() => router.push("/provider/bookings?tab=pending")}
                  className="flex items-center gap-0.5 text-[11px] font-black text-primary hover:underline">
                  See all <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            {loading ? (
              <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-28 rounded-2xl bg-white border border-gray-100 animate-pulse" />)}</div>
            ) : pending.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-12 text-center">
                <ClipboardList className="h-9 w-9 text-gray-300 mb-3" />
                <p className="text-[13px] font-black text-text-light">No new requests yet</p>
                <p className="text-[11px] font-bold text-gray-400 mt-1">New booking requests will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pending.slice(0, 3).map((b: any) => (
                  <div key={b.id} className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4 lg:p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3">
                      <Avatar photo={b.customerPhoto} name={b.customerName} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-[13px] lg:text-[14px] font-black text-text">{b.customerName || "Customer"}</p>
                            <p className="text-[11px] font-bold text-text-light">{b.servicePackage || b.serviceTitle || b.category}</p>
                          </div>
                          <p className="text-[14px] lg:text-[15px] font-black text-primary flex-shrink-0">₦{(b.price || 0).toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <Clock className="h-3 w-3 text-text-light" />
                          <span className="text-[10px] font-bold text-text-light">{fmtDate(b.date)}</span>
                          <span className="text-[10px] font-bold text-gray-400 ml-1">
                            {b.createdAt ? formatDistanceToNow(b.createdAt.toDate(), { addSuffix: true }) : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button onClick={() => handleAccept(b)} disabled={actionId === b.id}
                        className="flex-1 rounded-xl bg-green-500 py-2.5 text-[12px] font-black text-white active:scale-95 transition-all disabled:opacity-60 hover:bg-green-600">
                        {actionId === b.id ? "..." : "Accept"}
                      </button>
                      <button onClick={() => handleDecline(b)} disabled={actionId === b.id}
                        className="flex-1 rounded-xl bg-red-50 border border-red-200 py-2.5 text-[12px] font-black text-red-500 active:scale-95 transition-all disabled:opacity-60 hover:bg-red-100">
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Ready to Start (paid) — most urgent ────────────────── */}
          {readyToStart.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[14px] lg:text-[16px] font-black text-text flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  Start Job
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold bg-green-50 text-green-600 px-2.5 py-1 rounded-full">{readyToStart.length} paid</span>
                  <button onClick={() => router.push("/provider/bookings?tab=paid")}
                    className="flex items-center gap-0.5 text-[11px] font-black text-primary hover:underline">
                    See all <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                {readyToStart.slice(0, 3).map((b: any) => (
                  <div key={b.id}
                    className="rounded-2xl bg-white border-2 border-green-200 shadow-sm p-4 lg:p-5 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => router.push(`/provider/bookings/${b.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar photo={b.customerPhoto} name={b.customerName} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] lg:text-[14px] font-black text-text">{b.customerName || "Customer"}</p>
                        <p className="text-[11px] font-bold text-text-light">{b.servicePackage || b.serviceTitle || b.category} · {fmtDate(b.date)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[14px] font-black text-green-600">₦{(b.price || 0).toLocaleString()}</p>
                        <span className="text-[9px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded-full animate-pulse">Start Job</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Active Bookings (accepted / in_progress) ──────────── */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[14px] lg:text-[16px] font-black text-text">Active Bookings</h2>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full">{active.filter((b: any) => b.status !== "paid").length} active</span>
                <button onClick={() => router.push("/provider/bookings")}
                  className="flex items-center gap-0.5 text-[11px] font-black text-primary hover:underline">
                  See all <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            {loading ? (
              <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-20 rounded-2xl bg-white border border-gray-100 animate-pulse" />)}</div>
            ) : active.filter((b: any) => b.status !== "paid").length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-12 text-center">
                <CheckCircle2 className="h-9 w-9 text-gray-300 mb-3" />
                <p className="text-[13px] font-black text-text-light">No active bookings</p>
              </div>
            ) : (
              <div className="space-y-3">
                {active.filter((b: any) => b.status !== "paid").slice(0, 3).map((b: any) => (
                  <div key={b.id} className="flex items-center gap-3 rounded-2xl bg-white border border-gray-100 shadow-sm p-4 lg:p-5 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => router.push(`/provider/bookings/${b.id}`)}
                  >
                    <Avatar photo={b.customerPhoto} name={b.customerName} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] lg:text-[14px] font-black text-text">{b.customerName || "Customer"}</p>
                      <p className="text-[11px] font-bold text-text-light">{fmtDate(b.date)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ${getStatusColor(b.status)}`}>
                        {getProviderStatusLabel(b.status)}
                      </span>
                      <button onClick={(e) => { e.stopPropagation(); handleOpenChat(b); }} disabled={chatLoading === b.id}
                        className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-[10px] font-black text-primary active:scale-95 transition-all disabled:opacity-60 hover:bg-primary/20">
                        {chatLoading === b.id
                          ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                          : <MessageSquare className="h-3 w-3" />}
                        Chat
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Recent Earnings ───────────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[14px] lg:text-[16px] font-black text-text">Recent Earnings</h2>
              <button onClick={() => router.push("/provider/earnings")}
                className="flex items-center gap-1 text-[11px] font-black text-primary hover:underline">
                View all <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
            {loading ? (
              <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-14 rounded-2xl bg-white border border-gray-100 animate-pulse" />)}</div>
            ) : recentEarnings.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-12 text-center">
                <TrendingUp className="h-9 w-9 text-gray-300 mb-3" />
                <p className="text-[13px] font-black text-text-light">No earnings yet</p>
                <p className="text-[11px] font-bold text-gray-400 mt-1">Completed bookings will show here</p>
              </div>
            ) : (
              <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
                {recentEarnings.map((b: any) => {
                  const net = Math.round((b.price || 0) * (1 - commissionRate));
                  return (
                    <div key={b.id} className="flex items-center justify-between px-4 lg:px-5 py-3.5">
                      <div>
                        <p className="text-[13px] lg:text-[14px] font-black text-text">{b.customerName || "Customer"}</p>
                        <p className="text-[10px] lg:text-[11px] font-bold text-text-light">{fmtDate(b.date)} · {b.servicePackage || b.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[14px] lg:text-[15px] font-black text-green-600">₦{net.toLocaleString()}</p>
                        <p className="text-[9px] font-bold text-gray-400">after {Math.round(commissionRate * 100)}% fee</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── Pending Payouts ───────────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[14px] lg:text-[16px] font-black text-text">Pending Payouts</h2>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold bg-yellow-50 text-yellow-600 px-2.5 py-1 rounded-full">{pendingPayouts.length} pending</span>
                <button onClick={() => router.push("/provider/earnings")}
                  className="flex items-center gap-0.5 text-[11px] font-black text-primary hover:underline">
                  See all <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            {pendingPayouts.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-12 text-center">
                <ShieldCheck className="h-9 w-9 text-gray-300 mb-3" />
                <p className="text-[13px] font-black text-text-light">No pending payouts</p>
                <p className="text-[11px] font-bold text-gray-400 mt-1">Funds auto-release when customer confirms</p>
              </div>
            ) : (
              <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
                {pendingPayouts.slice(0, 3).map((b: any) => {
                  const amount = (b.totalAmount || b.price || 0) * 0.9;
                  const isInProgress = b.status === "in_progress";
                  return (
                    <div key={b.id} className="flex items-center justify-between px-4 lg:px-5 py-3.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] lg:text-[14px] font-black text-text">{b.customerName || "Customer"}</p>
                        <p className="text-[10px] font-bold text-text-light">{b.servicePackage || b.serviceTitle || b.category}</p>
                        <span className={`inline-block mt-1 text-[9px] font-black px-2 py-0.5 rounded-full ${isInProgress ? "bg-blue-50 text-blue-600" : "bg-yellow-50 text-yellow-600"}`}>
                          {isInProgress ? "Awaiting Confirmation" : "In Progress"}
                        </span>
                      </div>
                      <div className="text-right ml-3">
                        <p className="text-[14px] lg:text-[15px] font-black text-green-600">₦{Math.round(amount).toLocaleString()}</p>
                        <p className="text-[9px] font-bold text-gray-400">your 90%</p>
                      </div>
                    </div>
                  );
                })}
                <div className="px-4 py-3 bg-orange-50/70">
                  <p className="text-[10px] font-bold text-orange-600 text-center">Funds auto-release 72h after marking In Progress</p>
                </div>
              </div>
            )}
          </section>

        </div>{/* end main grid */}

        <ProviderBottomNav />
      </main>
    </AuthGuard>
  );
}

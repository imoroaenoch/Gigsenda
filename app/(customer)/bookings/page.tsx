"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  MapPin, 
  MessageSquare, 
  CheckCircle2,
  XCircle,
  Home as HomeIcon,
  MessageSquare as MessageIcon,
  User as UserIcon,
  Briefcase,
  Star
} from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import ReviewModal from "@/components/bookings/ReviewModal";
import AuthGuard from "@/components/auth/AuthGuard";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { updateBookingStatus } from "@/lib/firestore";
import { createConversation } from "@/lib/chat";
import toast from "react-hot-toast";

type TabType = "pending" | "upcoming" | "completed" | "cancelled";

export default function BookingsPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("pending");
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState<string | null>(null);

  const isProvider = profile?.accountType === "provider";

  useEffect(() => {
    if (!user?.uid || !profile) return;

    const roleField = isProvider ? "providerId" : "customerId";
    const bookingsRef = collection(db, "bookings");
    // No orderBy here — avoids composite index requirement, sort client-side
    const q = query(bookingsRef, where(roleField, "==", user.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs
        .map(doc => {
          const d = doc.data();
          return {
            ...d,
            id: doc.id,
            date: d.date?.toDate ? d.date.toDate() : new Date(d.date),
          };
        })
        .sort((a, b) => b.date.getTime() - a.date.getTime());
      setBookings(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching bookings:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid, profile]);

  const tabs: { key: TabType; label: string }[] = [
    { key: "pending", label: "Pending" },
    { key: "upcoming", label: "Upcoming" },
    { key: "completed", label: "Completed" },
    { key: "cancelled", label: "Cancelled" },
  ];

  const filteredBookings = bookings.filter(b => b.status === activeTab);

  const counts = {
    pending: bookings.filter(b => b.status === "pending").length,
    upcoming: bookings.filter(b => b.status === "upcoming").length,
    completed: bookings.filter(b => b.status === "completed").length,
    cancelled: bookings.filter(b => b.status === "cancelled").length,
  };

  const handleOpenChat = async (booking: any) => {
    if (booking.conversationId) {
      router.push(`/chat/${booking.conversationId}`);
      return;
    }
    if (!booking.customerId || !booking.providerId) {
      toast.error("Booking data is incomplete");
      return;
    }
    // Fallback: create conversation for old bookings that don't have one yet
    setChatLoading(booking.id);
    try {
      const convId = await createConversation(
        booking.customerId,
        booking.providerId,
        booking.id
      );
      // Persist so future clicks are instant
      await updateDoc(doc(db, "bookings", booking.id), { conversationId: convId });
      router.push(`/chat/${convId}`);
    } catch {
      toast.error("Could not open chat");
    } finally {
      setChatLoading(null);
    }
  };

  const handleStatusChange = async (bookingId: string, status: "completed" | "cancelled") => {
    setActionLoading(bookingId);
    try {
      await updateBookingStatus(bookingId, status);
      toast.success(status === "completed" ? "Booking marked as completed" : "Booking cancelled");
    } catch {
      toast.error("Failed to update booking");
    } finally {
      setActionLoading(null);
    }
  };

  const emptyMessages: Record<TabType, string> = {
    pending: "No pending bookings. Find a provider and book a service.",
    upcoming: "No upcoming bookings.",
    completed: "No completed bookings yet.",
    cancelled: "No cancelled bookings.",
  };

  // Desktop: track which booking is previewed in the right panel
  const [previewBooking, setPreviewBooking] = useState<any>(null);

  return (
    <AuthGuard>
      <main className="min-h-screen bg-white pb-24 lg:pb-8">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-white px-6 pt-5 pb-3 border-b border-gray-100 lg:pt-6 lg:px-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push(isProvider ? "/provider/profile" : "/home")}
              className="rounded-full p-2 text-gray-500 hover:bg-gray-100 transition-all"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <h1 className="text-[20px] font-black text-gray-900">My Bookings</h1>
          </div>

          {/* Tabs */}
          <div className="mt-6 flex rounded-2xl bg-gray-100 p-1 gap-1">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 rounded-xl py-2.5 text-[10px] font-black uppercase tracking-wider transition-all relative ${
                  activeTab === tab.key ? "bg-white text-primary shadow-lg" : "text-text-light"
                }`}
              >
                {tab.label}
                {counts[tab.key] > 0 && (
                  <span className={`ml-1 inline-flex items-center justify-center h-4 w-4 rounded-full text-[9px] font-black ${
                    activeTab === tab.key ? "bg-primary text-white" : "bg-gray-300 text-white"
                  }`}>
                    {counts[tab.key]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </header>

        <div className="lg:flex lg:gap-0">
          {/* Left: list */}
          <div className="flex-1 min-w-0 px-4 py-6 lg:px-8 lg:max-w-[600px]">
          {loading ? (
            <div className="flex flex-col items-center py-20 gap-3">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              <p className="text-xs font-black text-text-light uppercase tracking-widest">Loading bookings...</p>
            </div>
          ) : filteredBookings.length > 0 ? (
            <div className="space-y-4">
              {filteredBookings.map((booking) => (
                <div
                  key={booking.id}
                  onClick={() => setPreviewBooking(booking)}
                  className={`overflow-hidden rounded-[2rem] bg-white shadow-sm border transition-all cursor-pointer hover:shadow-md hover:border-primary/20 ${
                    previewBooking?.id === booking.id ? "border-primary/40 ring-2 ring-primary/10" : "border-gray-100"
                  }`}
                >
                  <div className="p-6">
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/10 shrink-0">
                          <Calendar className="h-6 w-6" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-base font-black text-text truncate">
                            {isProvider ? booking.customerName : booking.providerName}
                          </h3>
                          <p className="text-[10px] font-bold text-text-light uppercase tracking-widest mt-0.5">
                            {booking.serviceTitle || booking.category}
                          </p>
                        </div>
                      </div>
                      {/* Status badge */}
                      <span className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-tight ${
                        booking.status === "completed" ? "bg-green-50 text-green-600 border border-green-100" :
                        booking.status === "cancelled" ? "bg-red-50 text-red-500 border border-red-100" :
                        booking.status === "pending" ? "bg-yellow-50 text-yellow-600 border border-yellow-100" :
                        "bg-blue-50 text-blue-600 border border-blue-100"
                      }`}>
                        {booking.status === "completed" && <CheckCircle2 className="h-3 w-3" />}
                        {booking.status === "cancelled" && <XCircle className="h-3 w-3" />}
                        {booking.status === "upcoming" && <Clock className="h-3 w-3" />}
                        {booking.status === "pending" && <Clock className="h-3 w-3" />}
                        {booking.status}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="mt-5 space-y-2.5">
                      <div className="flex items-center gap-3 text-xs font-bold text-text-light">
                        <div className="rounded-lg bg-orange-50 p-1.5 shrink-0">
                          <Calendar className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span>{format(booking.date, "EEEE, MMM do yyyy")}</span>
                        <span className="text-gray-300">•</span>
                        <div className="rounded-lg bg-orange-50 p-1.5 shrink-0">
                          <Clock className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span>{format(booking.date, "hh:mm a")}</span>
                      </div>
                      {booking.address && (
                        <div className="flex items-center gap-3 text-xs font-bold text-text-light">
                          <div className="rounded-lg bg-orange-50 p-1.5 shrink-0">
                            <MapPin className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <span className="truncate">{booking.address}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="bg-gray-50/50 px-6 py-4 flex items-center justify-between border-t border-gray-100">
                    <span className="text-xl font-black text-primary">
                      ₦{(booking.price || 0).toLocaleString()}
                    </span>
                    <div className="flex gap-2">
                      {(booking.status === "pending" || booking.status === "upcoming") && (
                        <>
                          {/* Chat button */}
                          <button
                            onClick={() => handleOpenChat(booking)}
                            disabled={chatLoading === booking.id}
                            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white border border-gray-200 text-primary shadow-sm active:scale-95 transition-all disabled:opacity-60"
                          >
                            {chatLoading === booking.id
                              ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                              : <MessageSquare className="h-4 w-4" />}
                          </button>

                          {/* Provider: mark complete */}
                          {isProvider && (
                            <button
                              onClick={() => handleStatusChange(booking.id, "completed")}
                              disabled={actionLoading === booking.id}
                              className="flex items-center gap-1.5 rounded-2xl bg-green-500 px-4 py-2.5 text-[10px] font-black text-white shadow-lg shadow-green-500/20 active:scale-95 transition-all disabled:opacity-60"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {actionLoading === booking.id ? "..." : "Complete"}
                            </button>
                          )}

                          {/* Customer: cancel */}
                          {!isProvider && (
                            <button
                              onClick={() => handleStatusChange(booking.id, "cancelled")}
                              disabled={actionLoading === booking.id}
                              className="flex items-center gap-1.5 rounded-2xl bg-red-50 border border-red-100 px-4 py-2.5 text-[10px] font-black text-red-500 hover:bg-red-500 hover:text-white transition-all active:scale-95 disabled:opacity-60"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              {actionLoading === booking.id ? "..." : "Cancel"}
                            </button>
                          )}
                        </>
                      )}

                      {booking.status === "completed" && !isProvider && (
                        <>
                          {!booking.isReviewed && (
                            <button
                              onClick={() => { setSelectedBooking(booking); setIsReviewModalOpen(true); }}
                              className="flex items-center gap-1.5 rounded-2xl bg-orange-50 px-4 py-2.5 text-[10px] font-black text-primary border border-primary/10 active:scale-95 transition-all"
                            >
                              <Star className="h-3.5 w-3.5 fill-primary" />
                              Review
                            </button>
                          )}
                          <button
                            onClick={() => router.push(`/book/${booking.providerId}`)}
                            className="rounded-2xl bg-white border border-gray-200 px-4 py-2.5 text-[10px] font-black text-text shadow-sm active:scale-95 transition-all"
                          >
                            Rebook
                          </button>
                        </>
                      )}

                      {booking.status === "cancelled" && !isProvider && (
                        <button
                          onClick={() => router.push(`/book/${booking.providerId}`)}
                          className="rounded-2xl bg-primary px-5 py-2.5 text-[10px] font-black text-white shadow-lg shadow-primary/20 active:scale-95 transition-all"
                        >
                          Book Again
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-16 flex flex-col items-center text-center px-8">
              <div className="rounded-full bg-gray-50 p-10 text-gray-200 border border-gray-100">
                <Calendar className="h-12 w-12" />
              </div>
              <h2 className="mt-6 text-lg font-black text-text">
                {activeTab === "pending" ? "No pending bookings" : activeTab === "upcoming" ? "No upcoming bookings" : activeTab === "completed" ? "No completed bookings" : "No cancelled bookings"}
              </h2>
              <p className="mt-2 text-sm font-bold text-text-light">{emptyMessages[activeTab]}</p>
              {(activeTab === "pending" || activeTab === "upcoming") && !isProvider && (
                <button onClick={() => router.push("/home")}
                  className="mt-8 rounded-3xl bg-primary px-8 py-4 font-black text-white shadow-xl shadow-primary/20 active:scale-95 transition-all">
                  Find a Provider
                </button>
              )}
            </div>
          )}
          </div>

          {/* Right: desktop detail preview */}
          <div className="hidden lg:flex flex-1 border-l border-gray-100 bg-white">
            {previewBooking ? (
              <div className="flex-1 p-8">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-black text-text">
                      {isProvider ? previewBooking.customerName : previewBooking.providerName}
                    </h2>
                    <p className="text-[12px] font-semibold text-text-light mt-1">{previewBooking.serviceTitle || previewBooking.category}</p>
                  </div>
                  <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase ${
                    previewBooking.status === "completed" ? "bg-green-50 text-green-600" :
                    previewBooking.status === "cancelled" ? "bg-red-50 text-red-500" :
                    previewBooking.status === "pending" ? "bg-yellow-50 text-yellow-600" :
                    "bg-blue-50 text-blue-600"
                  }`}>{previewBooking.status}</span>
                </div>
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="text-[13px] font-semibold text-text">{format(previewBooking.date, "EEEE, MMM do yyyy")}</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="text-[13px] font-semibold text-text">{format(previewBooking.date, "hh:mm a")}</span>
                  </div>
                  {previewBooking.address && (
                    <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span className="text-[13px] font-semibold text-text">{previewBooking.address}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl mb-6">
                  <span className="text-[13px] font-semibold text-gray-500">Total Amount</span>
                  <span className="text-2xl font-black text-primary">₦{(previewBooking.price || 0).toLocaleString()}</span>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => handleOpenChat(previewBooking)}
                    disabled={chatLoading === previewBooking.id}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-gray-200 text-[13px] font-bold text-gray-600 hover:border-primary/30 hover:text-primary transition-all">
                    <MessageSquare className="h-4 w-4" />
                    Message
                  </button>
                  <button onClick={() => router.push(`/bookings/${previewBooking.id}`)}
                    className="flex-1 py-3 rounded-2xl bg-primary text-white text-[13px] font-bold hover:bg-primary/90 transition-all">
                    View Details
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-300">
                <Calendar className="h-16 w-16 mb-4" />
                <p className="text-[14px] font-semibold">Select a booking to preview</p>
              </div>
            )}
          </div>
        </div>

        {/* Review Modal */}
        {selectedBooking && (
          <ReviewModal
            isOpen={isReviewModalOpen}
            onClose={() => setIsReviewModalOpen(false)}
            booking={{
              id: selectedBooking.id,
              providerId: selectedBooking.providerId,
              providerName: selectedBooking.providerName,
              customerId: user?.uid || "",
              customerName: profile?.name || "Customer",
              customerPhoto: profile?.photoURL ?? undefined,
            }}
            onSuccess={() => setIsReviewModalOpen(false)}
          />
        )}

        {/* Bottom Navigation */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 flex items-center justify-around bg-white px-4 py-3.5 border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] z-50">
          <button className="flex flex-col items-center gap-1 text-primary">
            <div className="p-1 rounded-xl bg-primary/10"><Calendar className="h-5 w-5 fill-primary" /></div>
            <span className="text-[9px] font-black uppercase tracking-widest">Booking</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-text-light" onClick={() => router.push("/chat")}>
            <div className="p-1"><MessageIcon className="h-5 w-5" /></div>
            <span className="text-[9px] font-black uppercase tracking-widest">Chat</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-text-light" onClick={() => router.push("/home")}>
            <div className="p-1"><HomeIcon className="h-5 w-5" /></div>
            <span className="text-[9px] font-black uppercase tracking-widest">Home</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-text-light" onClick={() => router.push("/search")}>
            <div className="p-1"><Briefcase className="h-5 w-5" /></div>
            <span className="text-[9px] font-black uppercase tracking-widest">Services</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-text-light" onClick={() => router.push("/profile")}>
            <div className="p-1"><UserIcon className="h-5 w-5" /></div>
            <span className="text-[9px] font-black uppercase tracking-widest">Profile</span>
          </button>
        </nav>
      </main>
    </AuthGuard>
  );
}

"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ClipboardList, User as UserIcon, Clock, ChevronRight,
} from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import AuthGuard from "@/components/auth/AuthGuard";
import ProviderBottomNav from "@/components/provider/ProviderBottomNav";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, getDoc, doc } from "firebase/firestore";
import { format } from "date-fns";

type TabId = "all" | "pending" | "upcoming" | "completed" | "cancelled";

const TABS: { id: TabId; label: string }[] = [
  { id: "all",       label: "All" },
  { id: "pending",   label: "Pending" },
  { id: "upcoming",  label: "Confirmed" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
];

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending:   { label: "Pending",   className: "bg-yellow-50 text-yellow-600" },
  upcoming:  { label: "Confirmed", className: "bg-blue-50 text-blue-500" },
  completed: { label: "Completed", className: "bg-green-50 text-green-600" },
  cancelled: { label: "Cancelled", className: "bg-red-50 text-red-400" },
};

function ProviderBookingsPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { user }     = useAuth();

  const initialTab = (searchParams.get("tab") as TabId) || "all";
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [bookings, setBookings]   = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [customerPhotos, setCustomerPhotos] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, "bookings"), where("providerId", "==", user.uid));
    const unsub = onSnapshot(q, async (snap) => {
      const data = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a: any, b: any) => {
          const ta = a.createdAt?.toDate?.()?.getTime() ?? 0;
          const tb = b.createdAt?.toDate?.()?.getTime() ?? 0;
          return tb - ta;
        });
      setBookings(data);
      setLoading(false);

      // Fetch photos for customers missing a photo
      const missingIds = [...new Set(
        data
          .filter((b: any) => !b.customerPhoto && b.customerId)
          .map((b: any) => b.customerId as string)
      )];
      if (missingIds.length === 0) return;
      const entries = await Promise.all(
        missingIds.map(async (uid) => {
          try {
            const snap = await getDoc(doc(db, "users", uid));
            const photo = snap.exists() ? snap.data().photoURL : null;
            return [uid, photo] as [string, string | null];
          } catch { return [uid, null] as [string, null]; }
        })
      );
      setCustomerPhotos(prev => ({
        ...prev,
        ...Object.fromEntries(entries.filter(([, v]) => v)),
      }));
    });
    return () => unsub();
  }, [user?.uid]);

  const filtered = activeTab === "all" ? bookings : bookings.filter((b: any) => b.status === activeTab);

  const fmtDate = (ts: any) => {
    if (!ts) return "—";
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return format(d, "EEE, MMM d · h:mm a");
  };

  return (
    <AuthGuard>
      <main className="min-h-screen bg-[#FFF8F0] pb-28 lg:pb-12 overflow-x-hidden">

        {/* Header */}
        <header className="sticky top-0 z-50 px-5 lg:px-8 pt-5 pb-5 lg:pt-6 lg:pb-5 bg-white border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[20px] lg:text-[24px] font-black text-text">My Bookings</h1>
              <p className="text-[11px] lg:text-[13px] font-bold text-text-light mt-0.5">
                {bookings.length} total booking{bookings.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="hidden lg:flex items-center gap-2">
              {Object.entries(STATUS_BADGE).map(([key, val]) => (
                <span key={key} className={`text-[11px] font-black px-3 py-1 rounded-full ${val.className}`}>
                  {bookings.filter((b: any) => b.status === key).length} {val.label}
                </span>
              ))}
            </div>
          </div>
        </header>

        {/* Filter tabs */}
        <div className="px-5 lg:px-8 pt-4">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide lg:overflow-visible">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 rounded-full px-4 lg:px-5 py-2 text-[11px] lg:text-[12px] font-black transition-all ${
                  activeTab === tab.id
                    ? "bg-primary text-white shadow-md shadow-primary/20"
                    : "bg-white text-text-light border border-gray-100 hover:border-gray-300"
                }`}
              >
                {tab.label}
                {tab.id !== "all" && (
                  <span className={`ml-1.5 ${activeTab === tab.id ? "opacity-70" : "opacity-50"}`}>
                    ({bookings.filter((b: any) => b.status === tab.id).length})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Booking list */}
        <div className="px-5 lg:px-8 mt-5">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-32 rounded-2xl bg-white border border-gray-100 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
              <ClipboardList className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-[14px] font-black text-text-light">No {activeTab === "all" ? "" : activeTab} bookings yet</p>
              <p className="text-[12px] font-bold text-gray-400 mt-1">Bookings will appear here once customers book you</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((b: any) => {
                const badge = STATUS_BADGE[b.status] || STATUS_BADGE.pending;
                const photo = b.customerPhoto || customerPhotos[b.customerId];
                const initials = (b.customerName || "?").charAt(0).toUpperCase();
                return (
                  <div key={b.id} className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4 lg:p-5 hover:shadow-md transition-shadow flex flex-col">
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="relative h-11 w-11 rounded-full overflow-hidden bg-primary/10 flex-shrink-0 border border-gray-100">
                        {photo
                          ? <Image src={photo} alt={b.customerName || ""} fill className="object-cover" />
                          : <div className="h-full w-full flex items-center justify-center"><span className="text-[15px] font-black text-primary">{initials}</span></div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-[13px] lg:text-[14px] font-black text-text">{b.customerName || "Customer"}</p>
                            <p className="text-[11px] font-bold text-text-light truncate">{b.servicePackage || b.serviceTitle || b.category}</p>
                          </div>
                          <span className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-black ${badge.className}`}>
                            {badge.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-1.5">
                          <Clock className="h-3 w-3 text-text-light" />
                          <span className="text-[10px] font-bold text-text-light">{fmtDate(b.date)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
                      <p className="text-[15px] font-black text-primary">₦{(b.price || 0).toLocaleString()}</p>
                      <button
                        onClick={() => router.push(`/provider/bookings/${b.id}`)}
                        className="flex items-center gap-1 rounded-xl bg-gray-50 border border-gray-100 px-3 py-1.5 text-[11px] font-black text-text-light active:scale-95 transition-all hover:bg-gray-100"
                      >
                        View Details <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <ProviderBottomNav />
      </main>
    </AuthGuard>
  );
}

export default function ProviderBookingsPageWrapper() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
      <ProviderBookingsPage />
    </Suspense>
  );
}

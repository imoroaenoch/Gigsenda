"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, onSnapshot, doc, updateDoc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AlertTriangle, CheckCircle, RefreshCw, ChevronLeft } from "lucide-react";
import Image from "next/image";
import { format } from "date-fns";
import toast from "react-hot-toast";

const TABS = ["All", "Open", "Under Review", "Resolved"];

const STATUS_COLORS: Record<string, string> = {
  open: "bg-red-100 text-red-700",
  under_review: "bg-yellow-100 text-yellow-700",
  resolved: "bg-green-100 text-green-700",
};

export default function AdminDisputesPage() {
  const router = useRouter();
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "disputes"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setDisputes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = disputes.filter(d => {
    if (activeTab === "All") return true;
    if (activeTab === "Open") return d.status === "open";
    if (activeTab === "Under Review") return d.status === "under_review";
    if (activeTab === "Resolved") return d.status === "resolved";
    return true;
  });

  const handleRelease = async (dispute: any) => {
    if (!confirm(`Release ₦${dispute.amount?.toLocaleString()} to provider?`)) return;
    setActionId(dispute.id);
    try {
      const res = await fetch("/api/paystack/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: dispute.bookingId,
          providerId: dispute.providerId,
          amount: dispute.amount,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      await updateDoc(doc(db, "disputes", dispute.id), {
        status: "resolved",
        resolution: "released_to_provider",
        resolvedAt: serverTimestamp(),
      });
      toast.success("Funds released to provider");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to release funds");
    } finally {
      setActionId(null);
    }
  };

  const handleRefund = async (dispute: any) => {
    if (!confirm(`Refund ₦${dispute.amount?.toLocaleString()} to customer?`)) return;
    setActionId(dispute.id);
    try {
      const res = await fetch("/api/paystack/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: dispute.bookingId,
          customerId: dispute.customerId,
          reason: `Admin resolved dispute: ${dispute.reason}`,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      await updateDoc(doc(db, "disputes", dispute.id), {
        status: "resolved",
        resolution: "refunded_to_customer",
        resolvedAt: serverTimestamp(),
      });
      toast.success("Customer refunded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to refund");
    } finally {
      setActionId(null);
    }
  };

  const handleMarkUnderReview = async (disputeId: string) => {
    await updateDoc(doc(db, "disputes", disputeId), {
      status: "under_review",
      updatedAt: serverTimestamp(),
    });
    toast.success("Marked as under review");
  };

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Disputes</h1>
          <span className="ml-auto text-xs bg-red-100 text-red-700 font-semibold px-2 py-1 rounded-full">
            {disputes.filter(d => d.status === "open").length} Open
          </span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-4">
        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-6">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? "bg-[#FF8C00] text-white"
                  : "bg-white text-gray-600 border border-gray-200"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#FF8C00]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="rounded-full bg-gray-50 p-8 mb-4">
              <AlertTriangle className="h-10 w-10 text-gray-200" />
            </div>
            <h3 className="text-base font-semibold text-gray-700">No disputes at this time</h3>
            <p className="text-sm text-gray-400 mt-1">All clear! No {activeTab.toLowerCase()} disputes.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((dispute) => (
              <div key={dispute.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                {/* Top row */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs text-gray-400 font-medium">
                      Booking #{dispute.bookingId?.slice(-8).toUpperCase()}
                    </p>
                    <p className="text-lg font-bold text-gray-900 mt-0.5">
                      ₦{dispute.amount?.toLocaleString()}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[dispute.status] || "bg-gray-100 text-gray-600"}`}>
                    {dispute.status?.replace("_", " ")}
                  </span>
                </div>

                {/* Reason */}
                <div className="bg-gray-50 rounded-xl p-3 mb-4">
                  <p className="text-xs font-semibold text-gray-500 mb-1">Dispute Reason</p>
                  <p className="text-sm text-gray-700">{dispute.reason}</p>
                </div>

                {/* Date */}
                <p className="text-xs text-gray-400 mb-4">
                  Raised {dispute.createdAt?.toDate ? format(dispute.createdAt.toDate(), "MMM d, yyyy 'at' h:mm a") : "—"}
                </p>

                {/* Actions */}
                {dispute.status !== "resolved" && (
                  <div className="flex gap-2 flex-wrap">
                    {dispute.status === "open" && (
                      <button
                        onClick={() => handleMarkUnderReview(dispute.id)}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-yellow-50 text-yellow-700 rounded-xl border border-yellow-200 hover:bg-yellow-100 transition-colors"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Mark Under Review
                      </button>
                    )}
                    <button
                      onClick={() => handleRelease(dispute)}
                      disabled={actionId === dispute.id}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-green-50 text-green-700 rounded-xl border border-green-200 hover:bg-green-100 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      {actionId === dispute.id ? "Processing..." : "Release to Provider"}
                    </button>
                    <button
                      onClick={() => handleRefund(dispute)}
                      disabled={actionId === dispute.id}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-red-50 text-red-700 rounded-xl border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {actionId === dispute.id ? "Processing..." : "Refund Customer"}
                    </button>
                  </div>
                )}

                {dispute.status === "resolved" && (
                  <p className="text-xs font-semibold text-green-600">
                    ✓ Resolved — {dispute.resolution === "released_to_provider" ? "Funds released to provider" : "Customer refunded"}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

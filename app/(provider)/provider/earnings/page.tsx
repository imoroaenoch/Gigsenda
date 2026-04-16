"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, TrendingUp, Wallet, Clock, CheckCircle, AlertCircle, Banknote } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import AuthGuard from "@/components/auth/AuthGuard";
import ProviderBottomNav from "@/components/provider/ProviderBottomNav";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { format, isThisMonth, addHours } from "date-fns";
import { getSettingSection } from "@/lib/admin-settings";

export default function ProviderEarningsPage() {
  const router     = useRouter();
  const { user }   = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [commissionRate, setCommissionRate] = useState(0.1); // Default fallback

  useEffect(() => {
    // Fetch commission settings
    const fetchCommissionSettings = async () => {
      try {
        const commissionSettings = await getSettingSection("commission");
        if (commissionSettings && commissionSettings.percentage) {
          setCommissionRate(commissionSettings.percentage / 100); // Convert percentage to decimal
        }
      } catch (error) {
        console.error("Error fetching commission settings:", error);
        // Continue with default commission rate
      }
    };

    fetchCommissionSettings();
  }, []);

  useEffect(() => {
    if (!user?.uid) return;
    
    // Fetch transactions instead of bookings for better payment tracking
    const q = query(collection(db, "transactions"), where("providerId", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a: any, b: any) => {
          const ta = a.createdAt?.toDate?.()?.getTime() ?? 0;
          const tb = b.createdAt?.toDate?.()?.getTime() ?? 0;
          return tb - ta;
        });
      setTransactions(data);
      setLoading(false);
    });
    return () => unsub();
  }, [user?.uid]);

  const completedTransactions = transactions.filter((t: any) => t.status === "success");
  const pendingTransactions = transactions.filter((t: any) => t.settlementStatus === "pending");

  const totalGross    = completedTransactions.reduce((s: number, t: any) => s + (t.totalAmount || 0), 0);
  const totalNet      = completedTransactions.reduce((s: number, t: any) => s + (t.providerAmount || 0), 0);
  const pendingSettlement = pendingTransactions.reduce((s: number, t: any) => s + (t.providerAmount || 0), 0);
  const settledAmount = completedTransactions
    .filter((t: any) => t.settlementStatus === "settled")
    .reduce((s: number, t: any) => s + (t.providerAmount || 0), 0);

  const thisMonthNet = Math.round(
    completedTransactions
      .filter((t: any) => {
        const d = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt);
        return isThisMonth(d);
      })
      .reduce((s: number, t: any) => s + (t.providerAmount || 0), 0)
  );

  const fmtDate = (ts: any) => {
    if (!ts) return "—";
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return format(d, "MMM d, yyyy");
  };

  return (
    <AuthGuard>
      <main className="min-h-screen bg-[#FFF8F0] pb-28 lg:pb-8 overflow-x-hidden">

        {/* Header */}
        <header className="sticky top-0 z-50 bg-[#FFF8F0] px-5 pt-5 pb-5 border-b border-orange-100 lg:pt-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm border border-gray-100 active:scale-95 transition-all"
            >
              <ArrowLeft className="h-5 w-5 text-text" />
            </button>
            <div>
              <h1 className="text-[20px] font-black text-text">Earnings</h1>
              <p className="text-[11px] font-bold text-text-light">{completedTransactions.length} completed transaction{completedTransactions.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
        </header>

        {/* Summary cards */}
        <section className="px-5 lg:max-w-4xl lg:mx-auto">
          <div className="rounded-[2rem] bg-gradient-to-br from-[#FF9A3E] to-[#FF8C00] p-5 shadow-xl shadow-primary/20">
            <p className="text-[11px] font-black text-white/70 uppercase tracking-widest">Total Earned</p>
            <p className="text-[36px] font-black text-white mt-1 leading-tight">
              ₦{loading ? "—" : totalNet.toLocaleString()}
            </p>
            <p className="text-[11px] font-bold text-white/60 mt-1">After 10% Gigsenda commission</p>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-3">
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-xl bg-green-50 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
                <p className="text-[10px] font-black text-text-light uppercase tracking-wider">This Month</p>
              </div>
              <p className="text-[20px] font-black text-text">₦{loading ? "—" : thisMonthNet.toLocaleString()}</p>
            </div>

            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-xl bg-yellow-50 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-yellow-500" />
                </div>
                <p className="text-[10px] font-black text-text-light uppercase tracking-wider">Pending</p>
              </div>
              <p className="text-[20px] font-black text-text">₦{loading ? "—" : pendingSettlement.toLocaleString()}</p>
            </div>

            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Banknote className="h-4 w-4 text-blue-500" />
                </div>
                <p className="text-[10px] font-black text-text-light uppercase tracking-wider">Settled</p>
              </div>
              <p className="text-[20px] font-black text-text">₦{loading ? "—" : settledAmount.toLocaleString()}</p>
            </div>
          </div>
        </section>

        {/* Transaction list */}
        <section className="px-5 mt-7">
          <h2 className="text-[14px] font-black text-text mb-3">All Transactions</h2>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-16 rounded-2xl bg-white border border-gray-100 animate-pulse" />
              ))}
            </div>
          ) : completedTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-14 text-center">
              <Wallet className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-[13px] font-black text-text-light">No completed transactions yet</p>
              <p className="text-[11px] font-bold text-gray-400 mt-1">Earnings appear after payments are processed</p>
            </div>
          ) : (
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
              {/* Table header */}
              <div className="grid grid-cols-4 px-4 py-2 bg-gray-50">
                <span className="text-[9px] font-black text-text-light uppercase tracking-wider">Customer</span>
                <span className="text-[9px] font-black text-text-light uppercase tracking-wider">Service</span>
                <span className="text-[9px] font-black text-text-light uppercase tracking-wider text-center">Net ₦</span>
                <span className="text-[9px] font-black text-text-light uppercase tracking-wider text-right">Status</span>
              </div>

              {completedTransactions.map((t: any) => {
                const gross = t.totalAmount || 0;
                const comm  = t.commission || 0;
                const net   = t.providerAmount || 0;
                const isPending = t.settlementStatus === "pending";
                const isSettled = t.settlementStatus === "settled";
                
                return (
                  <div key={t.id} className="px-4 py-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-black text-text truncate">{t.customerName || "Customer"}</p>
                        <p className="text-[10px] font-bold text-text-light">{fmtDate(t.createdAt)}</p>
                        <p className="text-[10px] font-bold text-text-light">{t.serviceName}</p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <p className="text-[14px] font-black text-green-600">₦{net.toLocaleString()}</p>
                        <p className="text-[9px] font-bold text-gray-400">Gross ₦{gross.toLocaleString()}</p>
                        <p className="text-[9px] font-bold text-red-400">-₦{comm.toLocaleString()} fee</p>
                      </div>
                      <div className="flex flex-col items-end justify-center ml-3">
                        {isPending ? (
                          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-50 border border-yellow-100">
                            <Clock className="h-3 w-3 text-yellow-600" />
                            <span className="text-[9px] font-black text-yellow-600 uppercase tracking-wider">Pending</span>
                          </div>
                        ) : isSettled ? (
                          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-50 border border-green-100">
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            <span className="text-[9px] font-black text-green-600 uppercase tracking-wider">Settled</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-gray-50 border border-gray-100">
                            <AlertCircle className="h-3 w-3 text-gray-600" />
                            <span className="text-[9px] font-black text-gray-600 uppercase tracking-wider">Processing</span>
                          </div>
                        )}
                        {isPending && t.expectedSettlementDate && (
                          <p className="text-[8px] font-bold text-gray-400 mt-1">
                            By {fmtDate(t.expectedSettlementDate)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Settlement note */}
          <div className="mt-4 rounded-xl bg-blue-50 border border-blue-100 px-4 py-3">
            <p className="text-[11px] font-bold text-blue-700 leading-relaxed">
              💳 Payments are settled to your bank account within 24-48 business hours by Paystack. "Pending" transactions are being processed and will appear as "Settled" once transferred to your bank.
            </p>
          </div>

          {/* Commission note */}
          <div className="mt-3 rounded-xl bg-orange-50 border border-orange-100 px-4 py-3">
            <p className="text-[11px] font-bold text-primary leading-relaxed">
              ℹ️ Gigsenda deducts a <span className="font-black">{(commissionRate * 100).toFixed(1)}% commission</span> from each completed booking. All amounts shown are your net earnings after deduction.
            </p>
          </div>
        </section>

        <ProviderBottomNav />
      </main>
    </AuthGuard>
  );
}

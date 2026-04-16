"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { getAllTransactions } from "@/lib/admin";
import { collection, query, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getSettingSection } from "@/lib/admin-settings";
import { 
  Search, 
  DollarSign, 
  TrendingUp, 
  ArrowUpRight, 
  Download, 
  Filter, 
  CheckCircle2, 
  Clock, 
  CreditCard,
  PieChart,
  Briefcase,
  User as UserIcon,
  Banknote,
  AlertCircle
} from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";

export default function AdminPayments() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
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
    // Fetch transactions from the new transactions collection
    const q = query(collection(db, "transactions"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((t: any) => t.status === "success") // Only show successful transactions
        .sort((a: any, b: any) => {
          const ta = a.createdAt?.toDate?.()?.getTime() ?? 0;
          const tb = b.createdAt?.toDate?.()?.getTime() ?? 0;
          return tb - ta;
        });
      setTransactions(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching transactions:", error);
      toast.error("Failed to load transactions");
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const totalRevenue = transactions.reduce((acc, t) => acc + (t.totalAmount || 0), 0);
  const totalCommission = transactions.reduce((acc, t) => acc + (t.commission || 0), 0);
  const totalPayouts = transactions.reduce((acc, t) => acc + (t.providerAmount || 0), 0);

  const filteredTransactions = transactions.filter(t => 
    t.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.providerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-medium text-text tracking-tight">Payments & Commission</h1>
          <p className="text-sm font-medium text-text-light mt-1 uppercase tracking-wider">Track marketplace revenue and provider payouts</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-2xl border border-gray-100 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all min-w-[320px]">
            <Search className="h-4 w-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search customers, providers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-sm font-medium w-full placeholder:text-gray-400"
            />
          </div>
          <button
            onClick={() => {
              if (filteredTransactions.length === 0) { toast.error("No transactions to export."); return; }
              const rows = [
                ["ID", "Customer", "Provider", "Amount", "Commission", "Payout", "Date"],
                ...filteredTransactions.map(t => [
                  t.id, t.customerName, t.providerName,
                  t.amount, t.commission, t.providerPayout,
                  format(t.createdAt, "yyyy-MM-dd")
                ])
              ];
              const csv = rows.map(r => r.join(",")).join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url; a.download = "gigsenda-payments.csv"; a.click();
              URL.revokeObjectURL(url);
              toast.success("CSV downloaded!");
            }}
            className="flex h-[2.75rem] w-[2.75rem] items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20 active:scale-95 transition-all"
          >
            <Download className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { label: "Total Revenue", value: `₦${totalRevenue.toLocaleString()}`, icon: DollarSign, color: "bg-blue-500", detail: "Gross merchandise value" },
          { label: "Platform Commission", value: `₦${totalCommission.toLocaleString()}`, icon: TrendingUp, color: "bg-green-500", detail: `Your ${(commissionRate * 100).toFixed(1)}% earnings` },
          { label: "Provider Payouts", value: `₦${totalPayouts.toLocaleString()}`, icon: CreditCard, color: "bg-orange-500", detail: `Providers' ${((1 - commissionRate) * 100).toFixed(1)}% share` },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm relative overflow-hidden group">
            <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full ${card.color} opacity-5 group-hover:scale-150 transition-transform duration-700`}></div>
            <div className="flex items-center justify-between mb-6">
              <div className={`h-12 w-12 rounded-2xl ${card.color} flex items-center justify-center text-white shadow-lg shadow-${card.color.split('-')[1]}-500/20`}>
                <card.icon className="h-6 w-6" />
              </div>
              <span className="text-[10px] font-medium text-text-light uppercase tracking-widest">{card.detail}</span>
            </div>
            <p className="text-[11px] font-medium text-text-light uppercase tracking-[0.15em] mb-1">{card.label}</p>
            <h3 className="text-3xl font-medium text-text tracking-tight">{card.value}</h3>
          </div>
        ))}
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-8 py-6 text-[10px] font-medium text-text-light uppercase tracking-widest">Transaction Info</th>
                <th className="px-8 py-6 text-[10px] font-medium text-text-light uppercase tracking-widest">Commission ({(commissionRate * 100).toFixed(1)}%)</th>
                <th className="px-8 py-6 text-[10px] font-medium text-text-light uppercase tracking-widest">Customer</th>
                <th className="px-8 py-6 text-[10px] font-medium text-text-light uppercase tracking-widest">Provider</th>
                <th className="px-8 py-6 text-[10px] font-medium text-text-light uppercase tracking-widest">Payment Breakdown</th>
                <th className="px-8 py-6 text-[10px] font-medium text-text-light uppercase tracking-widest">Provider Bank</th>
                <th className="px-8 py-6 text-[10px] font-medium text-text-light uppercase tracking-widest">Settlement Status</th>
                <th className="px-8 py-6 text-[10px] font-medium text-text-light uppercase tracking-widest text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-8 py-20 text-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
                    <p className="text-sm font-medium text-text-light uppercase tracking-widest">Loading transactions...</p>
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-8 py-20 text-center">
                    <div className="h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-300 border border-gray-100">
                      <CreditCard className="h-8 w-8" />
                    </div>
                    <h3 className="text-lg font-medium text-text">No transactions found</h3>
                    <p className="text-sm font-medium text-text-light mt-1">Transactions will appear here after job completion</p>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((t) => {
                  const totalAmount = t.totalAmount || 0;
                  const commission = t.commission || 0;
                  const providerAmount = t.providerAmount || 0;
                  const isPending = t.settlementStatus === "pending";
                  const isSettled = t.settlementStatus === "settled";
                  const commissionRate = totalAmount > 0 ? ((commission / totalAmount) * 100).toFixed(1) : "10.0";
                  
                  return (
                    <tr key={t.id} className="group hover:bg-gray-50/30 transition-all">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-green-50 flex items-center justify-center text-green-600 border border-green-100">
                            <CheckCircle2 className="h-4 w-4" />
                          </div>
                          <p className="text-[11px] font-medium text-text-light uppercase tracking-wider">#{t.reference?.slice(0, 8).toUpperCase() || t.id.slice(0, 8).toUpperCase()}</p>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-sm font-medium text-text leading-tight">{t.customerName}</p>
                        <p className="text-[10px] font-medium text-text-light mt-1">{t.customerEmail}</p>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-sm font-medium text-text">{t.providerName}</p>
                        <p className="text-[10px] font-medium text-text-light mt-1">{t.serviceName}</p>
                      </td>
                      <td className="px-8 py-6">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-medium text-gray-400">Customer paid:</span>
                            <span className="text-sm font-medium text-text">₦{totalAmount.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-medium text-green-600">Gigsenda earned:</span>
                            <span className="text-sm font-medium text-green-600">₦{commission.toLocaleString()} ({commissionRate}%)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-medium text-primary">Provider received:</span>
                            <span className="text-sm font-medium text-primary">₦{providerAmount.toLocaleString()}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-text">{t.providerName}</p>
                          {t.providerSubaccountCode ? (
                            <>
                              <p className="text-[10px] font-medium text-text-light">Subaccount: {t.providerSubaccountCode}</p>
                              <p className="text-[10px] font-medium text-gray-400">**** **** ****</p>
                            </>
                          ) : (
                            <p className="text-[10px] font-medium text-red-600">No subaccount</p>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        {isPending ? (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-yellow-500" />
                            <div>
                              <p className="text-sm font-medium text-yellow-600">Pending</p>
                              <p className="text-[9px] font-medium text-gray-400">Settling to bank</p>
                            </div>
                          </div>
                        ) : isSettled ? (
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <div>
                              <p className="text-sm font-medium text-green-600">Settled</p>
                              <p className="text-[9px] font-medium text-gray-400">Transferred</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-gray-500" />
                            <div>
                              <p className="text-sm font-medium text-gray-600">Processing</p>
                              <p className="text-[9px] font-medium text-gray-400">In progress</p>
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex flex-col items-end">
                          <p className="text-xs font-medium text-text">{format(t.createdAt, "MMM dd, yyyy")}</p>
                          <p className="text-[10px] font-medium text-text-light mt-0.5 uppercase tracking-wider">{format(t.createdAt, "hh:mm a")}</p>
                          {t.expectedSettlementDate && isPending && (
                            <p className="text-[9px] font-medium text-yellow-600 mt-1">
                              Expected: {format(t.expectedSettlementDate, "MMM dd")}
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

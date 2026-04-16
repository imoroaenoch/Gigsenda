"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { getAllCustomers, banCustomer, unbanCustomer, flagCustomer } from "@/lib/admin";
import {
  Search, User as UserIcon, Mail, MapPin, MoreVertical,
  Flag, Ban, CheckCircle2, X, AlertCircle, ShieldOff,
} from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";
import { format } from "date-fns";

export default function AdminCustomers() {
  const router = useRouter();
  const [customers, setCustomers]       = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [searchTerm, setSearchTerm]     = useState("");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos]           = useState({ top: 0, left: 0 });
  const [actionId, setActionId]         = useState<string | null>(null);

  // Flag modal state
  const [flagTarget, setFlagTarget]     = useState<any>(null);
  const [flagReason, setFlagReason]     = useState("");

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchCustomers(); }, []);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setActiveMenuId(null);
    };
    document.addEventListener("mousedown", close);
    window.addEventListener("scroll", () => setActiveMenuId(null), true);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", () => setActiveMenuId(null), true);
    };
  }, []);

  async function fetchCustomers() {
    setLoading(true);
    try {
      const customersData = await getAllCustomers();
      setCustomers(customersData);
    } catch {
      toast.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  }

  const handleBanToggle = async (customer: any) => {
    setActionId(customer.id);
    setActiveMenuId(null);
    try {
      if (customer.isBanned) {
        await unbanCustomer(customer.id);
        toast.success(`${customer.name} has been reinstated`);
      } else {
        await banCustomer(customer.id);
        toast.success(`${customer.name} has been suspended`);
      }
      setCustomers(prev => prev.map(c => c.id === customer.id ? { ...c, isBanned: !c.isBanned } : c));
    } catch {
      toast.error("Action failed");
    } finally {
      setActionId(null);
    }
  };

  const handleFlag = async () => {
    if (!flagReason.trim()) { toast.error("Please provide a reason"); return; }
    setActionId(flagTarget.id);
    try {
      await flagCustomer(flagTarget.id, flagReason);
      toast.success(`${flagTarget.name} has been flagged`);
      setCustomers(prev => prev.map(c => c.id === flagTarget.id ? { ...c, isFlagged: true, flagReason } : c));
      setFlagTarget(null);
      setFlagReason("");
    } catch {
      toast.error("Failed to flag customer");
    } finally {
      setActionId(null);
    }
  };

  const filtered = customers.filter(c =>
    (c.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.email || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-black text-text tracking-tight">Customer Management</h1>
          <p className="text-sm font-bold text-text-light mt-1 uppercase tracking-wider">Monitor and manage marketplace users</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-2xl border border-gray-100 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all min-w-[320px]">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search name, email..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-sm font-bold w-full placeholder:text-gray-400"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-8 py-6 text-[10px] font-black text-text-light uppercase tracking-widest whitespace-nowrap">Customer</th>
                <th className="px-8 py-6 text-[10px] font-black text-text-light uppercase tracking-widest whitespace-nowrap">Email Address</th>
                <th className="px-8 py-6 text-[10px] font-black text-text-light uppercase tracking-widest whitespace-nowrap">Location</th>
                <th className="px-8 py-6 text-[10px] font-black text-text-light uppercase tracking-widest text-center whitespace-nowrap">Status</th>
                <th className="px-8 py-6 text-[10px] font-black text-text-light uppercase tracking-widest text-right whitespace-nowrap">Joined</th>
                <th className="px-8 py-6 text-[10px] font-black text-text-light uppercase tracking-widest text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
                    <p className="text-sm font-bold text-text-light uppercase tracking-widest">Loading customers...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <div className="h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-300 border border-gray-100">
                      <UserIcon className="h-8 w-8" />
                    </div>
                    <h3 className="text-lg font-black text-text">No customers found</h3>
                    <p className="text-sm font-bold text-text-light mt-1">Try adjusting your search</p>
                  </td>
                </tr>
              ) : filtered.map(customer => (
                <tr key={customer.id} className="group hover:bg-gray-50/30 transition-all">
                  {/* Name */}
                  <td className="px-8 py-6 whitespace-nowrap">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="relative h-12 w-12 rounded-2xl overflow-hidden border border-gray-100 bg-gray-50 flex-shrink-0">
                        {customer.photoURL
                          ? <Image src={customer.photoURL} alt={customer.name || ""} fill className="object-cover" />
                          : <div className="h-full w-full flex items-center justify-center text-gray-400"><UserIcon className="h-6 w-6" /></div>
                        }
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-text truncate">{customer.name}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          {customer.isFlagged && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-50 px-1.5 py-0.5 text-[8px] font-black text-orange-500 border border-orange-100 whitespace-nowrap">
                              <Flag className="h-2.5 w-2.5" /> Flagged
                            </span>
                          )}
                          <p className="text-[10px] font-bold text-text-light uppercase tracking-tight truncate">@{(customer.name || "").toLowerCase().replace(/\s/g, "")}</p>
                        </div>
                      </div>
                    </div>
                  </td>
                  {/* Email */}
                  <td className="px-8 py-6 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-text-light min-w-0">
                      <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="text-sm font-bold truncate">{customer.email}</span>
                    </div>
                  </td>
                  {/* Location */}
                  <td className="px-8 py-6 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-text-light min-w-0">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="text-sm font-bold truncate">{customer.city || "Lagos, Nigeria"}</span>
                    </div>
                  </td>
                  {/* Status */}
                  <td className="px-8 py-6 text-center whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-tight whitespace-nowrap ${
                      customer.isBanned ? "bg-red-50 text-red-600 border border-red-100" : "bg-green-50 text-green-600 border border-green-100"
                    }`}>
                      {customer.isBanned ? <Ban className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                      {customer.isBanned ? "Suspended" : "Active"}
                    </span>
                  </td>
                  {/* Joined */}
                  <td className="px-8 py-6 text-right whitespace-nowrap">
                    <div className="text-right">
                      <p className="text-xs font-black text-text">
                        {customer.createdAt ? format(customer.createdAt.toDate(), "MMM dd, yyyy") : "N/A"}
                      </p>
                      <p className="text-[10px] font-bold text-text-light uppercase tracking-wider">
                        {customer.createdAt ? format(customer.createdAt.toDate(), "hh:mm a") : "Recently"}
                      </p>
                    </div>
                  </td>
                  {/* Actions */}
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
                      {/* Flag button */}
                      <button
                        disabled={customer.isFlagged || actionId === customer.id}
                        onClick={() => { setFlagTarget(customer); setFlagReason(""); }}
                        className="flex items-center gap-1.5 rounded-xl bg-orange-50 px-4 py-2.5 text-[10px] font-black text-orange-500 border border-orange-100 hover:bg-orange-100 transition-all active:scale-95 disabled:opacity-40"
                      >
                        <Flag className="h-3.5 w-3.5" />
                        {customer.isFlagged ? "Flagged" : "Flag"}
                      </button>
                      {/* ⋮ menu */}
                      <div className="relative">
                        <button
                          onClick={e => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setMenuPos({ top: rect.bottom + window.scrollY + 8, left: rect.left + window.scrollX - 180 });
                            setActiveMenuId(activeMenuId === customer.id ? null : customer.id);
                          }}
                          className={`p-2 rounded-xl transition-all ${activeMenuId === customer.id ? "bg-primary/10 text-primary" : "text-text-light hover:bg-gray-100"}`}
                        >
                          <MoreVertical className="h-5 w-5" />
                        </button>

                        {activeMenuId === customer.id && typeof document !== "undefined" && createPortal(
                          <div
                            ref={menuRef}
                            style={{ position: "absolute", top: menuPos.top, left: menuPos.left, width: 210 }}
                            className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 z-[9999] animate-in fade-in zoom-in duration-200"
                          >
                            <button
                              onClick={() => { 
                                router.push(`/admin/customers/${customer.id}`); 
                                setActiveMenuId(null); 
                              }}
                              className="flex w-full items-center gap-3 px-4 py-2.5 rounded-xl text-[11px] font-black text-text-light hover:bg-gray-50 hover:text-text transition-all uppercase tracking-widest"
                            >
                              <UserIcon className="h-4 w-4" /> View Profile
                            </button>
                            <button
                              onClick={() => { 
                                router.push(`/admin/customers/${customer.id}/bookings`); 
                                setActiveMenuId(null); 
                              }}
                              className="flex w-full items-center gap-3 px-4 py-2.5 rounded-xl text-[11px] font-black text-text-light hover:bg-gray-50 hover:text-text transition-all uppercase tracking-widest"
                            >
                              <AlertCircle className="h-4 w-4" /> View Bookings
                            </button>
                            <div className="h-px bg-gray-50 my-1" />
                            <button
                              disabled={actionId === customer.id}
                              onClick={() => { setActiveMenuId(null); handleBanToggle(customer); }}
                              className={`flex w-full items-center gap-3 px-4 py-2.5 rounded-xl text-[11px] font-black transition-all uppercase tracking-widest disabled:opacity-40 ${
                                customer.isBanned ? "text-green-600 hover:bg-green-50" : "text-red-500 hover:bg-red-50"
                              }`}
                            >
                              {customer.isBanned
                                ? <><CheckCircle2 className="h-4 w-4" /> Reinstate User</>
                                : <><ShieldOff className="h-4 w-4" /> Suspend User</>
                              }
                            </button>
                          </div>,
                          document.body
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Flag Modal ──────────────────────────────────────────────────── */}
      {flagTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
          <div className="w-full max-w-md animate-in fade-in zoom-in duration-300 rounded-[2.5rem] bg-white p-10 shadow-2xl border border-gray-100">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-12 w-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-500">
                <Flag className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-black text-text">Flag Customer</h2>
                <p className="text-[11px] font-bold text-text-light">{flagTarget.name}</p>
              </div>
            </div>
            <p className="text-sm font-bold text-text-light mb-6 leading-relaxed">
              Flagging marks this account for review. The customer will <span className="font-black text-text">not</span> be notified. Provide a reason below.
            </p>
            <div className="space-y-4">
              <textarea
                value={flagReason}
                onChange={e => setFlagReason(e.target.value)}
                placeholder="e.g. Suspicious activity, multiple complaints..."
                rows={3}
                className="w-full rounded-2xl bg-gray-50 border border-gray-100 p-4 text-sm font-bold text-text outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-300 transition-all resize-none"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setFlagTarget(null)}
                  className="flex-1 rounded-2xl bg-gray-50 py-4 text-[11px] font-black text-text-light hover:bg-gray-100 transition-all active:scale-95 uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFlag}
                  disabled={actionId === flagTarget.id}
                  className="flex-1 rounded-2xl bg-orange-500 py-4 text-[11px] font-black text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all active:scale-95 disabled:opacity-60 uppercase tracking-widest"
                >
                  {actionId === flagTarget.id ? "Flagging..." : "Flag Account"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

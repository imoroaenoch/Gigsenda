"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { getAllBookings, adminUpdateBookingStatus } from "@/lib/admin";
import {
  Search, Calendar, Clock, MoreVertical, CheckCircle2,
  XCircle, User as UserIcon, ChevronRight, Download, X,
  Briefcase, Phone, MapPin,
} from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";
import { format } from "date-fns";

const STATUS_STYLES: Record<string, string> = {
  completed: "bg-green-50 text-green-600 border border-green-100",
  cancelled:  "bg-red-50 text-red-600 border border-red-100",
  upcoming:   "bg-blue-50 text-blue-600 border border-blue-100",
  pending:    "bg-yellow-50 text-yellow-600 border border-yellow-100",
};

export default function AdminBookings() {
  const [bookings, setBookings]           = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);
  const [searchTerm, setSearchTerm]       = useState("");
  const [statusFilter, setStatusFilter]   = useState("all");
  const [detailBooking, setDetailBooking] = useState<any>(null);
  const [activeMenuId, setActiveMenuId]   = useState<string | null>(null);
  const [menuPos, setMenuPos]             = useState({ top: 0, left: 0 });
  const [actionId, setActionId]           = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchBookings();
  }, []);

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

  async function fetchBookings() {
    setLoading(true);
    try {
      setBookings(await getAllBookings());
    } catch {
      toast.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }

  const handleStatusChange = async (bookingId: string, status: "upcoming" | "completed" | "cancelled") => {
    setActionId(bookingId);
    setActiveMenuId(null);
    try {
      await adminUpdateBookingStatus(bookingId, status);
      toast.success(`Booking marked as ${status}`);
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status } : b));
      if (detailBooking?.id === bookingId) setDetailBooking((prev: any) => ({ ...prev, status }));
    } catch {
      toast.error("Failed to update status");
    } finally {
      setActionId(null);
    }
  };

  const filtered = bookings.filter(b => {
    const q = searchTerm.toLowerCase();
    const matchSearch = (b.customerName || "").toLowerCase().includes(q) ||
                        (b.providerName || "").toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-medium text-text tracking-tight">Booking Control</h1>
          <p className="text-sm font-medium text-text-light mt-1 uppercase tracking-wider">Monitor and manage all service bookings</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-2xl border border-gray-100 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all min-w-[280px]">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search customers, providers..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-sm font-medium w-full placeholder:text-gray-400"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-white px-5 py-2.5 rounded-2xl border border-gray-100 shadow-sm text-sm font-medium text-text outline-none cursor-pointer hover:bg-gray-50 transition-all"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="upcoming">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button
            onClick={() => toast("Export coming soon")}
            className="flex h-[2.75rem] w-[2.75rem] items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20 active:scale-95 transition-all"
          >
            <Download className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-8 py-6 text-[10px] font-medium text-text-light uppercase tracking-widest">Customer</th>
                <th className="px-8 py-6 text-[10px] font-medium text-text-light uppercase tracking-widest">Service Provider</th>
                <th className="px-8 py-6 text-[10px] font-medium text-text-light uppercase tracking-widest">Date</th>
                <th className="px-8 py-6 text-[10px] font-medium text-text-light uppercase tracking-widest text-center">Price</th>
                <th className="px-8 py-6 text-[10px] font-medium text-text-light uppercase tracking-widest">Status</th>
                <th className="px-8 py-6 text-[10px] font-medium text-text-light uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
                    <p className="text-sm font-medium text-text-light uppercase tracking-widest">Loading bookings...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <div className="h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-300 border border-gray-100">
                      <Calendar className="h-8 w-8" />
                    </div>
                    <h3 className="text-lg font-medium text-text">No bookings found</h3>
                    <p className="text-sm font-medium text-text-light mt-1">Try adjusting your search or filters</p>
                  </td>
                </tr>
              ) : filtered.map(booking => (
                <tr key={booking.id} className="group hover:bg-gray-50/30 transition-all">
                  {/* Customer */}
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="relative h-10 w-10 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 flex-shrink-0">
                        {booking.customerPhoto
                          ? <Image src={booking.customerPhoto} alt={booking.customerName || ""} fill className="object-cover" />
                          : <div className="h-full w-full flex items-center justify-center text-gray-400"><UserIcon className="h-5 w-5" /></div>
                        }
                      </div>
                      <p className="text-sm font-medium text-text">{booking.customerName || "—"}</p>
                    </div>
                  </td>
                  {/* Provider */}
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-primary/30 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-text">{booking.providerName || "—"}</p>
                        <p className="text-[10px] font-medium text-text-light uppercase tracking-tight">{booking.category}</p>
                      </div>
                    </div>
                  </td>
                  {/* Date */}
                  <td className="px-8 py-6">
                    <p className="text-sm font-medium text-text">{format(booking.date, "MMM dd, yyyy")}</p>
                    <p className="text-[10px] font-medium text-text-light mt-0.5 uppercase tracking-wider">{format(booking.date, "hh:mm a")}</p>
                  </td>
                  {/* Price */}
                  <td className="px-8 py-6 text-center">
                    <span className="text-sm font-medium text-primary">₦{(booking.price || 0).toLocaleString()}</span>
                  </td>
                  {/* Status */}
                  <td className="px-8 py-6">
                    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-medium uppercase tracking-tight ${STATUS_STYLES[booking.status] || STATUS_STYLES.upcoming}`}>
                      {booking.status === "completed" ? <CheckCircle2 className="h-3.5 w-3.5" /> :
                       booking.status === "cancelled"  ? <XCircle className="h-3.5 w-3.5" /> :
                       <Clock className="h-3.5 w-3.5" />}
                      {booking.status}
                    </span>
                  </td>
                  {/* Actions */}
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
                      {/* Details button */}
                      <button
                        onClick={() => setDetailBooking(booking)}
                        className="flex items-center gap-1.5 rounded-xl bg-gray-50 px-4 py-2.5 text-[10px] font-medium text-text border border-gray-100 hover:bg-primary/5 hover:text-primary hover:border-primary/10 transition-all active:scale-95"
                      >
                        Details <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                      {/* ⋮ menu */}
                      <div className="relative">
                        <button
                          onClick={e => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setMenuPos({ top: rect.bottom + window.scrollY + 8, left: rect.left + window.scrollX - 170 });
                            setActiveMenuId(activeMenuId === booking.id ? null : booking.id);
                          }}
                          className={`p-2 rounded-xl transition-all ${activeMenuId === booking.id ? "bg-primary/10 text-primary" : "text-text-light hover:bg-gray-100"}`}
                        >
                          <MoreVertical className="h-5 w-5" />
                        </button>

                        {activeMenuId === booking.id && typeof document !== "undefined" && createPortal(
                          <div
                            ref={menuRef}
                            style={{ position: "absolute", top: menuPos.top, left: menuPos.left, width: 200 }}
                            className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 z-[9999] animate-in fade-in zoom-in duration-200"
                          >
                            <p className="px-4 py-1.5 text-[9px] font-medium text-text-light uppercase tracking-widest">Change Status</p>
                            {(["upcoming", "completed", "cancelled"] as const).map(s => (
                              <button
                                key={s}
                                disabled={booking.status === s || actionId === booking.id}
                                onClick={() => handleStatusChange(booking.id, s)}
                                className={`flex w-full items-center gap-3 px-4 py-2.5 rounded-xl text-[11px] font-medium transition-all uppercase tracking-widest disabled:opacity-40 ${
                                  s === "completed" ? "text-green-600 hover:bg-green-50" :
                                  s === "cancelled"  ? "text-red-500 hover:bg-red-50" :
                                  "text-blue-600 hover:bg-blue-50"
                                }`}
                              >
                                {s === "completed" ? <CheckCircle2 className="h-4 w-4" /> :
                                 s === "cancelled"  ? <XCircle className="h-4 w-4" /> :
                                 <Clock className="h-4 w-4" />}
                                Mark {s}
                              </button>
                            ))}
                            <div className="h-px bg-gray-50 my-1" />
                            <button
                              onClick={() => { setDetailBooking(booking); setActiveMenuId(null); }}
                              className="flex w-full items-center gap-3 px-4 py-2.5 rounded-xl text-[11px] font-medium text-text-light hover:bg-gray-50 transition-all uppercase tracking-widest"
                            >
                              <Briefcase className="h-4 w-4" /> View Details
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

      {/* ── Booking Details Modal ─────────────────────────────────────── */}
      {detailBooking && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
          <div className="w-full max-w-lg animate-in fade-in zoom-in duration-300 rounded-[2.5rem] bg-white shadow-2xl border border-gray-100 overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-gray-50">
              <h2 className="text-lg font-medium text-text">Booking Details</h2>
              <button onClick={() => setDetailBooking(null)} className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-text-light hover:bg-gray-200 transition-all">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-8 py-6 space-y-5">
              {/* Status badge */}
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-medium uppercase tracking-tight ${STATUS_STYLES[detailBooking.status] || STATUS_STYLES.upcoming}`}>
                  {detailBooking.status === "completed" ? <CheckCircle2 className="h-3.5 w-3.5" /> :
                   detailBooking.status === "cancelled"  ? <XCircle className="h-3.5 w-3.5" /> :
                   <Clock className="h-3.5 w-3.5" />}
                  {detailBooking.status}
                </span>
                <span className="text-[11px] font-medium text-text-light">ID: {detailBooking.id?.slice(0, 8)}…</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-[10px] font-medium text-text-light uppercase tracking-widest mb-1">Customer</p>
                  <p className="text-sm font-medium text-text">{detailBooking.customerName || "—"}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-[10px] font-medium text-text-light uppercase tracking-widest mb-1">Provider</p>
                  <p className="text-sm font-medium text-text">{detailBooking.providerName || "—"}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-[10px] font-medium text-text-light uppercase tracking-widest mb-1">Service</p>
                  <p className="text-sm font-medium text-text">{detailBooking.servicePackage || detailBooking.category || "—"}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-[10px] font-medium text-text-light uppercase tracking-widest mb-1">Date & Time</p>
                  <p className="text-sm font-medium text-text">{format(detailBooking.date, "MMM d, yyyy")}</p>
                  <p className="text-[10px] font-medium text-text-light">{format(detailBooking.date, "hh:mm a")}</p>
                </div>
                <div className="rounded-2xl bg-primary/5 border border-primary/10 p-4">
                  <p className="text-[10px] font-medium text-text-light uppercase tracking-widest mb-1">Amount</p>
                  <p className="text-lg font-medium text-primary">₦{(detailBooking.price || 0).toLocaleString()}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-[10px] font-medium text-text-light uppercase tracking-widest mb-1">Commission (10%)</p>
                  <p className="text-sm font-medium text-green-600">₦{Math.round((detailBooking.price || 0) * 0.1).toLocaleString()}</p>
                </div>
              </div>

              {/* Status change buttons */}
              {detailBooking.status !== "completed" && detailBooking.status !== "cancelled" && (
                <div className="flex gap-3 pt-2">
                  <button
                    disabled={actionId === detailBooking.id}
                    onClick={() => handleStatusChange(detailBooking.id, "completed")}
                    className="flex-1 rounded-2xl bg-green-500 py-3.5 text-[11px] font-medium text-white shadow-lg shadow-green-500/20 active:scale-95 transition-all disabled:opacity-60"
                  >
                    ✓ Mark Completed
                  </button>
                  <button
                    disabled={actionId === detailBooking.id}
                    onClick={() => handleStatusChange(detailBooking.id, "cancelled")}
                    className="flex-1 rounded-2xl bg-red-50 border border-red-200 py-3.5 text-[11px] font-medium text-red-500 active:scale-95 transition-all disabled:opacity-60"
                  >
                    ✕ Cancel Booking
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

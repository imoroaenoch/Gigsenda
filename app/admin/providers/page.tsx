"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { getAllProviders, approveProvider, rejectProvider } from "@/lib/admin";
import { 
  Briefcase,
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  MoreVertical, 
  Clock,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Star,
  User as UserIcon
} from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";
import { format } from "date-fns";

export default function AdminProviders() {
  const router = useRouter();
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    // Handle scroll to reposition or close
    window.addEventListener("scroll", () => setActiveMenuId(null), true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", () => setActiveMenuId(null), true);
    };
  }, []);

  useEffect(() => {
    fetchProviders();
  }, []);

  async function fetchProviders() {
    setLoading(true);
    try {
      const data = await getAllProviders();
      setProviders(data);
    } catch (error) {
      console.error("Error fetching providers:", error);
      toast.error("Failed to load providers");
    } finally {
      setLoading(false);
    }
  }

  const handleApprove = async (uid: string) => {
    try {
      await approveProvider(uid);
      toast.success("Provider approved successfully");
      fetchProviders();
    } catch (error) {
      toast.error("Failed to approve provider");
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    try {
      await rejectProvider(selectedProvider.id, rejectionReason);
      toast.success("Provider rejected");
      setIsRejectModalOpen(false);
      setRejectionReason("");
      fetchProviders();
    } catch (error) {
      toast.error("Failed to reject provider");
    }
  };

  const getStatus = (p: any) => p.status || (p.isApproved ? "approved" : "pending");

  const filteredProviders = providers.filter(p => {
    const matchesSearch = (p.name || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (p.category || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === "all" || getStatus(p) === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-medium text-text tracking-tight">Provider Management</h1>
          <p className="text-xs font-medium text-text-light mt-0.5 uppercase tracking-wider">Review and manage service providers</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-gray-100 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all w-48">
            <Search className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <input 
              type="text" 
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-xs font-medium w-full placeholder:text-gray-400"
            />
          </div>
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="bg-white px-3 py-2 rounded-xl border border-gray-100 shadow-sm text-xs font-medium text-text outline-none cursor-pointer hover:bg-gray-50 transition-all shrink-0"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Providers Table */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-8 py-6 text-[10px] font-medium text-text-light uppercase tracking-widest">Provider</th>
                <th className="px-8 py-6 text-[10px] font-medium text-text-light uppercase tracking-widest">Category</th>
                <th className="px-8 py-6 text-[10px] font-medium text-text-light uppercase tracking-widest text-center">Experience</th>
                <th className="px-8 py-6 text-[10px] font-medium text-text-light uppercase tracking-widest text-center">Rating</th>
                <th className="px-8 py-6 text-[10px] font-medium text-text-light uppercase tracking-widest">Status</th>
                <th className="px-8 py-6 text-[10px] font-medium text-text-light uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-gray-100"></div>
                        <div className="space-y-2">
                          <div className="h-3 w-24 bg-gray-100 rounded"></div>
                          <div className="h-2 w-32 bg-gray-50 rounded"></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="h-6 w-20 bg-gray-100 rounded-full"></div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <div className="h-4 w-8 bg-gray-100 rounded mx-auto"></div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <div className="h-4 w-12 bg-gray-100 rounded mx-auto"></div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="h-6 w-24 bg-gray-100 rounded-full"></div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-2">
                        <div className="h-9 w-24 bg-gray-100 rounded-xl"></div>
                        <div className="h-9 w-9 bg-gray-100 rounded-xl"></div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : filteredProviders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <div className="h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-300 border border-gray-100">
                      <Briefcase className="h-8 w-8" />
                    </div>
                    <h3 className="text-lg font-medium text-text">No providers found</h3>
                    <p className="text-sm font-medium text-text-light mt-1">Try adjusting your search or filters</p>
                  </td>
                </tr>
              ) : (
                filteredProviders.map((provider, index) => (
                  <tr 
                    key={provider.id} 
                    className="group transition-all hover:bg-gray-50/30"
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="relative h-12 w-12 rounded-2xl overflow-hidden border border-gray-100 bg-gray-50">
                          {provider.photoURL ? (
                            <Image src={provider.photoURL} alt={provider.name} fill className="object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-gray-400">
                              <UserIcon className="h-6 w-6" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-text leading-tight">{provider.name}</p>
                          <p className="text-[10px] font-medium text-text-light mt-0.5 uppercase tracking-tight">{provider.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-text-light text-[9px] font-medium uppercase tracking-tight border border-gray-200">
                        {provider.category}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className="text-sm font-medium text-text">{provider.experience || "N/A"}</span>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Star className="h-3.5 w-3.5 fill-orange-400 text-orange-400" />
                        <span className="text-sm font-medium text-text">{provider.rating || "5.0"}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      {(() => {
                        const st = getStatus(provider);
                        return (
                          <span className={`inline-flex items-center gap-2 px-3 py-1.5 h-[26px] rounded-full text-[9px] font-medium uppercase tracking-tight transition-all ${
                            st === "approved"
                              ? "bg-green-50 text-green-600 border border-green-100"
                              : st === "rejected"
                              ? "bg-red-50 text-red-500 border border-red-100"
                              : "bg-blue-50 text-blue-600 border border-blue-100"
                          }`}>
                            {st === "approved" && <ShieldCheck className="h-3.5 w-3.5" />}
                            {st === "rejected" && <XCircle className="h-3.5 w-3.5" />}
                            {st === "pending" && <Clock className="h-3.5 w-3.5" />}
                            {st === "approved" ? "Approved" : st === "rejected" ? "Rejected" : "Pending"}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-3 transition-all opacity-100">
                        <button
                          onClick={() => router.push(`/admin/providers/${provider.id}`)}
                          className="flex items-center gap-1.5 rounded-xl bg-gray-50 border border-gray-100 px-4 py-2.5 text-[10px] font-medium text-text-light hover:bg-primary/5 hover:text-primary hover:border-primary/10 transition-all active:scale-95"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          View
                        </button>
                        {getStatus(provider) !== "approved" && (
                          <>
                            <button 
                              onClick={() => handleApprove(provider.id)}
                              className="flex items-center gap-1.5 rounded-xl bg-green-500 px-4 py-2.5 text-[10px] font-medium text-white shadow-lg shadow-green-500/20 active:scale-95 transition-all"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Approve
                            </button>
                            <button 
                              onClick={() => {
                                setSelectedProvider(provider);
                                setIsRejectModalOpen(true);
                              }}
                              className="flex items-center gap-1.5 rounded-xl bg-red-50 px-4 py-2.5 text-[10px] font-medium text-red-500 border border-red-100 hover:bg-red-500 hover:text-white transition-all active:scale-95"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Reject
                            </button>
                          </>
                        )}
                        <div className="relative">
                          <button 
                            ref={(el) => { buttonRef.current[provider.id] = el; }}
                            onClick={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setMenuPosition({ 
                                top: rect.bottom + window.scrollY, 
                                left: rect.left + window.scrollX - 160 // Offset left for menu width
                              });
                              setActiveMenuId(activeMenuId === provider.id ? null : provider.id);
                            }}
                            className={`p-2 rounded-xl transition-all ${
                              activeMenuId === provider.id ? "bg-primary/10 text-primary" : "text-text-light hover:bg-gray-100"
                            }`}
                          >
                            <MoreVertical className="h-5 w-5" />
                          </button>

                          {activeMenuId === provider.id && typeof document !== "undefined" && createPortal(
                            <div 
                              ref={menuRef}
                              style={{ 
                                position: 'absolute', 
                                top: `${menuPosition.top + 8}px`, 
                                left: `${menuPosition.left}px`,
                                width: '192px' 
                              }}
                              className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 z-[9999] animate-in fade-in zoom-in duration-200"
                            >
                              <button 
                                onClick={() => {
                                  router.push(`/admin/providers/${provider.id}`);
                                  setActiveMenuId(null);
                                }}
                                className="flex w-full items-center gap-3 px-4 py-2.5 rounded-xl text-[11px] font-medium text-text-light hover:bg-gray-50 hover:text-text transition-all uppercase tracking-widest"
                              >
                                <ExternalLink className="h-4 w-4" />
                                View Details
                              </button>
                              <button 
                                onClick={() => {
                                  toast.success("Opening chat with " + provider.name);
                                  // This could redirect to /admin/chat/${conversationId}
                                  setActiveMenuId(null);
                                }}
                                className="flex w-full items-center gap-3 px-4 py-2.5 rounded-xl text-[11px] font-medium text-text-light hover:bg-gray-50 hover:text-text transition-all uppercase tracking-widest"
                              >
                                <UserIcon className="h-4 w-4" />
                                Contact
                              </button>
                              <div className="h-px bg-gray-50 my-1"></div>
                              <button 
                                onClick={() => {
                                  setSelectedProvider(provider);
                                  setIsRejectModalOpen(true);
                                  setActiveMenuId(null);
                                }}
                                className="flex w-full items-center gap-3 px-4 py-2.5 rounded-xl text-[11px] font-medium text-red-500 hover:bg-red-50 transition-all uppercase tracking-widest"
                              >
                                <XCircle className="h-4 w-4" />
                                Reject
                              </button>
                            </div>,
                            document.body
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject Modal */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
          <div className="w-full max-w-md animate-in fade-in zoom-in duration-300 rounded-[2.5rem] bg-white p-10 shadow-2xl border border-gray-100">
            <div className="flex items-center gap-4 mb-8">
              <div className="h-12 w-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-500">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-medium text-text">Reject Provider</h2>
            </div>
            
            <p className="text-sm font-medium text-text-light mb-8 leading-relaxed">
              Are you sure you want to reject <span className="text-text font-medium">{selectedProvider?.name}</span>? Please provide a reason for the provider to see.
            </p>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-medium uppercase tracking-widest text-text-light pl-1">Reason for Rejection</label>
                <textarea 
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Identity document not clear..."
                  rows={4}
                  className="w-full rounded-2xl bg-gray-50 border border-gray-100 p-5 text-sm font-medium text-text outline-none focus:ring-4 focus:ring-red-500/5 focus:border-red-500/30 transition-all resize-none"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setIsRejectModalOpen(false)}
                  className="flex-1 rounded-2xl bg-gray-50 py-4 text-[11px] font-medium text-text-light hover:bg-gray-100 transition-all active:scale-95 uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleReject}
                  className="flex-1 rounded-2xl bg-red-500 py-4 text-[11px] font-medium text-white shadow-xl shadow-red-500/20 hover:bg-red-600 transition-all active:scale-95 uppercase tracking-widest"
                >
                  Reject Provider
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

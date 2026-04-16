"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { approveProvider, rejectProvider } from "@/lib/admin";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Clock,
  DollarSign,
  Calendar,
  FileText,
  ShieldCheck,
  XCircle,
  AlertCircle,
  CheckCircle2,
  Star,
  Zap,
  Image as ImageIcon,
} from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";
import { format } from "date-fns";

function InfoRow({ label, value, icon: Icon }: { label: string; value?: string | null; icon?: any }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      {Icon && (
        <div className="h-8 w-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 shrink-0 mt-0.5">
          <Icon className="h-4 w-4" />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-widest text-text-light">{label}</p>
        <p className="text-sm font-medium text-text mt-0.5 break-words">{value}</p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-8 py-5 border-b border-gray-50">
        <h2 className="text-xs font-medium text-text uppercase tracking-widest">{title}</h2>
      </div>
      <div className="px-8 py-6 space-y-5">{children}</div>
    </div>
  );
}

export default function AdminProviderDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [provider, setProvider] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchProvider();
  }, [id]);

  async function fetchProvider() {
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, "providers", id));
      if (!snap.exists()) {
        setNotFound(true);
      } else {
        setProvider({ id: snap.id, ...snap.data() });
      }
    } catch (err) {
      toast.error("Failed to load provider");
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await approveProvider(id);
      toast.success("Provider approved");
      setProvider((p: any) => ({ ...p, isApproved: true, status: "approved" }));
    } catch {
      toast.error("Failed to approve provider");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    setActionLoading(true);
    try {
      await rejectProvider(id, rejectionReason);
      toast.success("Provider rejected");
      setProvider((p: any) => ({ ...p, isApproved: false, status: "rejected", rejectionReason }));
      setIsRejectModalOpen(false);
      setRejectionReason("");
    } catch {
      toast.error("Failed to reject provider");
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (val: any) => {
    if (!val) return null;
    try {
      const d = val?.toDate ? val.toDate() : new Date(val);
      return format(d, "dd MMM yyyy, h:mm a");
    } catch {
      return null;
    }
  };

  const getStatus = () => {
    if (provider?.status === "rejected") return "rejected";
    if (provider?.isApproved) return "approved";
    return "pending";
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse max-w-3xl">
        <div className="h-8 w-48 bg-gray-100 rounded-xl"></div>
        <div className="h-40 w-full bg-gray-100 rounded-[2rem]"></div>
        <div className="h-56 w-full bg-gray-100 rounded-[2rem]"></div>
        <div className="h-40 w-full bg-gray-100 rounded-[2rem]"></div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="h-16 w-16 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-300 mb-4">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h2 className="text-lg font-medium text-text">Provider Not Found</h2>
        <p className="text-sm font-medium text-text-light mt-1">This provider may have been removed.</p>
        <button
          onClick={() => router.push("/admin/providers")}
          className="mt-6 flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-xs font-medium text-white shadow-lg shadow-primary/20 active:scale-95 transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Providers
        </button>
      </div>
    );
  }

  const status = getStatus();

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back + Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/admin/providers")}
          className="h-9 w-9 flex items-center justify-center rounded-xl bg-white border border-gray-100 text-text-light hover:text-text hover:bg-gray-50 transition-all shadow-sm active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-medium text-text tracking-tight truncate">
            {provider.name || "Provider Detail"}
          </h1>
          <p className="text-xs font-medium text-text-light mt-0.5 uppercase tracking-wider">
            Provider ID: {id}
          </p>
        </div>

        {/* Status badge */}
        <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-medium uppercase tracking-widest shrink-0 ${
          status === "approved"
            ? "bg-green-50 text-green-600 border border-green-100"
            : status === "rejected"
            ? "bg-red-50 text-red-500 border border-red-100"
            : "bg-blue-50 text-blue-600 border border-blue-100"
        }`}>
          {status === "approved" && <ShieldCheck className="h-3.5 w-3.5" />}
          {status === "rejected" && <XCircle className="h-3.5 w-3.5" />}
          {status === "pending" && <Clock className="h-3.5 w-3.5" />}
          {status === "approved" ? "Approved" : status === "rejected" ? "Rejected" : "Pending Review"}
        </span>
      </div>

      {/* Profile hero */}
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8 flex items-center gap-6">
        <div className="relative h-20 w-20 rounded-2xl overflow-hidden border border-gray-100 bg-gray-50 shrink-0">
          {provider.photoURL ? (
            <Image src={provider.photoURL} alt={provider.name} fill className="object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-gray-300">
              <User className="h-9 w-9" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-medium text-text truncate">{provider.name}</h2>
          <p className="text-sm font-medium text-primary mt-0.5">{provider.serviceTitle}</p>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-text-light text-[9px] font-medium uppercase tracking-tight border border-gray-200">
              {provider.category || "Uncategorized"}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-text-light">
              <Star className="h-3 w-3 fill-orange-400 text-orange-400" />
              {provider.rating || "New"}
            </span>
            {provider.createdAt && (
              <span className="text-[10px] font-medium text-text-light">
                Submitted {formatDate(provider.createdAt)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      {status !== "approved" && (
        <div className="flex gap-3">
          <button
            onClick={handleApprove}
            disabled={actionLoading}
            className="flex items-center gap-2 rounded-2xl bg-green-500 px-6 py-3.5 text-xs font-medium text-white shadow-lg shadow-green-500/20 active:scale-95 transition-all disabled:opacity-60"
          >
            <CheckCircle2 className="h-4 w-4" />
            {actionLoading ? "Processing..." : "Approve Provider"}
          </button>
          <button
            onClick={() => setIsRejectModalOpen(true)}
            disabled={actionLoading}
            className="flex items-center gap-2 rounded-2xl bg-red-50 border border-red-100 px-6 py-3.5 text-xs font-medium text-red-500 hover:bg-red-500 hover:text-white transition-all active:scale-95 disabled:opacity-60"
          >
            <XCircle className="h-4 w-4" />
            Reject Provider
          </button>
        </div>
      )}

      {status === "approved" && (
        <div className="flex gap-3">
          <button
            onClick={() => setIsRejectModalOpen(true)}
            disabled={actionLoading}
            className="flex items-center gap-2 rounded-2xl bg-red-50 border border-red-100 px-6 py-3.5 text-xs font-medium text-red-500 hover:bg-red-500 hover:text-white transition-all active:scale-95 disabled:opacity-60"
          >
            <XCircle className="h-4 w-4" />
            Revoke Approval
          </button>
        </div>
      )}

      {/* Rejection reason banner */}
      {status === "rejected" && provider.rejectionReason && (
        <div className="flex gap-3 items-start bg-red-50 border border-red-100 rounded-2xl px-6 py-4">
          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-medium text-red-500 uppercase tracking-widest">Rejection Reason</p>
            <p className="text-sm font-medium text-red-600 mt-1">{provider.rejectionReason}</p>
          </div>
        </div>
      )}

      {/* Section 1: Basic Info */}
      <Section title="Basic Information">
        <InfoRow label="Full Name" value={provider.name} icon={User} />
        <InfoRow label="Email Address" value={provider.email} icon={Mail} />
        <InfoRow label="Phone Number" value={provider.phone} icon={Phone} />
        <InfoRow label="City / Location" value={provider.city} icon={MapPin} />
      </Section>

      {/* Section 2: Service Details */}
      <Section title="Service Details">
        <InfoRow label="Service Category" value={provider.category} icon={Briefcase} />
        <InfoRow label="Subcategory / Specialization" value={provider.subcategory || provider.serviceTitle} icon={Zap} />
        <InfoRow label="Service Title" value={provider.serviceTitle} icon={Zap} />
        <InfoRow label="Years of Experience" value={provider.experience ? `${provider.experience} years` : null} icon={Briefcase} />

        {provider.bio && (
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 shrink-0 mt-0.5">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-widest text-text-light">Bio / About</p>
              <p className="text-sm font-medium text-text mt-1 leading-relaxed whitespace-pre-line">{provider.bio}</p>
            </div>
          </div>
        )}
      </Section>

      {/* Section 3: Pricing & Availability */}
      <Section title="Pricing & Availability">
        <InfoRow
          label="Hourly Rate"
          value={provider.hourlyRate ? `₦${Number(provider.hourlyRate).toLocaleString()} / hr` : null}
          icon={DollarSign}
        />
        <InfoRow
          label="Team Rate"
          value={provider.teamRate ? `₦${Number(provider.teamRate).toLocaleString()} / job` : null}
          icon={DollarSign}
        />

        {Array.isArray(provider.availability) && provider.availability.length > 0 && (
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 shrink-0 mt-0.5">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-widest text-text-light">Available Days</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {provider.availability.map((day: string) => (
                  <span key={day} className="rounded-lg bg-primary/5 border border-primary/10 px-3 py-1.5 text-[10px] font-medium text-primary uppercase tracking-tight">
                    {day}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {(provider.startTime || provider.endTime) && (
          <InfoRow
            label="Working Hours"
            value={`${provider.startTime || "—"} → ${provider.endTime || "—"}`}
            icon={Clock}
          />
        )}
      </Section>

      {/* Section 4: Documents */}
      <Section title="Documents & Media">
        {provider.photoURL ? (
          <div className="space-y-2">
            <p className="text-[10px] font-medium uppercase tracking-widest text-text-light">Profile Photo</p>
            <div className="relative h-40 w-40 rounded-2xl overflow-hidden border border-gray-100 bg-gray-50">
              <Image src={provider.photoURL} alt="Provider profile" fill className="object-cover" />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 py-4">
            <div className="h-10 w-10 rounded-xl bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center text-gray-300">
              <ImageIcon className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-text-light">No documents or media uploaded</p>
          </div>
        )}

        {provider.documents && Array.isArray(provider.documents) && provider.documents.length > 0 && (
          <div className="space-y-2 mt-4">
            <p className="text-[10px] font-medium uppercase tracking-widest text-text-light">Uploaded Documents</p>
            <div className="space-y-2">
              {provider.documents.map((url: string, i: number) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl hover:bg-gray-100 transition-all text-xs font-medium text-primary underline"
                >
                  <FileText className="h-4 w-4 shrink-0" />
                  Document {i + 1}
                </a>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* Section 5: Paystack Subaccount */}
      <Section title="Paystack Subaccount">
        {provider.paystackSubaccountCode ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-green-50 border border-green-100 flex items-center justify-center text-green-600 shrink-0 mt-0.5">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-medium uppercase tracking-widest text-text-light">Status</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <span className="text-sm font-medium text-green-600">Subaccount Active</span>
                </div>
              </div>
            </div>
            
            <InfoRow 
              label="Subaccount Code" 
              value={provider.paystackSubaccountCode} 
            />
            
            {provider.paystackSubaccountId && (
              <InfoRow 
                label="Subaccount ID" 
                value={provider.paystackSubaccountId} 
              />
            )}
            
            {provider.subaccountCreatedAt && (
              <InfoRow 
                label="Created At" 
                value={formatDate(provider.subaccountCreatedAt)} 
              />
            )}

            {provider.bankDetails && (
              <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-[10px] font-medium uppercase tracking-widest text-text-light mb-2">Bank Details</p>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-text">{provider.bankDetails.bankName}</p>
                  <p className="text-xs font-medium text-text-light">
                    Account: **** **** {provider.bankDetails.accountNumber?.slice(-4)}
                  </p>
                  <p className="text-xs font-medium text-text-light">
                    Name: {provider.bankDetails.accountName}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : provider.needsManualSubaccount || provider.subaccountError ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shrink-0 mt-0.5">
                <AlertCircle className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-medium uppercase tracking-widest text-text-light">Status</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="h-2 w-2 rounded-full bg-red-500"></div>
                  <span className="text-sm font-medium text-red-600">Subaccount Missing</span>
                </div>
              </div>
            </div>
            
            {provider.subaccountError && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                <p className="text-xs font-medium text-red-600">{provider.subaccountError}</p>
              </div>
            )}
            
            <button
              onClick={async () => {
                setActionLoading(true);
                try {
                  const response = await fetch('/api/paystack/create-subaccount', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      providerId: provider.id,
                      businessName: provider.serviceTitle || provider.name || 'Service Provider',
                      bankCode: provider.bankDetails?.bankCode,
                      accountNumber: provider.bankDetails?.accountNumber,
                      email: provider.email,
                    }),
                  });
                  
                  if (response.ok) {
                    const result = await response.json();
                    toast.success('Subaccount created successfully!');
                    // Refresh provider data
                    fetchProvider();
                  } else {
                    const error = await response.json().catch(() => ({}));
                    toast.error(error.error || 'Failed to create subaccount');
                  }
                } catch (error) {
                  toast.error('Failed to create subaccount');
                } finally {
                  setActionLoading(false);
                }
              }}
              disabled={actionLoading || !provider.bankDetails?.bankCode || !provider.bankDetails?.accountNumber}
              className="w-full rounded-2xl bg-primary py-3 text-xs font-medium text-white shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-60"
            >
              {actionLoading ? "Creating..." : "Create Subaccount Manually"}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 py-4">
            <div className="h-10 w-10 rounded-xl bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center text-gray-300">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-light">No subaccount information available</p>
              <p className="text-xs font-medium text-text-light mt-1">
                Subaccount will be created automatically when provider is approved
              </p>
            </div>
          </div>
        )}
      </Section>

      {/* Reject / Revoke Modal */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
          <div className="w-full max-w-md animate-in fade-in zoom-in duration-300 rounded-[2.5rem] bg-white p-10 shadow-2xl border border-gray-100">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-12 w-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-500">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-medium text-text">
                  {status === "approved" ? "Revoke Approval" : "Reject Provider"}
                </h2>
                <p className="text-[11px] font-medium text-text-light mt-0.5">{provider.name}</p>
              </div>
            </div>

            <p className="text-sm font-medium text-text-light mb-6 leading-relaxed">
              Please provide a reason. The provider will be able to see this message.
            </p>

            <div className="space-y-2 mb-6">
              <label className="text-[10px] font-medium uppercase tracking-widest text-text-light pl-1">Reason</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Identity document not clear, incomplete information..."
                rows={4}
                className="w-full rounded-2xl bg-gray-50 border border-gray-100 p-5 text-sm font-medium text-text outline-none focus:ring-4 focus:ring-red-500/5 focus:border-red-500/30 transition-all resize-none"
              />
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => { setIsRejectModalOpen(false); setRejectionReason(""); }}
                className="flex-1 rounded-2xl bg-gray-50 py-4 text-[11px] font-medium text-text-light hover:bg-gray-100 transition-all active:scale-95 uppercase tracking-widest"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading}
                className="flex-1 rounded-2xl bg-red-500 py-4 text-[11px] font-medium text-white shadow-xl shadow-red-500/20 hover:bg-red-600 transition-all active:scale-95 uppercase tracking-widest disabled:opacity-60"
              >
                {actionLoading ? "Processing..." : status === "approved" ? "Revoke" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

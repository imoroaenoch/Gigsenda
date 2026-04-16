"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  User, 
  Phone, 
  MapPin, 
  Briefcase, 
  DollarSign, 
  Calendar, 
  CheckCircle2, 
  ArrowLeft, 
  Camera,
  Clock,
  ShieldCheck,
  Zap,
  ChevronRight,
  TrendingUp,
  Star,
  Wallet,
  CheckCircle,
  LogOut,
  Building,
  CreditCard,
  AlertCircle,
  Loader2
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getProvider, updateProvider, uploadProfilePhoto, getBookings } from "@/lib/firestore";
import { subscribeCategoriesWithSubs, CategoryWithSubs } from "@/lib/categories";
import { logout } from "@/lib/auth";
import { getNigerianBanks, verifyBankAccount, maskAccountNumber, NigerianBank } from "@/lib/paystack-banks";
import { createProviderSubaccount } from "@/lib/paystack-subaccount";
import Image from "next/image";
import toast from "react-hot-toast";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function ProviderProfileEditPage() {
  const router = useRouter();
  const { user } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
    } catch {
      toast.error("Failed to logout");
    }
  };
  const [categories, setCategories] = useState<CategoryWithSubs[]>([]);
  const [banks, setBanks] = useState<NigerianBank[]>([]);
  const [isVerifyingAccount, setIsVerifyingAccount] = useState(false);
  const [accountVerification, setAccountVerification] = useState<{
    success: boolean;
    accountName?: string;
    error?: string;
  }>({ success: false });
  const [showBankForm, setShowBankForm] = useState(false);

  useEffect(() => {
    const unsub = subscribeCategoriesWithSubs((data) => setCategories(data));
    return () => unsub();
  }, []);

  useEffect(() => {
    // Fetch banks when component mounts
    getNigerianBanks().then(setBanks).catch(console.error);
  }, []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [newSkill, setNewSkill] = useState("");
  const [newCert, setNewCert] = useState("");
  const [newPortfolio, setNewPortfolio] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    photoURL: "",
    city: "",
    category: "",
    serviceTitle: "",
    experience: "",
    bio: "",
    basePrice: "",
    standardPrice: "",
    premiumPrice: "",
    availability: [] as string[],
    startTime: "09:00",
    endTime: "18:00",
    isApproved: false,
    bankName: "",
    bankCode: "",
    accountNumber: "",
    accountName: "",
    skills: [] as string[],
    certifications: [] as string[],
    portfolioItems: [] as string[],
  });

  const [bankFormData, setBankFormData] = useState({
    bankName: "",
    bankCode: "",
    accountNumber: "",
    accountName: "",
  });

  const [stats, setStats] = useState({
    totalBookings: 0,
    averageRating: 0,
    totalEarnings: 0,
  });

  useEffect(() => {
    if (user?.uid) {
      const fetchData = async () => {
        try {
          const providerData = await getProvider(user.uid);
          if (providerData) {
            setFormData(prev => ({
              ...prev,
              ...(providerData as any),
              basePrice: (providerData.basePrice ?? providerData.hourlyRate)?.toString() || "0",
              standardPrice: (providerData.standardPrice)?.toString() || "",
              premiumPrice: (providerData.premiumPrice ?? providerData.teamRate)?.toString() || "0",
              bankName: providerData.bankDetails?.bankName || "",
              bankCode: providerData.bankDetails?.bankCode || "",
              accountNumber: providerData.bankDetails?.accountNumber || "",
              accountName: providerData.bankDetails?.accountName || "",
            }));
            
            // Initialize bank form data
            if (providerData.bankDetails) {
              setBankFormData({
                bankName: providerData.bankDetails.bankName || "",
                bankCode: providerData.bankDetails.bankCode || "",
                accountNumber: providerData.bankDetails.accountNumber || "",
                accountName: providerData.bankDetails.accountName || "",
              });
            }
            
            // Fetch stats (bookings, etc.)
            const bookings = (await getBookings(user.uid, 'provider')) as any[];
            const completedBookings = bookings.filter(b => b.status === 'completed');
            const earnings = completedBookings.reduce((sum: number, b: any) => sum + (b.totalAmount || 0), 0);
            
            setStats({
              totalBookings: completedBookings.length,
              averageRating: providerData.rating || 0,
              totalEarnings: earnings,
            });
          }
        } catch (error) {
          toast.error("Failed to load profile");
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [user]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;
    
    setIsUpdating(true);
    try {
      await updateProvider(user.uid, {
        ...formData,
        basePrice: Number(formData.basePrice),
        standardPrice: formData.standardPrice ? Number(formData.standardPrice) : null,
        premiumPrice: formData.premiumPrice ? Number(formData.premiumPrice) : null,
      });
      toast.success("Profile updated successfully!");
    } catch (error) {
      toast.error("Update failed");
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.uid) return;

    setLocalPreview(URL.createObjectURL(file));
    setIsUploading(true);
    setUploadProgress(0);
    try {
      // uploadProfilePhoto now writes photoURL to providers/{uid} automatically
      const photoURL = await uploadProfilePhoto(user.uid, file, "providers", (pct) => setUploadProgress(pct));
      setFormData(prev => ({ ...prev, photoURL }));
      setLocalPreview(null);
      toast.success("Photo updated!");
    } catch (error: any) {
      setLocalPreview(null);
      toast.error(error.message || "Upload failed");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const toggleDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      availability: prev.availability.includes(day)
        ? prev.availability.filter(d => d !== day)
        : [...prev.availability, day]
    }));
  };

  const handleAccountVerification = async (accountNumber: string, bankCode: string) => {
    setIsVerifyingAccount(true);
    setAccountVerification({ success: false });
    
    try {
      const result = await verifyBankAccount(accountNumber, bankCode);
      if (result.success && result.accountName) {
        setBankFormData(prev => ({ ...prev, accountName: result.accountName ?? "" }));
        setAccountVerification({ success: true, accountName: result.accountName });
        toast.success("Account verified successfully!");
      } else {
        setAccountVerification({ success: false, error: result.error || "Account not found" });
        toast.error(result.error || "Account not found. Please check your details");
      }
    } catch (error) {
      const errorMessage = "Failed to verify account. Please try again.";
      setAccountVerification({ success: false, error: errorMessage });
      toast.error(errorMessage);
    } finally {
      setIsVerifyingAccount(false);
    }
  };

  const handleUpdateBankDetails = async () => {
    if (!user?.uid) return;
    
    if (!bankFormData.bankName || !bankFormData.bankCode || !bankFormData.accountNumber || !bankFormData.accountName) {
      toast.error("Please complete all bank details");
      return;
    }
    
    if (!accountVerification.success) {
      toast.error("Please verify your account number");
      return;
    }
    
    setIsUpdating(true);
    try {
      await updateProvider(user.uid, {
        bankDetails: {
          bankName: bankFormData.bankName,
          bankCode: bankFormData.bankCode,
          accountNumber: bankFormData.accountNumber,
          accountName: bankFormData.accountName,
          isVerified: true,
          addedAt: new Date(),
        },
      });
      
      // Update local form data
      setFormData(prev => ({
        ...prev,
        bankName: bankFormData.bankName,
        bankCode: bankFormData.bankCode,
        accountNumber: bankFormData.accountNumber,
        accountName: bankFormData.accountName,
      }));
      
      setShowBankForm(false);
      setAccountVerification({ success: false });
      toast.success("Bank details updated successfully!");

      // Create Paystack subaccount automatically
      try {
        const providerData = await getProvider(user.uid);
        const subResult = await createProviderSubaccount({
          id: user.uid,
          email: user.email || providerData?.email || "",
          name: providerData?.name || "",
          serviceTitle: providerData?.serviceTitle,
          bankDetails: {
            bankCode: bankFormData.bankCode,
            accountNumber: bankFormData.accountNumber,
            bankName: bankFormData.bankName,
            accountName: bankFormData.accountName,
            isVerified: true,
          },
        });
        if (subResult.success) {
          toast.success("Payment account set up successfully!");
        } else {
          console.error("Subaccount creation failed:", subResult.error);
        }
      } catch (subError) {
        console.error("Failed to create subaccount:", subError);
      }
    } catch (error) {
      toast.error("Failed to update bank details");
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FFFDF7]">
        <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#FFFDF7] pb-24 lg:pb-12">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white px-6 lg:px-8 pt-12 pb-5 lg:pt-6 lg:pb-5 shadow-sm border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="rounded-xl p-2 hover:bg-gray-100">
              <ArrowLeft className="h-5 w-5 lg:h-6 lg:w-6 text-text" />
            </button>
            <h1 className="text-[18px] lg:text-[22px] font-black text-text">Edit Business Profile</h1>
          </div>
          {formData.isApproved ? (
            <div className="flex items-center gap-1.5 rounded-full bg-green-50 px-4 py-1.5 border border-green-100">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-[10px] font-black uppercase tracking-wider text-green-600">Active</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-full bg-orange-50 px-4 py-1.5 border border-orange-100">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse"></div>
              <span className="text-[10px] font-black uppercase tracking-wider text-primary">Pending Approval</span>
            </div>
          )}
        </div>
      </header>

      {/* Two-column wrapper on desktop */}
      <div className="lg:flex lg:gap-8 lg:px-8 lg:py-8">

        {/* LEFT COLUMN — photo + stats (desktop sidebar) */}
        <div className="lg:w-72 lg:flex-shrink-0 lg:space-y-6">

        {/* Stats Grid */}
        <div className="px-6 pt-6 lg:px-0 lg:pt-0">
          <div className="grid grid-cols-3 lg:grid-cols-1 gap-3">
            {[
              { icon: CheckCircle2, bg: "bg-primary/10", color: "text-primary",    value: stats.totalBookings,                  label: "Completed Bookings" },
              { icon: Star,         bg: "bg-purple-50",  color: "text-purple-500", value: stats.averageRating,                  label: "Avg Rating",        fill: true },
              { icon: Wallet,       bg: "bg-blue-50",    color: "text-blue-500",   value: `₦${stats.totalEarnings.toLocaleString()}`, label: "Total Earnings" },
            ].map((s, i) => (
              <div key={i} className="rounded-2xl bg-white p-4 lg:p-5 shadow-sm border border-gray-100 flex flex-col lg:flex-row items-center lg:items-start lg:gap-4 text-center lg:text-left">
                <div className={`h-10 w-10 rounded-xl ${s.bg} flex items-center justify-center ${s.color} mb-2 lg:mb-0 flex-shrink-0`}>
                  <s.icon className={`h-5 w-5 ${'fill' in s ? 'fill-purple-500' : ''}`} />
                </div>
                <div>
                  <p className="text-[13px] lg:text-[18px] font-black text-text leading-tight">{s.value}</p>
                  <p className="text-[8px] lg:text-[10px] font-bold text-text-light uppercase tracking-wide mt-0.5">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Profile Photo */}
        <div className="flex flex-col items-center py-6 lg:py-0">
          <div className="relative h-24 w-24 lg:h-32 lg:w-32">
            <div className="relative h-full w-full overflow-hidden rounded-full border-4 border-primary/10 bg-gray-100">
              {(localPreview || formData.photoURL) ? (
                <Image src={localPreview || formData.photoURL} alt="Profile" fill className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-gray-400">
                  <User className="h-10 w-10" />
                </div>
              )}
              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                  <span className="text-white text-[10px] font-black">{uploadProgress}%</span>
                </div>
              )}
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white shadow-lg active:scale-90 transition-all disabled:opacity-70"
            >
              {isUploading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div> : <Camera className="h-4 w-4" />}
            </button>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/jpeg,image/png,image/webp,image/heic" onChange={handlePhotoUpload} />
          </div>
          {isUploading && (
            <p className="mt-2 text-xs font-bold text-primary">{uploadProgress}% uploaded</p>
          )}
        </div>

        </div>{/* end LEFT COLUMN */}

        {/* RIGHT COLUMN — form */}
        <div className="flex-1 min-w-0">
        <form onSubmit={handleUpdate} className="px-6 pt-6 lg:px-0 lg:pt-0 space-y-6">
          {/* Section: Personal Info */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-text-light border-b border-gray-100 pb-2">Personal Details</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-text-light">Full Name</label>
                <div className="flex items-center rounded-xl bg-white border border-gray-100 px-4 py-3 shadow-sm">
                  <User className="h-4 w-4 text-gray-400" />
                  <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="ml-3 w-full bg-transparent text-sm font-bold outline-none text-text" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-text-light">Phone Number</label>
                <div className="flex items-center rounded-xl bg-white border border-gray-100 px-4 py-3 shadow-sm">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="ml-3 w-full bg-transparent text-sm font-bold outline-none text-text" />
                </div>
              </div>
              <div className="space-y-1.5 lg:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-text-light">City / Area</label>
                <div className="flex items-center rounded-xl bg-white border border-gray-100 px-4 py-3 shadow-sm">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <input type="text" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} className="ml-3 w-full bg-transparent text-sm font-bold outline-none text-text" />
                </div>
              </div>
            </div>
          </section>

          {/* Section: Service Details */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-text-light border-b border-gray-100 pb-2">Business Details</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-text-light">Service Category</label>
                <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full rounded-xl bg-white border border-gray-100 px-4 py-3.5 text-sm font-bold outline-none text-text shadow-sm appearance-none">
                  {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-text-light">Business Title</label>
                <div className="flex items-center rounded-xl bg-white border border-gray-100 px-4 py-3 shadow-sm">
                  <Zap className="h-4 w-4 text-gray-400" />
                  <input type="text" value={formData.serviceTitle} onChange={(e) => setFormData({...formData, serviceTitle: e.target.value})} className="ml-3 w-full bg-transparent text-sm font-bold outline-none text-text" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-text-light">Experience (Years)</label>
                <div className="flex items-center rounded-xl bg-white border border-gray-100 px-4 py-3 shadow-sm">
                  <Briefcase className="h-4 w-4 text-gray-400" />
                  <input type="number" value={formData.experience} onChange={(e) => setFormData({...formData, experience: e.target.value})} className="ml-3 w-full bg-transparent text-sm font-bold outline-none text-text" />
                </div>
              </div>
              <div className="space-y-1.5 lg:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-text-light">Bio / About</label>
                <textarea value={formData.bio} onChange={(e) => setFormData({...formData, bio: e.target.value.slice(0, 300)})}
                  rows={4} className="w-full rounded-xl bg-white border border-gray-100 px-4 py-3.5 text-sm font-medium outline-none text-text shadow-sm resize-none" />
              </div>
            </div>
          </section>

          {/* Section: Experience */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-text-light border-b border-gray-100 pb-2">Experience & Portfolio</h3>

            {/* Skills */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-text-light">Skills</label>
              {formData.skills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.skills.map((s, i) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-black text-primary">
                      {s}
                      <button type="button" onClick={() => setFormData(prev => ({ ...prev, skills: prev.skills.filter((_, j) => j !== i) }))}
                        className="ml-1 text-primary/60 hover:text-red-400 font-black leading-none">×</button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSkill}
                  onChange={e => setNewSkill(e.target.value)}
                  onKeyDown={e => {
                    if ((e.key === "Enter" || e.key === ",") && newSkill.trim()) {
                      e.preventDefault();
                      if (!formData.skills.includes(newSkill.trim())) {
                        setFormData(prev => ({ ...prev, skills: [...prev.skills, newSkill.trim()] }));
                      }
                      setNewSkill("");
                    }
                  }}
                  placeholder="Type a skill and press Enter"
                  className="flex-1 rounded-xl bg-white border border-gray-100 px-4 py-2.5 text-sm font-bold outline-none text-text shadow-sm"
                />
                <button type="button"
                  onClick={() => {
                    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
                      setFormData(prev => ({ ...prev, skills: [...prev.skills, newSkill.trim()] }));
                    }
                    setNewSkill("");
                  }}
                  className="rounded-xl bg-primary px-4 py-2.5 text-[12px] font-black text-white active:scale-95 transition-all">
                  Add
                </button>
              </div>
            </div>

            {/* Certifications */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-text-light">Certifications / Qualifications</label>
              {formData.certifications.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.certifications.map((c, i) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-3 py-1 text-[11px] font-black text-green-700">
                      {c}
                      <button type="button" onClick={() => setFormData(prev => ({ ...prev, certifications: prev.certifications.filter((_, j) => j !== i) }))}
                        className="ml-1 text-green-500/60 hover:text-red-400 font-black leading-none">×</button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCert}
                  onChange={e => setNewCert(e.target.value)}
                  onKeyDown={e => {
                    if ((e.key === "Enter" || e.key === ",") && newCert.trim()) {
                      e.preventDefault();
                      if (!formData.certifications.includes(newCert.trim())) {
                        setFormData(prev => ({ ...prev, certifications: [...prev.certifications, newCert.trim()] }));
                      }
                      setNewCert("");
                    }
                  }}
                  placeholder="e.g. Certified Electrician, BSc Nursing"
                  className="flex-1 rounded-xl bg-white border border-gray-100 px-4 py-2.5 text-sm font-bold outline-none text-text shadow-sm"
                />
                <button type="button"
                  onClick={() => {
                    if (newCert.trim() && !formData.certifications.includes(newCert.trim())) {
                      setFormData(prev => ({ ...prev, certifications: [...prev.certifications, newCert.trim()] }));
                    }
                    setNewCert("");
                  }}
                  className="rounded-xl bg-green-500 px-4 py-2.5 text-[12px] font-black text-white active:scale-95 transition-all">
                  Add
                </button>
              </div>
            </div>

            {/* Portfolio items / past work */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-text-light">Past Work / Portfolio Highlights</label>
              <div className="space-y-2">
                {formData.portfolioItems.map((p, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-xl bg-gray-50 border border-gray-100 px-3 py-2.5">
                    <p className="flex-1 text-[12px] font-bold text-text">{p}</p>
                    <button type="button" onClick={() => setFormData(prev => ({ ...prev, portfolioItems: prev.portfolioItems.filter((_, j) => j !== i) }))}
                      className="text-gray-300 hover:text-red-400 font-black text-[14px] leading-none flex-shrink-0">×</button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPortfolio}
                  onChange={e => setNewPortfolio(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && newPortfolio.trim()) {
                      e.preventDefault();
                      setFormData(prev => ({ ...prev, portfolioItems: [...prev.portfolioItems, newPortfolio.trim()] }));
                      setNewPortfolio("");
                    }
                  }}
                  placeholder="e.g. Installed electrical system for 20-unit building"
                  className="flex-1 rounded-xl bg-white border border-gray-100 px-4 py-2.5 text-sm font-bold outline-none text-text shadow-sm"
                />
                <button type="button"
                  onClick={() => {
                    if (newPortfolio.trim()) {
                      setFormData(prev => ({ ...prev, portfolioItems: [...prev.portfolioItems, newPortfolio.trim()] }));
                      setNewPortfolio("");
                    }
                  }}
                  className="rounded-xl bg-gray-700 px-4 py-2.5 text-[12px] font-black text-white active:scale-95 transition-all">
                  Add
                </button>
              </div>
            </div>
          </section>

          {/* Section: Pricing & Availability */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-text-light border-b border-gray-100 pb-2">Pricing & Time</h3>
            
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-text-light">Base Service Price (₦)</label>
                <div className="flex items-center rounded-xl bg-white border border-gray-100 px-4 py-3 shadow-sm">
                  <span className="font-bold text-gray-400 mr-1">₦</span>
                  <input 
                    type="number" 
                    value={formData.basePrice}
                    onChange={(e) => {
                      const base = e.target.value;
                      const standard = formData.standardPrice || Math.round(Number(base) * 1.5).toString();
                      setFormData({...formData, basePrice: base, standardPrice: standard});
                    }}
                    className="w-full bg-transparent text-sm font-bold outline-none text-text"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-text-light">Standard Rate (₦)</label>
                <div className="flex items-center rounded-xl bg-white border border-gray-100 px-4 py-3 shadow-sm">
                  <span className="font-bold text-gray-400 mr-1">₦</span>
                  <input 
                    type="number" 
                    value={formData.standardPrice}
                    onChange={(e) => setFormData({...formData, standardPrice: e.target.value})}
                    placeholder={Math.round(Number(formData.basePrice) * 1.5).toString()}
                    className="w-full bg-transparent text-sm font-bold outline-none text-text"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-text-light">Premium Rate (₦)</label>
                <div className="flex items-center rounded-xl bg-white border border-gray-100 px-4 py-3 shadow-sm">
                  <span className="font-bold text-gray-400 mr-1">₦</span>
                  <input 
                    type="number" 
                    value={formData.premiumPrice}
                    onChange={(e) => setFormData({...formData, premiumPrice: e.target.value})}
                    placeholder={Math.round(Number(formData.basePrice) * 2).toString()}
                    className="w-full bg-transparent text-sm font-bold outline-none text-text"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-wider text-text-light">Working Days</label>
              <div className="grid grid-cols-4 gap-2">
                {days.map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`rounded-lg py-2 text-[10px] font-black transition-all border ${
                      formData.availability.includes(day)
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : 'bg-white text-text-light border-gray-100'
                    }`}
                  >
                    {day.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-text-light">Opening Time</label>
                <input 
                  type="time" 
                  value={formData.startTime}
                  onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                  className="w-full rounded-xl bg-white border border-gray-100 px-4 py-3 text-sm font-bold outline-none text-text shadow-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-text-light">Closing Time</label>
                <input 
                  type="time" 
                  value={formData.endTime}
                  onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                  className="w-full rounded-xl bg-white border border-gray-100 px-4 py-3 text-sm font-bold outline-none text-text shadow-sm"
                />
              </div>
            </div>
          </section>

          {/* Section: Payment Details */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black uppercase tracking-wider text-text-light border-b border-gray-100 pb-2">Payment Details</h3>
              {!showBankForm && (
                <button
                  type="button"
                  onClick={() => {
                    setShowBankForm(true);
                    setAccountVerification({ success: false });
                    // Reset form to current values
                    setBankFormData({
                      bankName: formData.bankName,
                      bankCode: formData.bankCode,
                      accountNumber: "",
                      accountName: "",
                    });
                  }}
                  className="text-xs font-bold text-primary hover:opacity-70 transition-all"
                >
                  Update Bank Details
                </button>
              )}
            </div>
            
            {!showBankForm && formData.bankName && formData.accountNumber ? (
              <div className="rounded-2xl bg-green-50 border border-green-100 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-green-800">{formData.bankName}</p>
                    <p className="text-xs font-bold text-green-600 mt-1">
                      Account: {maskAccountNumber(formData.accountNumber)}
                    </p>
                    <p className="text-xs font-bold text-green-600 mt-0.5">
                      Name: {formData.accountName}
                    </p>
                    <div className="flex items-center gap-1 mt-2">
                      <div className="h-2 w-2 rounded-full bg-green-500"></div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-green-600">Verified</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : !showBankForm ? (
              <div className="rounded-2xl bg-orange-50 border border-orange-100 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-orange-800">No bank details added</p>
                    <p className="text-[10px] font-bold text-orange-600 mt-1">Add your bank details to receive payments for completed services</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-text-light">Bank Name</label>
                  <div className="flex items-center rounded-xl bg-white border border-gray-100 px-4 py-3 shadow-sm">
                    <Building className="h-4 w-4 text-gray-400" />
                    <select 
                      value={bankFormData.bankCode}
                      onChange={(e) => {
                        const selectedBank = banks.find(bank => bank.code === e.target.value);
                        setBankFormData({
                          ...bankFormData,
                          bankCode: e.target.value,
                          bankName: selectedBank?.name || "",
                          accountNumber: "",
                          accountName: "",
                        });
                        setAccountVerification({ success: false });
                      }}
                      className="ml-3 w-full bg-transparent text-sm font-bold outline-none text-text appearance-none"
                    >
                      <option value="">Select your bank</option>
                      {banks.map(bank => (
                        <option key={bank.code} value={bank.code}>{bank.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-text-light">Account Number</label>
                  <div className="flex items-center rounded-xl bg-white border border-gray-100 px-4 py-3 shadow-sm">
                    <CreditCard className="h-4 w-4 text-gray-400" />
                    <input 
                      type="text" 
                      value={bankFormData.accountNumber}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setBankFormData({ ...bankFormData, accountNumber: value, accountName: "" });
                        setAccountVerification({ success: false });
                        
                        // Auto-verify when 10 digits are entered
                        if (value.length === 10 && bankFormData.bankCode) {
                          handleAccountVerification(value, bankFormData.bankCode);
                        }
                      }}
                      placeholder="Enter 10-digit account number"
                      className="ml-3 w-full bg-transparent text-sm font-bold outline-none text-text"
                    />
                    {isVerifyingAccount && (
                      <Loader2 className="h-4 w-4 text-primary animate-spin ml-2" />
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-text-light">Account Name</label>
                  <div className={`flex items-center rounded-xl border px-4 py-3 shadow-sm ${
                    accountVerification.success 
                      ? 'bg-green-50 border-green-200' 
                      : accountVerification.error 
                      ? 'bg-red-50 border-red-200' 
                      : 'bg-white border-gray-100'
                  }`}>
                    {accountVerification.success ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : accountVerification.error ? (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    ) : (
                      <User className="h-4 w-4 text-gray-400" />
                    )}
                    <input 
                      type="text" 
                      value={bankFormData.accountName}
                      readOnly
                      placeholder={
                        isVerifyingAccount 
                          ? "Verifying..." 
                          : accountVerification.success 
                          ? bankFormData.accountName 
                          : accountVerification.error 
                          ? accountVerification.error 
                          : "Account name will appear here"
                      }
                      className={`ml-3 w-full bg-transparent text-sm font-bold outline-none ${
                        accountVerification.success 
                          ? 'text-green-700' 
                          : accountVerification.error 
                          ? 'text-red-700' 
                          : 'text-text-light'
                      }`}
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleUpdateBankDetails}
                    disabled={isUpdating || !accountVerification.success}
                    className="flex-1 rounded-2xl bg-primary py-3 text-xs font-black text-white shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isUpdating ? "Updating..." : "Update Bank Details"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowBankForm(false);
                      setAccountVerification({ success: false });
                    }}
                    className="flex-1 rounded-2xl bg-gray-100 py-3 text-xs font-black text-text hover:bg-gray-200 transition-all active:scale-95"
                  >
                    Cancel
                  </button>
                </div>

                <div className="flex items-start gap-2 p-3 rounded-2xl bg-orange-50 border border-orange-100">
                  <AlertCircle className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] font-bold text-orange-800 leading-tight">
                    Your bank details are used to receive payments for completed services. Gigsenda deducts 10% commission from each payment.
                  </p>
                </div>
              </div>
            )}
          </section>

          <button 
            type="submit"
            disabled={isUpdating}
            className="w-full rounded-2xl bg-primary py-5 text-sm font-black text-white shadow-xl shadow-primary/20 active:scale-95 transition-all disabled:opacity-50"
          >
            {isUpdating ? "Updating Profile..." : "Save Business Profile"}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-50 py-5 text-sm font-black text-red-500 hover:bg-red-100 transition-all active:scale-95"
          >
            <LogOut className="h-5 w-5" />
            Logout Account
          </button>
        </form>
        </div>{/* end RIGHT COLUMN */}

      </div>{/* end two-column wrapper */}
    </main>
  );
}

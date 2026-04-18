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
  ChevronRight,
  Clock,
  ShieldCheck,
  Zap,
  CheckCircle,
  Building,
  CreditCard,
  AlertCircle,
  Loader2
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { createProvider, uploadProfilePhoto } from "@/lib/firestore";
import { subscribeCategoriesWithSubs, CategoryWithSubs } from "@/lib/categories";
import { getNigerianBanks, verifyBankAccount, NigerianBank } from "@/lib/paystack-banks";
import Image from "next/image";
import toast from "react-hot-toast";

const steps = ["Personal Info", "Service Details", "Pricing", "Payment Details", "Review & Submit"];
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function ProviderSetupPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<CategoryWithSubs[]>([]);
  const [banks, setBanks] = useState<NigerianBank[]>([]);
  const [isVerifyingAccount, setIsVerifyingAccount] = useState(false);
  const [accountVerification, setAccountVerification] = useState<{
    success: boolean;
    accountName?: string;
    error?: string;
  }>({ success: false });

  useEffect(() => {
    const unsub = subscribeCategoriesWithSubs((data) => setCategories(data));
    return () => unsub();
  }, []);

  useEffect(() => {
    // Fetch banks when component mounts
    getNigerianBanks().then(setBanks).catch(console.error);
  }, []);
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  
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
    bankName: "",
    bankCode: "",
    accountNumber: "",
    accountName: "",
  });

  // Pre-fill form with existing customer profile data once loaded
  useEffect(() => {
    if (!profile) return;
    setFormData(prev => ({
      ...prev,
      name: prev.name || profile.name || "",
      phone: prev.phone || profile.phone || "",
      photoURL: prev.photoURL || profile.photoURL || "",
      city: prev.city || (profile as any).address || "",
    }));
  }, [profile]);

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo(0, 0);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
    window.scrollTo(0, 0);
  };

  const validateStep = (step: number) => {
    switch (step) {
      case 1:
        if (!formData.name || !formData.phone || !formData.city) {
          toast.error("Please fill in all personal details");
          return false;
        }
        return true;
      case 2:
        if (!formData.category || !formData.serviceTitle || !formData.experience || !formData.bio) {
          toast.error("Please fill in all service details");
          return false;
        }
        if (formData.bio.length > 300) {
          toast.error("Bio cannot exceed 300 characters");
          return false;
        }
        return true;
      case 3:
        if (!formData.basePrice || formData.availability.length === 0) {
          toast.error("Please set your pricing and availability");
          return false;
        }
        return true;
      case 4:
        if (!formData.bankName || !formData.bankCode || !formData.accountNumber || !formData.accountName) {
          toast.error("Please complete your bank details");
          return false;
        }
        if (!accountVerification.success) {
          toast.error("Please verify your account number");
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.uid) return;

    // Show local preview immediately
    const objectUrl = URL.createObjectURL(file);
    setLocalPreview(objectUrl);

    setIsUploading(true);
    setUploadProgress(0);
    try {
      const photoURL = await uploadProfilePhoto(
        user.uid,
        file,
        "providers",
        (pct) => setUploadProgress(pct)
      );
      setFormData(prev => ({ ...prev, photoURL }));
      setLocalPreview(null); // Use the real URL now
      toast.success("Photo uploaded!");
    } catch (error: any) {
      setLocalPreview(null);
      setFormData(prev => ({ ...prev, photoURL: "" }));
      toast.error(error.message || "Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSubmit = async () => {
    if (!user?.uid) return;
    if (isUploading) {
      toast.error("Please wait for your photo to finish uploading");
      return;
    }
    
    setIsSubmitting(true);
    try {
      if (!formData.photoURL) {
        toast.error("Photo is missing. Please upload your photo again on Step 1.");
        setCurrentStep(1);
        setIsSubmitting(false);
        return;
      }
      await createProvider(user.uid, {
        ...formData,
        email: user.email || profile?.email || "",
        basePrice: Number(formData.basePrice),
        standardPrice: formData.standardPrice ? Number(formData.standardPrice) : null,
        premiumPrice: formData.premiumPrice ? Number(formData.premiumPrice) : null,
        bankDetails: {
          bankName: formData.bankName,
          bankCode: formData.bankCode,
          accountNumber: formData.accountNumber,
          accountName: formData.accountName,
          isVerified: true,
          addedAt: new Date(),
        },
      });
      router.push("/pending-approval");
    } catch (error) {
      toast.error("Failed to submit profile");
    } finally {
      setIsSubmitting(false);
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
        setFormData(prev => ({ ...prev, accountName: result.accountName }));
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

  return (
    <main className="min-h-screen bg-[#FFFDF7] pb-24 [html.dark_&]:bg-[#111111]">
      {/* Step Progress Header */}
      <header className="sticky top-0 z-50 bg-white px-6 pt-12 pb-6 shadow-sm [html.dark_&]:bg-[#1a1a1a] [html.dark_&]:border-b [html.dark_&]:border-[#2a2a2a]">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => router.back()} className="rounded-xl p-2 hover:bg-gray-100">
            <ArrowLeft className="h-6 w-6 text-text" />
          </button>
          <div className="flex flex-col items-center">
            <h1 className="text-lg font-semibold text-text">Profile Setup</h1>
            <p className="text-[10px] font-medium text-primary uppercase tracking-widest">Step {currentStep} of 5</p>
          </div>
          <div className="w-10"></div>
        </div>
        
        <div className="flex gap-2">
          {steps.map((_, i) => (
            <div 
              key={i} 
              className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i + 1 <= currentStep ? 'bg-primary shadow-sm shadow-primary/20' : 'bg-gray-100'}`}
            ></div>
          ))}
        </div>
      </header>

      <div className="px-6 py-8">
        {/* Step 1: Personal Info */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="flex flex-col items-center mb-8">
              <div className="relative h-24 w-24">
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
                      <span className="text-white text-[10px] font-medium">{uploadProgress}%</span>
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
              <p className="mt-3 text-xs font-medium text-text-light">
                {isUploading ? `Uploading… ${uploadProgress}%` : "Upload Professional Photo"}
              </p>
            </div>

            <div className="space-y-4">
              {/* Email — locked, pre-filled from account */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium uppercase tracking-wider text-text-light">Email Address</label>
                <div className="flex items-center rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 shadow-sm opacity-70">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                  <input
                    type="email"
                    value={user?.email || profile?.email || ""}
                    readOnly
                    disabled
                    className="ml-3 w-full bg-transparent text-sm font-medium outline-none text-gray-400 cursor-not-allowed"
                  />
                  <span className="text-[9px] font-black uppercase tracking-widest text-gray-300 ml-2">Locked</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-medium uppercase tracking-wider text-text-light">Full Name</label>
                <div className="flex items-center rounded-xl bg-white border border-gray-100 px-4 py-3 shadow-sm">
                  <User className="h-4 w-4 text-gray-400" />
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. John Doe"
                    className="ml-3 w-full bg-transparent text-sm font-medium outline-none text-text"
                  />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium uppercase tracking-wider text-text-light">Phone Number</label>
                <div className="flex items-center rounded-xl bg-white border border-gray-100 px-4 py-3 shadow-sm">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <input 
                    type="tel" 
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="e.g. +234 800 000 0000"
                    className="ml-3 w-full bg-transparent text-sm font-medium outline-none text-text"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-medium uppercase tracking-wider text-text-light">City / Area</label>
                <div className="flex items-center rounded-xl bg-white border border-gray-100 px-4 py-3 shadow-sm">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <input 
                    type="text" 
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    placeholder="e.g. Ikeja, Lagos"
                    className="ml-3 w-full bg-transparent text-sm font-medium outline-none text-text"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Service Details */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium uppercase tracking-wider text-text-light">Service Category</label>
              <select 
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full rounded-xl bg-white border border-gray-100 px-4 py-3.5 text-sm font-medium outline-none text-text shadow-sm appearance-none"
              >
                <option value="">Select Category</option>
                {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-medium uppercase tracking-wider text-text-light">Service Title</label>
              <div className="flex items-center rounded-xl bg-white border border-gray-100 px-4 py-3 shadow-sm">
                <Zap className="h-4 w-4 text-gray-400" />
                <input 
                  type="text" 
                  value={formData.serviceTitle}
                  onChange={(e) => setFormData({...formData, serviceTitle: e.target.value})}
                  placeholder="e.g. Professional Plumber"
                  className="ml-3 w-full bg-transparent text-sm font-medium outline-none text-text"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-medium uppercase tracking-wider text-text-light">Years of Experience</label>
              <div className="flex items-center rounded-xl bg-white border border-gray-100 px-4 py-3 shadow-sm">
                <Briefcase className="h-4 w-4 text-gray-400" />
                <input 
                  type="number" 
                  value={formData.experience}
                  onChange={(e) => setFormData({...formData, experience: e.target.value})}
                  placeholder="e.g. 5"
                  className="ml-3 w-full bg-transparent text-sm font-medium outline-none text-text"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between">
                <label className="text-[10px] font-medium uppercase tracking-wider text-text-light">Bio / About</label>
                <span className="text-[10px] font-medium text-gray-400">{formData.bio.length}/300</span>
              </div>
              <textarea 
                value={formData.bio}
                onChange={(e) => setFormData({...formData, bio: e.target.value.slice(0, 300)})}
                placeholder="Describe your expertise and what makes you unique..."
                rows={5}
                className="w-full rounded-xl bg-white border border-gray-100 px-4 py-3.5 text-sm font-medium outline-none text-text shadow-sm resize-none"
              />
            </div>
          </div>
        )}

        {/* Step 3: Pricing & Availability */}
        {currentStep === 3 && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium uppercase tracking-wider text-text-light">Base Service Price (₦)</label>
                <div className="flex items-center rounded-xl bg-white border border-gray-100 px-4 py-3 shadow-sm">
                  <span className="font-medium text-gray-400 mr-1">₦</span>
                  <input 
                    type="number" 
                    value={formData.basePrice}
                    onChange={(e) => setFormData({...formData, basePrice: e.target.value})}
                    placeholder="e.g. 5000"
                    className="w-full bg-transparent text-sm font-medium outline-none text-text"
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium uppercase tracking-wider text-text-light">Standard Rate (Optional)</label>
                <div className="flex items-center rounded-xl bg-white border border-gray-100 px-4 py-3 shadow-sm">
                  <span className="font-medium text-gray-400 mr-1">₦</span>
                  <input 
                    type="number" 
                    value={formData.standardPrice}
                    onChange={(e) => setFormData({...formData, standardPrice: e.target.value})}
                    placeholder="e.g. 10000"
                    className="w-full bg-transparent text-sm font-medium outline-none text-text"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium uppercase tracking-wider text-text-light">Premium Rate (Optional)</label>
                <div className="flex items-center rounded-xl bg-white border border-gray-100 px-4 py-3 shadow-sm">
                  <span className="font-medium text-gray-400 mr-1">₦</span>
                  <input 
                    type="number" 
                    value={formData.premiumPrice}
                    onChange={(e) => setFormData({...formData, premiumPrice: e.target.value})}
                    placeholder="e.g. 25000"
                    className="w-full bg-transparent text-sm font-medium outline-none text-text"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-medium uppercase tracking-wider text-text-light">Availability Days</label>
              <div className="grid grid-cols-4 gap-2">
                {days.map(day => (
                  <button
                    key={day}
                    onClick={() => toggleDay(day)}
                    className={`rounded-lg py-2 text-[10px] font-medium transition-all border ${
                      formData.availability.includes(day)
                        ? 'bg-primary text-white border-primary shadow-sm shadow-primary/20'
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
                <label className="text-[10px] font-medium uppercase tracking-wider text-text-light">From Time</label>
                <div className="flex items-center rounded-xl bg-white border border-gray-100 px-4 py-3 shadow-sm">
                  <Clock className="h-4 w-4 text-gray-400 mr-2" />
                  <input 
                    type="time" 
                    value={formData.startTime}
                    onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                    className="w-full bg-transparent text-sm font-medium outline-none text-text"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium uppercase tracking-wider text-text-light">To Time</label>
                <div className="flex items-center rounded-xl bg-white border border-gray-100 px-4 py-3 shadow-sm">
                  <Clock className="h-4 w-4 text-gray-400 mr-2" />
                  <input 
                    type="time" 
                    value={formData.endTime}
                    onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                    className="w-full bg-transparent text-sm font-medium outline-none text-text"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Payment Details */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium uppercase tracking-wider text-text-light">Bank Name</label>
                <div className="flex items-center rounded-xl bg-white border border-gray-100 px-4 py-3 shadow-sm">
                  <Building className="h-4 w-4 text-gray-400" />
                  <select 
                    value={formData.bankCode}
                    onChange={(e) => {
                      const selectedBank = banks.find(bank => bank.code === e.target.value);
                      setFormData({
                        ...formData,
                        bankCode: e.target.value,
                        bankName: selectedBank?.name || "",
                        accountNumber: "",
                        accountName: "",
                      });
                      setAccountVerification({ success: false });
                    }}
                    className="ml-3 w-full bg-transparent text-sm font-medium outline-none text-text appearance-none"
                  >
                    <option value="">Select your bank</option>
                    {banks.map(bank => (
                      <option key={bank.code} value={bank.code}>{bank.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-medium uppercase tracking-wider text-text-light">Account Number</label>
                <div className="flex items-center rounded-xl bg-white border border-gray-100 px-4 py-3 shadow-sm">
                  <CreditCard className="h-4 w-4 text-gray-400" />
                  <input 
                    type="text" 
                    value={formData.accountNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setFormData({ ...formData, accountNumber: value, accountName: "" });
                      setAccountVerification({ success: false });
                      
                      // Auto-verify when 10 digits are entered
                      if (value.length === 10 && formData.bankCode) {
                        handleAccountVerification(value, formData.bankCode);
                      }
                    }}
                    placeholder="Enter 10-digit account number"
                    className="ml-3 w-full bg-transparent text-sm font-medium outline-none text-text"
                  />
                  {isVerifyingAccount && (
                    <Loader2 className="h-4 w-4 text-primary animate-spin ml-2" />
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-medium uppercase tracking-wider text-text-light">Account Name</label>
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
                    value={formData.accountName}
                    readOnly
                    placeholder={
                      isVerifyingAccount 
                        ? "Verifying..." 
                        : accountVerification.success 
                        ? formData.accountName 
                        : accountVerification.error 
                        ? accountVerification.error 
                        : "Account name will appear here"
                    }
                    className={`ml-3 w-full bg-transparent text-sm font-medium outline-none ${
                      accountVerification.success 
                        ? 'text-green-700' 
                        : accountVerification.error 
                        ? 'text-red-700' 
                        : 'text-text-light'
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 p-4 rounded-2xl bg-orange-50 border border-orange-100">
              <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] font-medium text-orange-800 leading-tight">
                Your bank details are used to receive payments for completed services. Gigsenda deducts 10% commission from each payment.
              </p>
            </div>
          </div>
        )}

        {/* Step 5: Review & Submit */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100 space-y-6">
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-primary/10">
                  <Image src={formData.photoURL} alt="Profile" fill className="object-cover" />
                </div>
                <div>
                  <h3 className="font-medium text-text text-lg">{formData.name}</h3>
                  <p className="text-xs font-medium text-text-light">{formData.serviceTitle}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 py-4 border-y border-gray-50">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-text-light">Category</p>
                  <p className="text-sm font-medium text-text">{formData.category}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-text-light">Experience</p>
                  <p className="text-sm font-medium text-text">{formData.experience} Years</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-text-light">Base Service Price</p>
                  <p className="text-sm font-medium text-primary">₦{Number(formData.basePrice).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-text-light">Standard Rate</p>
                  <p className="text-sm font-medium text-text">₦{formData.standardPrice ? Number(formData.standardPrice).toLocaleString() : '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-text-light">Premium Rate</p>
                  <p className="text-sm font-medium text-text">₦{formData.premiumPrice ? Number(formData.premiumPrice).toLocaleString() : '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-text-light">Location</p>
                  <p className="text-sm font-medium text-text">{formData.city}</p>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-text-light mb-2">Availability</p>
                <div className="flex flex-wrap gap-1.5">
                  {formData.availability.map(day => (
                    <span key={day} className="rounded-md bg-gray-50 px-2 py-1 text-[10px] font-medium text-text-light border border-gray-100">
                      {day}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-[10px] font-medium text-text-light">{formData.startTime} - {formData.endTime}</p>
              </div>

              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-text-light mb-2">About</p>
                <p className="text-[13px] font-medium text-text-light leading-relaxed line-clamp-4">{formData.bio}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 p-4 rounded-2xl bg-orange-50 text-primary border border-orange-100">
              <ShieldCheck className="h-5 w-5 flex-shrink-0" />
              <p className="text-[11px] font-medium leading-tight">Your profile will be reviewed by our team. Approval usually takes 24-48 hours.</p>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="mt-12 flex gap-4">
          {currentStep > 1 && (
            <button 
              onClick={handleBack}
              className="flex-1 rounded-2xl border-2 border-gray-100 bg-white py-4 text-sm font-medium text-text shadow-sm active:scale-95 transition-all"
            >
              Back
            </button>
          )}
          {currentStep < 5 ? (
            <button 
              onClick={handleNext}
              className="flex-[2] rounded-2xl bg-primary py-4 text-sm font-medium text-white shadow-lg shadow-primary/20 active:scale-95 transition-all"
            >
              Continue
            </button>
          ) : (
            <button 
              onClick={handleSubmit}
              disabled={isSubmitting || isUploading}
              className="flex-[2] rounded-2xl bg-primary py-4 text-sm font-medium text-white shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : isUploading ? "Uploading Photo..." : "Submit for Approval"}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

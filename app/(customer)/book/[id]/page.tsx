"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  MapPin,
  Star,
  Briefcase,
  Users2,
  Heart,
  MoreHorizontal,
  BadgeCheck,
} from "lucide-react";
import {
  format, startOfToday, isSameDay, setHours, setMinutes,
  startOfMonth, endOfMonth, eachDayOfInterval, getDay,
  addMonths, subMonths, isBefore,
} from "date-fns";
import toast from "react-hot-toast";
import { getProvider, createBooking } from "@/lib/firestore";
import { resolvePricing, ResolvedPricing, calcCommission, getLiveCommissionRate } from "@/lib/pricing";
import { getProviderReviews, Review } from "@/lib/reviews";
import { db } from "@/lib/firebase";
import { collection, query, where, getCountFromServer, getDoc, doc } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import AuthGuard from "@/components/auth/AuthGuard";
import Image from "next/image";

const DAY_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

// ── Component ────────────────────────────────────────────────────────────────
export default function BookingPage() {
  const router = useRouter();
  const { id } = useParams();
  const { user, profile } = useAuth();

  const [provider, setProvider]             = useState<any>(null);
  const [loading, setLoading]               = useState(true);
  const [avgRating, setAvgRating]           = useState(0);
  const [reviewCount, setReviewCount]       = useState(0);
  const [completedJobs, setCompletedJobs]   = useState(0);
  const [isFav, setIsFav]                   = useState(false);
  const [pricing, setPricing]               = useState<ResolvedPricing | null>(null);
  const [pricingLoading, setPricingLoading] = useState(true);

  const [calMonth, setCalMonth]             = useState(startOfToday());
  const [selectedDate, setSelectedDate]     = useState(startOfToday());
  const [selectedOption, setSelectedOption] = useState(0);
  const [isSubmitting, setIsSubmitting]     = useState(false);
  const [isSuccess, setIsSuccess]           = useState(false);
  const [reviews, setReviews]               = useState<Review[]>([]);
  const [availability, setAvailability]     = useState<Record<string, any>>({});

  const today = startOfToday();

  // ── Fetch provider + pricing + stats ──────────────────────────────────
  useEffect(() => {
    if (!id) return;
    setLoading(true);

    getProvider(id as string)
      .then(async data => {
        if (!data) { toast.error("Provider not found"); router.push("/home"); return; }
        const prov = { ...data, id };
        setProvider(prov);
        try {
          setPricing(await resolvePricing(prov));
        } catch {
          setPricing(null);
        } finally {
          setPricingLoading(false);
        }
      })
      .catch(() => { toast.error("Error loading provider"); router.push("/home"); })
      .finally(() => setLoading(false));

    getProviderReviews(id as string).then(list => {
      setReviews(list);
      setReviewCount(list.length);
      if (list.length > 0)
        setAvgRating(Math.round((list.reduce((s, r) => s + r.rating, 0) / list.length) * 10) / 10);
    }).catch(() => {});

    getCountFromServer(
      query(collection(db, "bookings"), where("providerId", "==", id), where("status", "==", "completed"))
    ).then(s => setCompletedJobs(s.data().count)).catch(() => {});

    // Fetch provider availability from providers collection
    getDoc(doc(db, "providers", id as string))
      .then(docSnap => {
        if (docSnap.exists()) {
          const providerData = docSnap.data();
          const raw = providerData.availability;
          if (raw && typeof raw === "object" && !Array.isArray(raw)) {
            // Already in { monday: { available: true, ... }, ... } object format
            setAvailability(raw);
          } else if (Array.isArray(raw) && raw.length > 0) {
            // Convert ["Monday", "Wednesday"] array format → object format
            const obj: Record<string, { available: boolean }> = {};
            raw.forEach((day: string) => {
              obj[day.toLowerCase()] = { available: true };
            });
            setAvailability(obj);
          }
        }
      })
      .catch(() => {});
  }, [id, router]);

  // ── Calendar helpers ───────────────────────────────────────────────────
  const monthStart  = startOfMonth(calMonth);
  const monthEnd    = endOfMonth(calMonth);
  const calDays     = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startOffset = getDay(monthStart);

  // ── Availability helper ─────────────────────────────────────────────────
  const isDateAvailable = (date: Date) => {
    const dayName = format(date, "EEEE").toLowerCase();
    const dayAvailability = availability[dayName];
    return dayAvailability?.available || false;
  };

  // ── Derived ────────────────────────────────────────────────────────────
  const packages   = pricing?.packages ?? [];
  const finalPrice = packages[selectedOption]?.price ?? 0;
  const hasAvailabilitySet = Object.keys(availability).length > 0;
  const heroImage  = provider?.photoURL ||
    "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=800&h=800&fit=crop";
  const experience = provider?.experience
    ? provider.experience.toString().replace(/[^0-9]/g, "") || "5"
    : "5";

  // ── Submit ─────────────────────────────────────────────────────────────
  const handleBooking = async () => {
    if (!user?.uid || !profile) { toast.error("Please login to book"); return; }
    if (finalPrice === 0) { toast.error("No pricing set for this provider"); return; }
    setIsSubmitting(true);
    try {
      const bookingDate = setMinutes(setHours(selectedDate, 9), 0);
      const liveRate = await getLiveCommissionRate();
      const { totalAmount, commission, providerEarning } = calcCommission(finalPrice, liveRate);
      const result = await createBooking({
        customerId:     user.uid,
        customerName:   profile.name,
        customerPhoto:  profile.photoURL || null,
        providerId:     provider.userId || provider.id,
        providerName:   provider.name,
        providerPhoto:  provider.photoURL || null,
        category:       provider.category,
        serviceTitle:   provider.serviceTitle || provider.category,
        servicePackage: packages[selectedOption]?.label,
        pricingSource:  pricing?.source ?? "provider",
        date:           bookingDate,
        price:          totalAmount,
        totalAmount,
        commission,
        providerEarning,
        address:        profile.address || "Lagos, Nigeria",
        status:         "pending_payment",
        paymentStatus:  "pending",
      });

      if (result.success) {
        toast.success("Booking created! Redirecting to payment...");
        // Redirect to new payment checkout page
        setTimeout(() => {
          router.push(`/payment/checkout?bookingId=${result.id}`);
        }, 1000);
      } else {
        throw new Error("Failed to create booking");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to create booking");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────
  if (loading || pricingLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!provider) return null;

  // ── Success ────────────────────────────────────────────────────────────
  if (isSuccess) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
        <div className="rounded-full bg-green-100 p-8 text-green-500">
          <CheckCircle2 className="h-20 w-20" />
        </div>
        <h1 className="mt-8 text-3xl font-black text-text">Booking Confirmed!</h1>
        <p className="mt-3 text-sm font-bold text-text-light leading-relaxed max-w-xs">
          Your booking with <span className="text-text font-black">{provider.name}</span> is set for{" "}
          <span className="text-primary font-black">{format(selectedDate, "MMM do, yyyy")}</span>.
        </p>
        <div className="mt-8 w-full max-w-sm rounded-[2rem] bg-white p-6 shadow-xl border border-gray-100 text-left space-y-3">
          <div className="flex justify-between text-xs font-bold text-text-light uppercase tracking-wider">
            <span>Package</span>
            <span className="text-text font-black">{packages[selectedOption]?.label} — {packages[selectedOption]?.description}</span>
          </div>
          <div className="flex justify-between text-xs font-bold text-text-light uppercase tracking-wider">
            <span>Date</span>
            <span className="text-text font-black">{format(selectedDate, "EEE, MMM do yyyy")}</span>
          </div>
          <div className="h-px bg-gray-100" />
          <div className="flex justify-between items-center">
            <span className="text-xs font-black text-text uppercase tracking-widest">Total</span>
            <span className="text-2xl font-black text-primary">₦{finalPrice.toLocaleString()}</span>
          </div>
        </div>
        <div className="mt-6 w-full max-w-sm space-y-3">
          <button onClick={() => router.push("/bookings")}
            className="w-full rounded-[1.5rem] bg-gradient-to-r from-[#FF9A3E] to-[#FF8C00] py-5 font-black text-white shadow-xl shadow-primary/20 active:scale-95 transition-all">
            View My Bookings
          </button>
          <button onClick={() => router.push("/home")}
            className="w-full rounded-[1.5rem] border border-gray-100 bg-white py-4 font-black text-text-light active:scale-95 transition-all">
            Back to Home
          </button>
        </div>
      </main>
    );
  }

  // ── Package selector JSX ─────────────────────────────────────────────
  const packageSelectorJSX = (
    <div>
      <h3 className="text-[12px] font-black uppercase tracking-wider text-text-light mb-3">Choose a Package</h3>
      {packages.length === 0 ? (
        <div className="rounded-2xl bg-gray-50 border border-gray-100 px-5 py-6 text-center">
          <p className="text-sm font-bold text-text-light">No pricing available yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {packages.map((pkg, i: number) => {
            const isSelected = i === selectedOption;
            return (
              <button key={pkg.label} onClick={() => setSelectedOption(i)}
                className={`w-full flex items-center justify-between rounded-2xl px-4 py-3.5 border-2 transition-all ${
                  isSelected ? "border-primary bg-[#FFF4E5] shadow-sm shadow-primary/10" : "border-gray-100 bg-gray-50/60 hover:border-primary/30"
                }`}>
                <div className="flex items-center gap-3">
                  <div className={`h-4 w-4 rounded-full border-2 flex-shrink-0 transition-all ${isSelected ? "border-primary bg-primary" : "border-gray-300 bg-white"}`}>
                    {isSelected && <div className="h-full w-full rounded-full flex items-center justify-center"><div className="h-1.5 w-1.5 rounded-full bg-white" /></div>}
                  </div>
                  <div className="text-left">
                    <p className={`text-[13px] font-black ${isSelected ? "text-primary" : "text-text"}`}>{pkg.label}</p>
                    <p className="text-[10px] font-bold text-text-light mt-0.5">{pkg.description}</p>
                  </div>
                </div>
                <span className={`text-[15px] font-black ${isSelected ? "text-primary" : "text-text"}`}>₦{pkg.price.toLocaleString()}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  // ── Shared booking button JSX ─────────────────────────────────────────
  const bookingButtonJSX = (extraClass = "") => (
    <button onClick={handleBooking} disabled={isSubmitting || finalPrice === 0}
      className={`flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[15px] font-black transition-all shadow-lg shadow-primary/20 ${
        isSubmitting || finalPrice === 0
          ? "bg-primary/60 text-white cursor-not-allowed"
          : "bg-gradient-to-r from-[#FF9A3E] to-[#FF8C00] text-white hover:shadow-xl active:scale-[0.98]"
      } ${extraClass}`}>
      {isSubmitting ? (
        <><span className="h-5 w-5 animate-spin rounded-full border-b-2 border-t-2 border-white" />Booking...</>
      ) : (
        <><CheckCircle2 className="h-5 w-5" />{finalPrice > 0 ? `Book ${provider.name.split(" ")[0]} — ₦${finalPrice.toLocaleString()}` : "No pricing set"}</>
      )}
    </button>
  );

  // ── Calendar (shared) ─────────────────────────────────────────────────
  const calendarPickerJSX = (
    <div>
      <h3 className="text-[12px] font-black uppercase tracking-wider text-text-light mb-3">Select a Date</h3>
      {hasAvailabilitySet && Object.values(availability).every((day: any) => !day?.available) && (
        <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
          <p className="text-[11px] font-medium text-yellow-800">Contact this provider to discuss scheduling.</p>
        </div>
      )}
      {!hasAvailabilitySet && (
        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-[11px] font-medium text-blue-800">All dates are currently available.</p>
        </div>
      )}
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setCalMonth(prev => subMonths(prev, 1))} disabled={isBefore(subMonths(calMonth, 1), today)}
          className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-gray-100 disabled:opacity-30 transition-all">
          <ChevronLeft className="h-4 w-4 text-text" />
        </button>
        <span className="text-[13px] font-black text-text">{format(calMonth, "MMMM yyyy")}</span>
        <button onClick={() => setCalMonth(prev => addMonths(prev, 1))}
          className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-gray-100 transition-all">
          <ChevronRight className="h-4 w-4 text-text" />
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map(d => <div key={d} className="text-center text-[9px] font-black text-text-light uppercase tracking-wider py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {Array.from({ length: startOffset }).map((_, i) => <div key={`e-${i}`} />)}
        {calDays.map(day => {
          const isPast  = isBefore(day, today);
          const isToday = isSameDay(day, today);
          const isSel   = isSameDay(day, selectedDate);
          const isAvailable = hasAvailabilitySet ? isDateAvailable(day) : true;
          const isDisabled = isPast || (hasAvailabilitySet && !isAvailable);
          return (
            <button key={day.toString()} onClick={() => !isDisabled && setSelectedDate(day)} disabled={isDisabled}
              className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-black transition-all ${
                isSel ? "bg-primary text-white shadow-lg shadow-primary/30" :
                isToday && isAvailable ? "text-primary border-2 border-primary" :
                isDisabled ? "text-gray-300 cursor-not-allowed bg-gray-100" :
                isAvailable ? "text-text hover:bg-primary/10" :
                "text-gray-400 cursor-not-allowed bg-gray-50"
              }`}>
              {format(day, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );

  // ── Main Screen ────────────────────────────────────────────────────────
  return (
    <AuthGuard>
      <main className="min-h-screen bg-[#FFF8F0] pb-28 lg:pb-12 overflow-x-hidden">

        {/* Fixed Header — mobile only */}
        <header className="fixed top-0 z-50 w-full flex items-center justify-between px-5 pt-4 pb-3 pointer-events-none lg:hidden">
          <button onClick={() => router.back()}
            className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white/90 backdrop-blur-sm shadow-sm border border-gray-100 active:scale-95 transition-all">
            <ChevronLeft className="h-5 w-5 text-text" />
          </button>
          <h1 className="text-[15px] font-black text-white">Schedule {provider.name.split(" ")[0]}</h1>
          <button onClick={() => setIsFav(!isFav)}
            className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white/90 backdrop-blur-sm shadow-sm border border-gray-100 active:scale-95 transition-all">
            <Heart className={`h-5 w-5 transition-colors ${isFav ? "fill-red-500 text-red-500" : "text-gray-400"}`} />
          </button>
        </header>

        {/* Desktop top bar */}
        <div className="hidden lg:flex items-center gap-3 bg-white border-b border-gray-100 px-8 py-4">
          <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-gray-100 transition-colors">
            <ChevronLeft className="h-5 w-5 text-text" />
          </button>
          <span className="text-[13px] font-bold text-text-light">Back</span>
          <span className="ml-auto text-[13px] font-black text-text">{provider.name} — {provider.category}</span>
          <button onClick={() => setIsFav(!isFav)} className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-gray-100 transition-colors">
            <Heart className={`h-5 w-5 transition-colors ${isFav ? "fill-red-500 text-red-500" : "text-gray-400"}`} />
          </button>
        </div>

        {/* Hero — mobile only */}
        <section className="relative h-[360px] w-full overflow-hidden bg-gradient-to-b from-[#FFEBD1] via-[#FFE0B8] to-[#FFF8F0] lg:hidden">
          <Image src={heroImage} alt={provider.name} fill className="object-cover object-top" priority />
          <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-[#FFF8F0] to-transparent z-10" />
          <div className="absolute bottom-14 left-5 z-20 flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur-sm px-3 py-1.5 shadow-md border border-white lg:hidden">
            <Star className="h-3.5 w-3.5 fill-primary text-primary" />
            <span className="text-[12px] font-black text-text">{avgRating > 0 ? avgRating : "New"}</span>
            {reviewCount > 0 && <span className="text-[10px] font-bold text-text-light">({reviewCount >= 1000 ? (reviewCount / 1000).toFixed(1) + "k" : reviewCount})</span>}
          </div>
        </section>

        {/* ── DESKTOP LAYOUT ── */}
        <div className="hidden lg:block bg-white border-b border-gray-100 shadow-sm">
          <div className="max-w-6xl mx-auto px-6 py-5">
            <div className="flex items-center gap-5">
              <div className="relative h-20 w-20 rounded-2xl overflow-hidden border-2 border-gray-100 flex-shrink-0 shadow-sm">
                <Image src={heroImage} alt={provider.name} fill className="object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-[22px] font-black text-text">{provider.name}</h2>
                  <BadgeCheck className="h-5 w-5 text-primary fill-primary/10" />
                </div>
                <p className="text-[13px] font-bold text-text-light mt-0.5">{provider.category} · {provider.city || "Lagos, Nigeria"}</p>
                <div className="mt-2 flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-primary text-primary" />
                    <span className="text-[13px] font-black text-text">{avgRating > 0 ? avgRating : "New"}</span>
                    {reviewCount > 0 && <span className="text-[11px] font-bold text-text-light">({reviewCount} reviews)</span>}
                  </div>
                  <span className="text-gray-200">|</span>
                  <div className="flex items-center gap-1">
                    <Briefcase className="h-3.5 w-3.5 text-text-light" />
                    <span className="text-[12px] font-bold text-text-light">{experience} yrs experience</span>
                  </div>
                  <span className="text-gray-200">|</span>
                  <div className="flex items-center gap-1">
                    <Users2 className="h-3.5 w-3.5 text-text-light" />
                    <span className="text-[12px] font-bold text-text-light">{completedJobs} completed jobs</span>
                  </div>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                {finalPrice > 0 ? (
                  <>
                    <span className="text-[28px] font-black text-text">₦{finalPrice.toLocaleString()}</span>
                    <span className="text-[12px] font-bold text-text-light"> / service</span>
                    {pricing?.source === "category" && <p className="text-[10px] font-bold text-orange-400 uppercase tracking-wider mt-0.5">Category rate</p>}
                  </>
                ) : (
                  <span className="text-sm font-bold text-text-light">Price TBD</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── DESKTOP 2-COL BODY ── */}
        <div className="hidden lg:block max-w-6xl mx-auto px-6 py-8">
          <div className="grid grid-cols-3 gap-8 items-start">

            {/* LEFT: About + Bio + Reviews */}
            <div className="col-span-2 space-y-6">

              {/* About card */}
              {provider.bio && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h3 className="text-[12px] font-black uppercase tracking-wider text-text-light mb-3">About</h3>
                  <p className="text-[14px] font-semibold text-text leading-relaxed">{provider.bio}</p>
                </div>
              )}

              {/* Reviews */}
              {reviews.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[12px] font-black uppercase tracking-wider text-text-light">Customer Reviews</h3>
                    <div className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                      <span className="text-[13px] font-black text-text">{avgRating}</span>
                      <span className="text-[11px] font-bold text-text-light ml-1">({reviewCount})</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {reviews.slice(0, 4).map(rv => (
                      <div key={rv.id} className="flex items-start gap-3 border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                          {rv.customerPhoto
                            ? <Image src={rv.customerPhoto} alt={rv.customerName} width={36} height={36} className="object-cover" />
                            : <span className="text-[12px] font-black text-primary">{rv.customerName?.charAt(0).toUpperCase()}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-[13px] font-black text-text">{rv.customerName}</p>
                            <div className="flex items-center gap-0.5">
                              {[1,2,3,4,5].map(s => <Star key={s} className={`h-3 w-3 ${s <= rv.rating ? "fill-primary text-primary" : "text-gray-200"}`} />)}
                            </div>
                          </div>
                          <p className="text-[9px] font-bold text-text-light mt-0.5">{rv.createdAt?.toDate ? format(rv.createdAt.toDate(), "MMM dd, yyyy") : ""}</p>
                          <p className="text-[12px] font-semibold text-text-light leading-relaxed mt-1">"{rv.comment}"</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT: Sticky booking panel */}
            <div className="col-span-1">
              <div className="sticky top-6 bg-white rounded-2xl border border-gray-100 shadow-md p-5 space-y-5">
                <div>
                  {finalPrice > 0 ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-[26px] font-black text-text">₦{finalPrice.toLocaleString()}</span>
                      <span className="text-[12px] font-bold text-text-light">/ service</span>
                    </div>
                  ) : (
                    <span className="text-sm font-bold text-text-light">Price TBD</span>
                  )}
                </div>
                <div className="h-px bg-gray-100" />
                {packageSelectorJSX}
                <div className="h-px bg-gray-100" />
                {calendarPickerJSX}
                <div className="h-px bg-gray-100" />
                {finalPrice > 0 && selectedDate && (
                  <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 space-y-1.5 text-[12px]">
                    <div className="flex justify-between">
                      <span className="font-bold text-text-light">Service fee</span>
                      <span className="font-black text-text">₦{finalPrice.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-bold text-text-light">Selected date</span>
                      <span className="font-black text-text">{format(selectedDate, "EEE, MMM d")}</span>
                    </div>
                    <div className="border-t border-gray-200 pt-1.5 flex justify-between">
                      <span className="font-black text-text">Total</span>
                      <span className="font-black text-primary">₦{finalPrice.toLocaleString()}</span>
                    </div>
                  </div>
                )}
                {bookingButtonJSX()}
              </div>
            </div>

          </div>
        </div>

        {/* ── MOBILE LAYOUT ── */}
        <div className="lg:hidden relative -mt-6 rounded-t-[2.5rem] bg-white px-5 pt-7 pb-6 shadow-[0_-10px_40px_rgba(0,0,0,0.04)] z-20">
          <div className="absolute top-3 left-1/2 -translate-x-1/2 h-1 w-10 rounded-full bg-gray-200" />

          {/* Provider info */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-[18px] font-black text-text">{provider.name}</h2>
                <BadgeCheck className="h-4 w-4 text-primary fill-primary/10" />
              </div>
              <div className="mt-1 flex items-center gap-1 text-xs font-bold text-text-light">
                <MapPin className="h-3 w-3 text-primary" />
                <span>{provider.city || "Lagos, Nigeria"}</span>
              </div>
            </div>
            <div className="text-right">
              {finalPrice > 0 ? (
                <>
                  <span className="text-[22px] font-black text-text">₦{finalPrice.toLocaleString()}</span>
                  <span className="text-[11px] font-bold text-text-light"> / service</span>
                  {pricing?.source === "category" && <p className="text-[9px] font-bold text-orange-400 uppercase tracking-wider mt-0.5">Category rate</p>}
                </>
              ) : <span className="text-sm font-bold text-text-light">Price TBD</span>}
            </div>
          </div>

          {/* Packages */}
          <div className="mt-6">{packageSelectorJSX}</div>

          {/* Date picker */}
          <div className="mt-7">{calendarPickerJSX}</div>

          {/* Reviews */}
          {reviews.length > 0 && (
            <div className="mt-7 pb-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[13px] font-black text-text">Customer Reviews</h3>
                <div className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                  <span className="text-[13px] font-black text-text">{avgRating}</span>
                  <span className="text-[11px] font-bold text-text-light ml-1">({reviewCount})</span>
                </div>
              </div>
              <div className="space-y-3">
                {reviews.slice(0, 5).map(rv => (
                  <div key={rv.id} className="rounded-2xl bg-gray-50 border border-gray-100 px-4 py-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                          {rv.customerPhoto
                            ? <Image src={rv.customerPhoto} alt={rv.customerName} width={32} height={32} className="object-cover" />
                            : <span className="text-[11px] font-black text-primary">{rv.customerName?.charAt(0).toUpperCase()}</span>}
                        </div>
                        <div>
                          <p className="text-[12px] font-black text-text">{rv.customerName}</p>
                          <p className="text-[9px] font-bold text-text-light">{rv.createdAt?.toDate ? format(rv.createdAt.toDate(), "MMM dd, yyyy") : ""}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {[1,2,3,4,5].map(s => <Star key={s} className={`h-3 w-3 ${s <= rv.rating ? "fill-primary text-primary" : "text-gray-200"}`} />)}
                      </div>
                    </div>
                    <p className="text-[12px] font-bold text-text-light leading-relaxed">"{rv.comment}"</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Mobile sticky book button */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl px-5 py-4 border-t border-gray-100 z-50">
          {bookingButtonJSX("py-[18px]")}
        </div>

      </main>
    </AuthGuard>
  );
}

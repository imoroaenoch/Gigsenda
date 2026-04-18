"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { 
  ChevronLeft, Share2, Star, Zap, Calendar, MessageSquare, 
  Phone, Briefcase, Users, DollarSign, Users2, Clock
} from "lucide-react";
import Image from "next/image";
import { createConversation } from "@/lib/chat";
import { getProvider, getFavorites, toggleFavorite } from "@/lib/firestore";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import AuthGuard from "@/components/auth/AuthGuard";
import toast from "react-hot-toast";
import { getProviderReviews, Review } from "@/lib/reviews";
import { format } from "date-fns";

const tabs = ["About", "Availability", "Experience", "Reviews"];

export default function ProviderProfilePage() {
  const router = useRouter();
  const { id } = useParams();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("About");
  const [isFavorite, setIsFavorite] = useState(false);
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [favLoading, setFavLoading] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [provider, setProvider] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [completedCount, setCompletedCount] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchAll = async () => {
      setLoading(true);
      try {
        const data = await getProvider(id as string);
        if (data) {
          let availDays: string[] = [];
          if (Array.isArray(data.availability)) {
            availDays = data.availability;
          } else if (data.availability && typeof data.availability === "object") {
            availDays = Object.entries(data.availability)
              .filter(([_, v]: [string, any]) => v?.available)
              .map(([day]) => day.charAt(0).toUpperCase() + day.slice(1));
          }
          setProvider({
            ...data, id,
            availability: availDays,
            image: data.photoURL || "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=800&h=800&fit=crop",
            price: data.hourlyRate || data.price || 0,
            specialization: data.serviceTitle || data.category || "Professional"
          });
          // Fetch completed bookings count for this provider
          try {
            const bSnap = await getDocs(query(collection(db, "bookings"), where("providerId", "==", id as string), where("status", "==", "completed")));
            setCompletedCount(bSnap.size);
          } catch { setCompletedCount(0); }
        } else {
          toast.error("Provider not found");
          router.replace("/search");
        }
      } catch { toast.error("Error loading profile"); }
      finally { setLoading(false); }
    };
    fetchAll();

    setLoadingReviews(true);
    getProviderReviews(id as string)
      .then(setReviews)
      .catch(err => console.error(err))
      .finally(() => setLoadingReviews(false));
  }, [id]);

  useEffect(() => {
    if (user?.uid && id) {
      getFavorites(user.uid).then(favs => {
        setIsFavorite(favs.includes(id as string));
      });
    }
  }, [user?.uid, id]);

  const handleShare = async () => {
    const url = window.location.href;
    const title = `${provider?.name} on Gigsenda`;
    if (navigator.share) {
      try { await navigator.share({ title, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Profile link copied!");
    }
  };

  const experienceLabel = (() => {
    if (!provider?.experience) return "5 years";
    const m = String(provider.experience).match(/\d+/);
    return m ? `${m[0]} years` : String(provider.experience);
  })();

  const handleStartChat = async () => {
    if (!user?.uid) { router.push("/login"); return; }
    setIsStartingChat(true);
    try {
      const cid = await createConversation(user.uid, provider.id, `initial_${user.uid}_${provider.id}`);
      router.push(`/chat/${cid}`);
    } catch { toast.error("Failed to start conversation"); }
    finally { setIsStartingChat(false); }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "About": return (
        <div>
          <h2 className="text-lg font-semibold text-text">About {provider.name}</h2>
          <p className="mt-4 text-[13px] font-semibold text-text leading-[1.6]">{provider.bio}</p>
          <div className="mt-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative h-11 w-11 overflow-hidden rounded-full border-2 border-primary/10">
                <Image src={provider.image} alt={provider.name} fill className="object-cover" />
              </div>
              <div>
                <h4 className="text-[15px] font-semibold text-text">{provider.name}</h4>
                <p className="text-[11px] font-medium text-text-light">{provider.category?.split(" ")[0]}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleStartChat}
                onTouchEnd={(e) => { e.preventDefault(); handleStartChat(); }}
                disabled={isStartingChat}
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary/10 text-primary active:opacity-70 disabled:opacity-50">
                {isStartingChat ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" /> : <MessageSquare className="h-5 w-5" />}
              </button>
              <button
                onClick={() => toast.success("Phone calls are disabled. Please use in-app chat.")}
                onTouchEnd={(e) => { e.preventDefault(); toast.success("Phone calls are disabled. Please use in-app chat."); }}
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary/10 text-primary active:opacity-70">
                <Phone className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="rounded-2xl bg-gray-50/50 p-4 border-2 border-orange-400">
              <div className="flex items-center gap-2 text-text-light mb-1">
                <div className="h-6 w-6 rounded-lg bg-white shadow-sm flex items-center justify-center border-2 border-orange-400"><DollarSign className="h-3.5 w-3.5 text-orange-600" /></div>
                <span className="text-[10px] font-medium uppercase tracking-tight">Service Fee</span>
              </div>
              <p className="text-lg font-medium text-text">&#8358;{provider.price.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl bg-gray-50/50 p-4 border-2 border-blue-400">
              <div className="flex items-center gap-2 text-text-light mb-1">
                <div className="h-6 w-6 rounded-lg bg-white shadow-sm flex items-center justify-center border-2 border-blue-400"><Users className="h-3.5 w-3.5 text-blue-600" /></div>
                <span className="text-[10px] font-medium uppercase tracking-tight">Experience</span>
              </div>
              <p className="text-lg font-medium text-text">{experienceLabel}</p>
            </div>
          </div>
          
          {/* Availability Summary */}
          {provider.availability && provider.availability.length > 0 && (
            <div className="mt-6 rounded-2xl bg-[#FFF4E5]/50 p-4 border-2 border-primary/30">
              <div className="flex items-center gap-2 text-text-light mb-2">
                <div className="h-6 w-6 rounded-lg bg-white shadow-sm flex items-center justify-center border-2 border-primary"><Calendar className="h-3.5 w-3.5 text-primary" /></div>
                <span className="text-[10px] font-medium uppercase tracking-tight">Working Days</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {provider.availability.slice(0, 4).map((day: string) => (
                  <span 
                    key={day}
                    className="px-2 py-1 rounded-full bg-white text-primary text-[11px] font-medium border border-primary/30"
                  >
                    {day.slice(0, 3)}
                  </span>
                ))}
                {provider.availability.length > 4 && (
                  <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-medium">
                    +{provider.availability.length - 4} more
                  </span>
                )}
              </div>
              {provider.startTime && provider.endTime && (
                <p className="mt-2 text-[12px] font-medium text-text-light">
                  <Clock className="inline h-3 w-3 mr-1" />
                  {provider.startTime} - {provider.endTime}
                </p>
              )}
            </div>
          )}
        </div>
      );
      case "Reviews": return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text">Customer Reviews</h2>
            <div className="flex items-center gap-1.5 rounded-xl bg-orange-50 px-3 py-1.5">
              <Star className="h-4 w-4 fill-primary text-primary" />
              <span className="text-xs font-medium text-primary">{provider.rating || "New"}</span>
              <span className="text-[10px] font-medium text-text-light">({reviews.length})</span>
            </div>
          </div>
          {loadingReviews ? (
            <div className="flex flex-col items-center py-12 gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-xs font-medium text-text-light">Loading reviews...</p>
            </div>
          ) : reviews.length > 0 ? (
            <div className="space-y-6 pb-6">
              {reviews.map(review => (
                <div key={review.id} className="border-b border-gray-100 pb-6 last:border-0">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-10 w-10 overflow-hidden rounded-full bg-gray-100">
                        {review.customerPhoto ? <Image src={review.customerPhoto} alt={review.customerName} fill className="object-cover" /> : <div className="flex h-full w-full items-center justify-center text-gray-400"><Users2 className="h-5 w-5" /></div>}
                      </div>
                      <div>
                        <h4 className="text-[13px] font-semibold text-text leading-tight">{review.customerName}</h4>
                        <p className="text-[10px] font-medium text-text-light mt-0.5">{review.createdAt ? format(review.createdAt.toDate(), "MMM do, yyyy") : "Recently"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {[1,2,3,4,5].map(s => <Star key={s} className={`h-3 w-3 ${s <= review.rating ? "fill-primary text-primary" : "text-gray-200"}`} />)}
                    </div>
                  </div>
                  <p className="text-[13px] font-semibold text-text leading-relaxed">&ldquo;{review.comment}&rdquo;</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-12 text-center">
              <div className="rounded-full bg-gray-50 p-8 text-gray-200 mb-4"><MessageSquare className="h-10 w-10" /></div>
              <h3 className="text-base font-semibold text-text">No reviews yet</h3>
              <p className="text-xs font-medium text-text-light mt-1 max-w-[200px]">Be the first to share your experience!</p>
            </div>
          )}
        </div>
      );
      case "Availability": return (
        <div>
          <h2 className="text-lg font-semibold text-text">Availability</h2>
          {provider.availability && provider.availability.length > 0 ? (
            <div className="mt-4 space-y-3">
              <p className="text-[13px] text-text-light">Available on the following days:</p>
              <div className="flex flex-wrap gap-2">
                {provider.availability.map((day: string) => (
                  <span 
                    key={day}
                    className="px-4 py-2 rounded-full bg-[#FFF4E5] text-primary text-[13px] font-medium border border-primary/20"
                  >
                    {day}
                  </span>
                ))}
              </div>
              {provider.startTime && provider.endTime && (
                <div className="mt-4 p-4 rounded-2xl bg-gray-50/50 border border-gray-100">
                  <div className="flex items-center gap-2 text-text-light mb-1">
                    <Clock className="h-4 w-4" />
                    <span className="text-[11px] font-medium uppercase tracking-tight">Working Hours</span>
                  </div>
                  <p className="text-[15px] font-semibold text-text">
                    {provider.startTime} - {provider.endTime}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center py-12 text-center">
              <div className="rounded-full bg-gray-50 p-8 text-gray-200 mb-4"><Calendar className="h-10 w-10" /></div>
              <h3 className="text-base font-semibold text-text">No availability set</h3>
              <p className="text-xs font-medium text-text-light mt-1">This provider hasn&apos;t set their availability yet.</p>
            </div>
          )}
        </div>
      );
      case "Experience": return (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-text">Experience</h2>

          {/* Years of experience */}
          <div className="flex items-center gap-3 rounded-2xl bg-[#FFF4E5]/50 border-2 border-primary/20 p-4">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Briefcase className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-[15px] font-bold text-text">{experienceLabel} of experience</p>
              <p className="text-[11px] font-medium text-text-light">{provider.category}</p>
            </div>
          </div>

          {/* Skills */}
          {provider.skills && provider.skills.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-[11px] font-black uppercase tracking-wider text-text-light">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {provider.skills.map((skill: string, i: number) => (
                  <span key={i} className="rounded-full bg-primary/10 px-3 py-1.5 text-[12px] font-bold text-primary border border-primary/20">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Certifications */}
          {provider.certifications && provider.certifications.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-[11px] font-black uppercase tracking-wider text-text-light">Certifications & Qualifications</h3>
              <div className="space-y-2">
                {provider.certifications.map((cert: string, i: number) => (
                  <div key={i} className="flex items-center gap-2.5 rounded-xl bg-green-50 border border-green-100 px-3 py-2.5">
                    <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <span className="text-[13px] font-bold text-green-800">{cert}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Portfolio / Past Work */}
          {provider.portfolioItems && provider.portfolioItems.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-[11px] font-black uppercase tracking-wider text-text-light">Past Work & Portfolio</h3>
              <div className="space-y-2">
                {provider.portfolioItems.map((item: string, i: number) => (
                  <div key={i} className="flex items-start gap-2.5 rounded-xl bg-gray-50 border border-gray-100 px-3 py-3">
                    <span className="text-primary font-black text-[14px] leading-tight flex-shrink-0 mt-0.5">→</span>
                    <p className="text-[13px] font-semibold text-text leading-snug">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fallback if nothing is filled in yet */}
          {!provider.skills?.length && !provider.certifications?.length && !provider.portfolioItems?.length && (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="rounded-full bg-gray-50 p-8 text-gray-200 mb-4"><Briefcase className="h-10 w-10" /></div>
              <p className="text-sm font-semibold text-text-light">No additional details added yet</p>
              <p className="text-xs font-medium text-gray-400 mt-1">Check back later for portfolio and certifications</p>
            </div>
          )}
        </div>
      );
      default: return (
        <div className="flex flex-col items-center py-20 text-center">
          <div className="rounded-full bg-gray-50 p-8 text-gray-200 mb-4"><Zap className="h-10 w-10" /></div>
          <h3 className="text-base font-semibold text-text">{activeTab} coming soon</h3>
          <p className="text-xs font-medium text-text-light mt-1">We are currently building this section.</p>
        </div>
      );
    }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-white"><div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  if (!provider) return <div className="flex min-h-screen flex-col items-center justify-center bg-white p-6 text-center"><h1 className="text-xl font-semibold text-text">Provider not found</h1><button onClick={() => router.push("/home")} className="mt-6 rounded-2xl bg-primary px-8 py-3 font-medium text-white uppercase tracking-widest text-xs">Back to Home</button></div>;

  const ratingValue = provider.rating ? Number(provider.rating) : 0;
  const ratingStars = (
    <div className="flex items-center gap-1">
      <span className="text-[13px] font-black text-text leading-tight">{ratingValue > 0 ? ratingValue.toFixed(1) : "New"}</span>
      {ratingValue > 0 && <Star className="h-3.5 w-3.5 fill-[#8B5CF6] text-[#8B5CF6]" />}
    </div>
  );

  const statCards = [
    { icon: Briefcase, bg: "bg-[#FFF4E5]", iconColor: "text-[#FF8C00]", borderColor: "border-orange-300", value: experienceLabel, label: "Experience", customValue: null },
    { icon: Star,     bg: "bg-[#F0E6FF]", iconColor: "fill-[#8B5CF6] text-[#8B5CF6]", borderColor: "border-purple-300", value: provider.rating ? provider.rating.toFixed(1) : "New", label: "Rating", customValue: ratingStars },
    { icon: Users2,   bg: "bg-[#E6F4FF]", iconColor: "text-[#0088FF]", borderColor: "border-blue-300", value: completedCount !== null ? `${completedCount}+` : "...", label: "Customers", customValue: null },
  ];

  const FavButton = ({ size = "md" }: { size?: "sm" | "md" }) =>  (
    <button
      disabled={favLoading}
      onClick={async () => {
        if (!user?.uid || !provider?.id) return;
        setFavLoading(true);
        try {
          const favs = await getFavorites(user.uid);
          const updated = await toggleFavorite(user.uid, provider.id, favs);
          const nowFav = updated.includes(provider.id);
          setIsFavorite(nowFav);
          toast.success(nowFav ? "Saved to favorites!" : "Removed from favorites");
        } catch { toast.error("Failed to update favorites"); }
        finally { setFavLoading(false); }
      }}
      className={`touch-manipulation flex items-center justify-center rounded-2xl border-2 border-gray-100 text-gray-400 active:opacity-70 disabled:opacity-50 ${size === "sm" ? "h-10 w-10" : "h-14 w-14"}`}>
      <Star className={`transition-colors ${size === "sm" ? "h-5 w-5" : "h-6 w-6"} ${isFavorite ? "fill-primary text-primary" : ""}`} />
    </button>
  );

  return (
    <AuthGuard>
      <main className="min-h-screen bg-[#FFF8F0] pb-28 lg:pb-0">

        {/* ── MOBILE header (floating over hero) ── */}
        <header className="fixed top-0 z-50 w-full px-4 pt-4 pb-4 flex items-center justify-between lg:hidden">
          <button
            onClick={() => router.back()}
            onTouchEnd={(e) => { e.preventDefault(); router.back(); }}
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm border border-gray-100 active:opacity-70">
            <ChevronLeft className="h-5 w-5 text-text" />
          </button>
          <div className="flex flex-col items-center pointer-events-none">
            <h1 className="text-base font-semibold text-white leading-tight">{provider.name}</h1>
            <p className="text-[10px] font-medium text-white/80">{provider.specialization}</p>
          </div>
          <button
            onClick={handleShare}
            onTouchEnd={(e) => { e.preventDefault(); handleShare(); }}
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm border border-gray-100 active:opacity-70">
            <Share2 className="h-5 w-5 text-text" />
          </button>
        </header>

        {/* ── DESKTOP top bar ── */}
        <div className="hidden lg:flex items-center gap-3 bg-white border-b border-gray-100 px-8 py-4 sticky top-0 z-50">
          <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-gray-100 transition-colors">
            <ChevronLeft className="h-5 w-5 text-text" />
          </button>
          <span className="text-[13px] font-bold text-text-light">Back</span>
          <span className="ml-auto text-[13px] font-black text-text">{provider.name} · {provider.category}</span>
          <button onClick={handleShare} className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-gray-100 transition-colors">
            <Share2 className="h-4 w-4 text-text" />
          </button>
        </div>

        {/* ── MOBILE full-bleed hero ── */}
        <section className="relative h-[480px] w-full overflow-hidden lg:hidden">
          <div className="relative h-full w-full flex justify-center items-end">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent z-10" />
            <div className="absolute top-28 right-6 z-30 flex flex-col items-end pointer-events-none">
              <div className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 fill-primary/20 text-primary" /><span className="text-[10px] font-medium text-white uppercase tracking-tight">{provider.category}</span></div>
              <h3 className="text-lg font-semibold text-white mt-0.5">{provider.name}</h3>
              <p className="text-[11px] font-medium text-white/90">{experienceLabel}</p>
              <div className="mt-2 rounded-lg bg-primary px-3 py-1 text-[11px] font-medium text-white shadow-lg shadow-primary/20">&#8358;{provider.price.toLocaleString()}/service</div>
            </div>
            <div className="relative h-full w-full">
              <Image src={provider.image} alt={provider.name} fill className="object-cover object-center" priority />
              <div className="absolute bottom-0 left-0 h-1/3 w-full bg-gradient-to-t from-[#FFF8F0] to-transparent" />
            </div>
          </div>
          <div className="absolute bottom-6 left-0 w-full px-4 flex justify-between gap-3 z-40">
            {statCards.map(card => (
              <div key={card.label} className={`flex-1 rounded-[1.5rem] bg-white p-3 shadow-xl shadow-black/5 border-2 ${card.borderColor} flex flex-col items-start gap-1`}>
                <div className={`h-8 w-8 rounded-xl ${card.bg} flex items-center justify-center border-2 ${card.borderColor}`}><card.icon className={`h-4 w-4 ${card.iconColor}`} /></div>
                <div className="mt-1">
                  {card.customValue ? card.customValue : <p className="text-[13px] font-semibold text-text leading-tight">{card.value}</p>}
                  <p className="text-[9px] font-medium text-text-light uppercase tracking-tight">{card.label}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── DESKTOP profile header card ── */}
        <div className="hidden lg:block bg-white border-b border-gray-100 shadow-sm">
          <div className="max-w-5xl mx-auto px-6 py-6">
            <div className="flex items-start gap-6">
              <div className="relative h-24 w-24 rounded-2xl overflow-hidden border-2 border-gray-100 flex-shrink-0 shadow-sm">
                <Image src={provider.image} alt={provider.name} fill className="object-cover" priority />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-[24px] font-black text-text">{provider.name}</h1>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-black text-primary border border-primary/20">{provider.category}</span>
                </div>
                <p className="text-[13px] font-bold text-text-light mt-1">{provider.specialization} · {provider.city || "Lagos, Nigeria"}</p>
                <div className="mt-3 grid grid-cols-3 gap-3 max-w-lg">
                  {statCards.map(card => (
                    <div key={card.label} className={`rounded-xl bg-gray-50 border ${card.borderColor} p-3 flex items-center gap-2.5`}>
                      <div className={`h-8 w-8 rounded-lg ${card.bg} flex items-center justify-center flex-shrink-0`}><card.icon className={`h-4 w-4 ${card.iconColor}`} /></div>
                      <div>
                        {card.customValue ? card.customValue : <p className="text-[13px] font-black text-text leading-tight">{card.value}</p>}
                        <p className="text-[9px] font-bold text-text-light uppercase tracking-tight">{card.label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex-shrink-0 flex flex-col items-end gap-3">
                <div className="text-right">
                  <span className="text-[26px] font-black text-text">₦{provider.price.toLocaleString()}</span>
                  <span className="text-[12px] font-bold text-text-light"> / service</span>
                </div>
                <div className="flex items-center gap-2">
                  <FavButton size="sm" />
                  <button
                    onClick={() => router.push(`/book/${provider.id}`)}
                    style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                    className="flex items-center gap-2 h-11 px-6 rounded-2xl bg-gradient-to-r from-[#FF9A3E] to-[#FF8C00] text-white font-black text-[14px] shadow-lg shadow-primary/20 active:opacity-80">
                    <Calendar className="h-4 w-4" />
                    Hire {provider.name.split(" ")[0]}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── MOBILE sheet + tabs ── */}
        <section className="relative -mt-4 min-h-[500px] w-full rounded-t-[2.5rem] bg-white px-6 pt-8 z-30 lg:hidden" style={{ boxShadow: '0 -10px 40px rgba(0,0,0,0.04)' }}>
          <div className="absolute top-3 left-1/2 -translate-x-1/2 h-1.5 w-12 rounded-full bg-primary/20" />
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                onTouchEnd={(e) => { e.preventDefault(); setActiveTab(tab); }}
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', cursor: 'pointer' }}
                className={`px-5 py-2.5 rounded-full text-[13px] font-medium whitespace-nowrap ${activeTab === tab ? "bg-[#FFF4E5] text-primary shadow-sm" : "bg-gray-50 text-text-light"}`}>
                {tab}
              </button>
            ))}
          </div>
          <div className="mt-8">{renderTabContent()}</div>
        </section>

        {/* ── DESKTOP tabs + content ── */}
        <div className="hidden lg:block max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-0 mb-6">
            {tabs.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-5 py-3 text-[13px] font-bold transition-all border-b-2 -mb-px ${activeTab === tab ? "border-primary text-primary" : "border-transparent text-text-light hover:text-text"}`}>
                {tab}
              </button>
            ))}
          </div>
          <div className="max-w-3xl">{renderTabContent()}</div>
        </div>

        {/* ── MOBILE sticky footer ── */}
        <footer className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 px-6 py-4 flex items-center gap-4 z-50 lg:hidden">
          <button
            onClick={() => router.push(`/book/${provider.id}`)}
            onTouchEnd={(e) => { e.preventDefault(); router.push(`/book/${provider.id}`); }}
            style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
            className="flex-1 flex items-center justify-center gap-2 h-14 rounded-2xl bg-gradient-to-r from-[#FF9A3E] to-[#FF8C00] text-white font-medium text-[15px] shadow-xl shadow-primary/20 active:opacity-80">
            <Calendar className="h-5 w-5" />
            Hire {provider.name.split(" ")[0]}
          </button>
          <FavButton />
        </footer>
      </main>
    </AuthGuard>
  );
}

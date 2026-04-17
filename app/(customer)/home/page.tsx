"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, 
  Settings2, 
  Star, 
  Zap,
  MoreHorizontal,
  ChevronRight,
  Heart,
  MapPin,
  Calendar,
  User as UserIcon,
  X,
  Briefcase,
  SlidersHorizontal,
  TrendingUp,
  Gift,
  Scissors,
  Wrench,
  Sparkles,
  Hammer,
  BookOpen,
  Camera,
  PartyPopper,
  Palette,
  Home,
  LayoutGrid,
  ArrowUpRight,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import Image from "next/image";
import { getProviders, getFavorites, toggleFavorite } from "@/lib/firestore";
import toast from "react-hot-toast";
import FilterBottomSheet from "@/components/search/FilterBottomSheet";
import { SearchFilters } from "@/lib/search";
import AuthGuard from "@/components/auth/AuthGuard";
import BottomNav from "@/components/common/BottomNav";
import NotificationBell from "@/components/common/NotificationBell";
import { subscribeCategoriesWithSubs, CategoryWithSubs } from "@/lib/categories";

const CATEGORY_ICONS: Record<string, any> = {
  "Barber": Scissors,
  "Plumber": Wrench,
  "Electrician": Zap,
  "Cleaner": Sparkles,
  "Carpenter": Hammer,
  "Tutor": BookOpen,
  "Photographer": Camera,
  "Event Planner": PartyPopper,
  "Hair Stylist": Scissors,
  "Makeup Artist": Palette,
  "Home Services": Home,
  "All": LayoutGrid,
};

const CATEGORY_COLORS: Record<string, string> = {
  "Barber": "text-pink-500",
  "Plumber": "text-blue-500",
  "Electrician": "text-yellow-500",
  "Cleaner": "text-green-500",
  "Carpenter": "text-amber-600",
  "Tutor": "text-purple-500",
  "Photographer": "text-indigo-500",
  "Event Planner": "text-red-500",
  "Hair Stylist": "text-pink-500",
  "Makeup Artist": "text-purple-400",
  "Home Services": "text-orange-500",
  "All": "text-gray-500",
};

export default function HomePage() {
  const router = useRouter();
  const { profile, loading, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    category: "All",
    minRating: 0,
    minPrice: undefined,
    maxPrice: undefined,
    availabilityDays: [],
  });

  // Hero banner slides
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const slides = [
    {
      id: 1,
      badge: "POPULAR",
      title: "Hire a Service Man",
      subtitle: "Need help with wiring, repairs or installations?",
      buttonText: "Book Now",
      backgroundImage: "/hero-service-man.jpg",
      background: "from-[#FF9A3E] to-[#FF8C00]",
      badgeBg: "bg-white/30",
      cardImage: "/card.png",
    },
    {
      id: 2,
      badge: "TRENDING",
      title: "Find a Tutor Today",
      subtitle: "Get the best private tutors for your kids near you",
      buttonText: "Find Tutor",
      backgroundImage: "/hero-tutor.jpg",
      background: "from-[#8B5CF6] to-[#7C3AED]",
      badgeBg: "bg-white/30",
      cardImage: "/herotutor.png",
    },
    {
      id: 3,
      badge: "NEW",
      title: "Book Event Services",
      subtitle: "Photographers, planners and MCs for your special day",
      buttonText: "Explore",
      backgroundImage: "/heroeventservices.png",
      background: "from-[#3B82F6] to-[#2563EB]",
      badgeBg: "bg-white/30",
      cardImage: "/heroeventservices.png",
    },
  ];

  // Auto-rotate slides
  useEffect(() => {
    if (isPaused || !slides || slides.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [isPaused, slides]);

  // Touch handlers for swipe functionality
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(0);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      // Swipe left - go to next slide
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    } else if (isRightSwipe) {
      // Swipe right - go to previous slide
      setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    }
  };

  // Navigate to specific slide
  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };
  const [providersList, setProvidersList] = useState<any[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [categories, setCategories] = useState<CategoryWithSubs[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    const unsub = subscribeCategoriesWithSubs((data) => setCategories(data));
    return () => unsub();
  }, []);

  useEffect(() => {
    async function fetchRealProviders() {
      try {
        setIsDataLoading(true);
        const data = await getProviders();
        setProvidersList(data);
      } catch (error) {
        console.error("Error fetching providers:", error);
      } finally {
        setIsDataLoading(false);
      }
    }
    fetchRealProviders();
  }, []);

  useEffect(() => {
    if (user?.uid) {
      getFavorites(user.uid).then(setFavorites);
    }
  }, [user?.uid]);

  // Loading check with shorter timeout to allow authentication to work
  const [showContent, setShowContent] = useState(false);
  
  useEffect(() => {
    // Show content after 3 seconds even if still loading
    const timer = setTimeout(() => {
      setShowContent(true);
    }, 3000);
    
    // If loading completes, show content immediately
    if (!loading) {
      setShowContent(true);
      clearTimeout(timer);
    }
    
    return () => clearTimeout(timer);
  }, [loading]);
  
  if (!showContent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-t-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const firstName = profile?.name?.split(' ')[0]?.toUpperCase() || 'THERE';

  const filteredProviders = providersList.filter(p => {
    const matchesCategory = activeCategory === "all" ||
      p.category === activeCategory ||
      p.subcategory === activeCategory;

    const searchLow = searchQuery.toLowerCase();
    const matchesSearch = searchQuery === "" ||
      p.name?.toLowerCase().includes(searchLow) ||
      p.category?.toLowerCase().includes(searchLow) ||
      p.serviceTitle?.toLowerCase().includes(searchLow);

    return matchesCategory && matchesSearch;
  });

  const handleApplyFilters = (newFilters: SearchFilters) => {
    setIsFilterOpen(false);
    const params = new URLSearchParams();
    
    const finalCategory = newFilters.category && newFilters.category !== "All" 
      ? newFilters.category 
      : (activeCategory !== "All" ? activeCategory : "All");
    
    if (finalCategory !== "All") params.set("category", finalCategory);
    if (newFilters.minRating) params.set("minRating", newFilters.minRating.toString());
    if (newFilters.minPrice) params.set("minPrice", newFilters.minPrice.toString());
    if (newFilters.maxPrice) params.set("maxPrice", newFilters.maxPrice.toString());
    if (newFilters.availabilityDays && newFilters.availabilityDays.length > 0) {
      params.set("days", newFilters.availabilityDays.join(","));
    }
    
    if (searchQuery.trim()) {
      params.set("q", searchQuery.trim());
    }
    
    router.push(`/search?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <AuthGuard>
      <main className="min-h-screen bg-white pb-24 lg:pb-8 overflow-x-hidden">

        {/* ── MOBILE STICKY TOP BAR ── */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <div className="flex items-center gap-1.5">
              <h1 className="text-[22px] font-black tracking-tight text-gray-900">Gigsenda</h1>
              <Zap className="h-4 w-4 fill-primary text-primary" />
            </div>
            <div className="flex items-center gap-2">
              {profile?.role === "provider" && (
                <button
                  onClick={() => {
                    localStorage.removeItem("viewAsCustomer");
                    router.push("/provider/dashboard");
                  }}
                  className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-[10px] font-bold text-primary active:scale-95 transition-all"
                >
                  Provider Mode
                </button>
              )}
              <NotificationBell />
            </div>
          </div>
        </div>

        {/* Spacer so content doesn't hide under fixed mobile bar */}
        <div className="h-[56px] lg:hidden" />

        {/* ── HEADER ── */}
        <div className="bg-gradient-to-b from-[#FFF5E9] to-white">
          <header className="px-4 pt-4 pb-4 lg:pt-8 lg:pb-6 max-w-7xl mx-auto lg:px-8">

            {/* Desktop top row: title + actions */}
            <div className="hidden lg:flex items-center justify-between">
              <div>
                  <p className="text-[13px] font-medium text-gray-400">Hello, {firstName} 👋</p>
                  <h1 className="text-[26px] font-black tracking-tight text-gray-900 leading-tight">What service do you need?</h1>
              </div>
              <div className="flex items-center gap-3">
                {profile?.role === "provider" && (
                  <button
                    onClick={() => {
                      localStorage.removeItem("viewAsCustomer");
                      router.push("/provider/dashboard");
                    }}
                    className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-[10px] font-bold text-primary active:scale-95 transition-all"
                  >
                    Provider Mode
                  </button>
                )}
                {/* Desktop search + filter inline */}
                <form onSubmit={handleSearchSubmit} className="hidden lg:flex items-center gap-2">
                  <div className="flex items-center rounded-2xl bg-gray-100 px-4 py-2.5 w-72 group focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/20 focus-within:shadow-sm transition-all">
                    <Search className="h-4 w-4 text-gray-400 flex-shrink-0 group-focus-within:text-primary transition-colors" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search services or providers..."
                      className="ml-2.5 w-full text-[13px] font-medium text-gray-800 bg-transparent outline-none placeholder:text-gray-400"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsFilterOpen(true)}
                    className="flex h-[42px] w-[42px] items-center justify-center rounded-2xl bg-primary text-white shadow-md shadow-primary/25 active:scale-95 transition-all"
                  >
                    <Settings2 className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>

            {/* Mobile-only greeting */}
            <div className="mt-3 lg:hidden">
              <p className="text-[12px] font-medium text-gray-400">Hello, {firstName} 👋</p>
              <h2 className="text-[20px] font-black text-gray-900 leading-tight">What service do you need?</h2>
            </div>

            {/* Mobile-only search */}
            <form onSubmit={handleSearchSubmit} className="mt-3 flex gap-2 lg:hidden">
              <div className="flex flex-1 items-center rounded-2xl bg-gray-100 px-4 py-3 group focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/20 focus-within:shadow-sm transition-all">
                <Search className="h-4 w-4 text-gray-400 flex-shrink-0 group-focus-within:text-primary transition-colors" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search services or providers..."
                  className="ml-2.5 w-full text-[13px] font-medium text-gray-800 bg-transparent outline-none placeholder:text-gray-400"
                />
              </div>
              <button
                type="button"
                onClick={() => setIsFilterOpen(true)}
                className="flex h-[46px] w-[46px] items-center justify-center rounded-2xl bg-primary text-white shadow-md shadow-primary/25 active:scale-95 transition-all"
              >
                <Settings2 className="h-4 w-4" />
              </button>
            </form>

            {/* Subcategory quick filters */}
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-hide lg:flex-wrap lg:overflow-visible lg:pb-0">
              <button
                onClick={() => setActiveCategory("all")}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-1.5 text-[11px] font-semibold transition-all ${
                  activeCategory === "all" ? "bg-primary text-white" : "bg-gray-100 text-gray-500"
                }`}
              >
                <LayoutGrid className="h-3 w-3" />
                All
              </button>
              {categories && categories.flatMap(cat => cat.subcategories || []).map((sub) => {
                const IconComponent = CATEGORY_ICONS[sub.name] || Briefcase;
                const isActive = activeCategory === sub.name;
                return (
                  <button
                    key={sub.id}
                    onClick={() => setActiveCategory(sub.name)}
                    className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-1.5 text-[11px] font-semibold transition-all ${
                      isActive ? "bg-primary text-white" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    <IconComponent className="h-3 w-3" />
                    {sub.name}
                  </button>
                );
              })}
            </div>
          </header>
        </div>

        {/* ── HERO CARDS ── */}
        <section className="mt-3 pl-4 w-full lg:mt-6 lg:pl-0">
          <div className="max-w-7xl mx-auto lg:px-8">
            <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide snap-x snap-mandatory pr-4 lg:grid lg:grid-cols-3 lg:gap-5 lg:overflow-visible lg:pr-0 lg:pb-0">
              {slides.map((slide) => (
                <div
                  key={slide.id}
                  className="relative h-[175px] lg:h-52 w-[95%] flex-shrink-0 lg:w-auto rounded-3xl snap-start overflow-hidden shadow-md shadow-primary/20 "
                >
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${slide.backgroundImage})` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-[#FFAA40] via-[#FF8C00] to-[#C85E00] opacity-92" />
                  {/* Decorative curvy lines */}
                  <svg className="absolute inset-0 w-full h-full opacity-[0.12]" viewBox="0 0 400 175" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M-40 120 Q60 60 160 100 Q260 140 360 70 Q420 40 460 80" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
                    <path d="M-40 150 Q80 90 180 130 Q280 170 380 100 Q430 70 470 110" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/>
                    <path d="M-20 80 Q80 30 180 65 Q280 100 380 40 Q430 15 460 50" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                  </svg>
                  <div className="relative z-10 w-[62%] h-full flex flex-col justify-between p-5">
                    <div>
                      <span className="inline-block rounded-full bg-white/25 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white">
                        {slide.badge}
                      </span>
                      <h2 className="mt-2 text-[16px] font-black text-white leading-snug break-words">
                        {slide.title}
                      </h2>
                      <p className="mt-1 text-[10px] font-medium text-white/80 leading-snug max-w-[150px]">
                        {slide.subtitle}
                      </p>
                    </div>
                    <button
                      onClick={() => router.push("/search")}
                      className="flex items-center gap-1.5 w-fit rounded-full bg-white pl-4 pr-1.5 py-1.5 text-[11px] font-bold text-black shadow-sm active:scale-95 transition-all"
                    >
                      {slide.buttonText}
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black flex-shrink-0">
                        <ArrowUpRight className="h-3 w-3 text-white" />
                      </span>
                    </button>
                  </div>
                  <div className="absolute bottom-0 right-0 h-full w-[45%] select-none pointer-events-none">
                    <div className="relative h-full w-full">
                      <Image src={slide.cardImage} alt="Service Provider" fill className="object-contain object-bottom" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SERVICES / CATEGORY FILTER ── */}
        <section className="mt-8 lg:mt-10">
          <div className="max-w-7xl mx-auto px-4 lg:px-8">
            <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4 lg:p-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[15px] font-black text-gray-900">Our Services</h2>
                <button
                  onClick={() => setIsMenuOpen(true)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-400 active:scale-95 transition-all"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide lg:flex-wrap lg:overflow-visible lg:pb-0">
                <button
                  onClick={() => setActiveCategory("all")}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-1.5 text-[11px] font-semibold transition-all ${
                    activeCategory === "all" ? "bg-primary text-white" : "bg-gray-100 text-gray-500 border border-gray-300"
                  }`}
                >
                  <Zap className="h-3 w-3" />
                  All
                </button>
                {categories.map((cat) => {
                  const IconComp = CATEGORY_ICONS[cat.name] || Zap;
                  const isActive = activeCategory === cat.name;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.name)}
                      className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-1.5 text-[11px] font-semibold transition-all ${
                        isActive ? "bg-primary text-white" : "bg-gray-100 text-gray-500 border border-gray-300"
                      }`}
                    >
                      <IconComp className="h-3 w-3" />
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ── PROVIDERS GRID ── */}
        <section className="mt-6 lg:mt-8 lg:pb-10">
          <div className="max-w-7xl mx-auto lg:px-8">
            <div className="flex gap-4 overflow-x-auto pb-6 px-4 scrollbar-hide lg:overflow-visible lg:grid lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 lg:gap-5 lg:pb-0 lg:px-0">
              {isDataLoading ? (
                [1, 2, 3, 4].map(i => (
                  <div key={i} className="w-[168px] h-[210px] flex-shrink-0 lg:w-auto lg:h-auto rounded-2xl bg-gray-100 animate-pulse shadow-sm"></div>
                ))
              ) : filteredProviders.length > 0 ? (
                filteredProviders.map((provider, index) => (
                  <div
                    key={provider.id}
                    onClick={() => router.push(`/provider/${provider.id}`)}
                    className={`w-[168px] flex-shrink-0 lg:w-auto lg:flex-shrink group relative rounded-2xl bg-white p-2.5 shadow-[0_6px_18px_-2px_rgba(0,0,0,0.10)] hover:shadow-[0_10px_24px_-2px_rgba(0,0,0,0.14)] border border-gray-100/60 transition-all duration-200 cursor-pointer ${index === filteredProviders.length - 1 ? 'mr-4 lg:mr-0' : ''}`}
                  >
                    <div className="relative h-[110px] lg:h-auto lg:aspect-[4/3] w-full rounded-xl overflow-hidden mb-3 bg-gray-50">
                      {provider.photoURL || provider.image ? (
                        <Image
                          src={provider.photoURL || provider.image}
                          alt={provider.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-gray-200">
                          <UserIcon className="h-8 w-8" />
                        </div>
                      )}
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!user?.uid) return;
                          const updated = await toggleFavorite(user.uid, provider.id, favorites);
                          setFavorites(updated);
                          const added = updated.includes(provider.id);
                          toast.success(added ? `${provider.name} saved!` : `Removed from favorites`, { icon: added ? '❤️' : '🤍' });
                        }}
                        className="absolute right-2 top-2 h-6 w-6 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm shadow-sm"
                      >
                        <Heart className={`h-3.5 w-3.5 transition-colors ${favorites.includes(provider.id) ? "fill-red-500 text-red-500" : "text-gray-400"}`} />
                      </button>
                    </div>
                    <h3 className="text-[12px] font-bold text-gray-900 truncate">{provider.name}</h3>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Star className="h-2.5 w-2.5 fill-orange-400 text-orange-400" />
                      <span className="text-[10px] font-semibold text-gray-600">{provider.rating || "5.0"}</span>
                      <span className="text-[10px] text-gray-400 ml-0.5">· {provider.category}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-[11px] font-bold text-primary">₦{provider.hourlyRate || provider.price}</p>
                      <button
                        onClick={(e) => { e.stopPropagation(); router.push(`/provider/${provider.id}`); }}
                        className="px-2.5 py-0.5 bg-primary text-white text-[9px] font-bold rounded-full active:scale-95 transition-all"
                      >
                        Book
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="w-full py-10 flex flex-col items-center justify-center text-center bg-white rounded-[2rem] border border-dashed border-gray-200 lg:col-span-full">
                  <p className="text-sm font-semibold text-text-light mb-2">No providers found</p>
                  <p className="text-xs font-semibold text-text-light">Try adjusting your filters or search terms</p>
                  <button
                    onClick={() => setActiveCategory("All")}
                    className="mt-2 text-[10px] font-semibold text-primary underline"
                  >
                    View All Providers
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        <BottomNav />

        <div className="lg:max-w-5xl lg:mx-auto">
        <FilterBottomSheet 
          isOpen={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          onApply={handleApplyFilters}
          currentFilters={filters}
        />

        </div>
        {/* ── Quick Actions Bottom Sheet ──────────────────────────── */}
        {isMenuOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
              onClick={() => setIsMenuOpen(false)}
            />
            {/* Sheet */}
            <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-[2.5rem] bg-white px-5 pt-5 pb-10 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
              {/* Handle + header */}
              <div className="mb-5 flex items-center justify-between">
                <div className="absolute top-3 left-1/2 -translate-x-1/2 h-1 w-10 rounded-full bg-gray-200" />
                <h3 className="text-[15px] font-bold text-text mt-2">Quick Actions</h3>
                <button onClick={() => setIsMenuOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-text-light active:scale-95 transition-all">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    icon: Search,
                    label: "Browse All Services",
                    desc: "See every provider available",
                    action: () => { setIsMenuOpen(false); router.push("/search"); },
                    bg: "bg-blue-50", color: "text-blue-500",
                  },
                  {
                    icon: SlidersHorizontal,
                    label: "Filter & Sort",
                    desc: "Narrow by price, rating & more",
                    action: () => { setIsMenuOpen(false); setIsFilterOpen(true); },
                    bg: "bg-primary/10", color: "text-primary",
                  },
                  {
                    icon: TrendingUp,
                    label: "Top Rated",
                    desc: "Highest rated providers",
                    action: () => { setIsMenuOpen(false); router.push("/search?minRating=4"); },
                    bg: "bg-yellow-50", color: "text-yellow-500",
                  },
                  {
                    icon: Calendar,
                    label: "My Bookings",
                    desc: "View & manage your bookings",
                    action: () => { setIsMenuOpen(false); router.push("/bookings"); },
                    bg: "bg-green-50", color: "text-green-500",
                  },
                  {
                    icon: Briefcase,
                    label: "Become a Provider",
                    desc: "Offer your services on Gigsenda",
                    action: () => { setIsMenuOpen(false); router.push("/provider-setup"); },
                    bg: "bg-purple-50", color: "text-purple-500",
                  },
                  {
                    icon: Gift,
                    label: "Refer a Friend",
                    desc: "Invite friends & earn rewards",
                    action: () => { setIsMenuOpen(false); toast.success("Referral feature coming soon!"); },
                    bg: "bg-pink-50", color: "text-pink-500",
                  },
                ].map((item) => (
                  <button key={item.label} onClick={item.action}
                    className="flex flex-col gap-2 rounded-2xl border border-gray-100 bg-gray-50/50 p-4 text-left active:scale-[0.97] transition-all hover:border-primary/20">
                    <div className={`h-9 w-9 rounded-xl ${item.bg} flex items-center justify-center`}>
                      <item.icon className={`h-4.5 w-4.5 ${item.color}`} />
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-text leading-tight">{item.label}</p>
                      <p className="text-[10px] font-medium text-text-light mt-0.5 leading-tight">{item.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </AuthGuard>
  );
}

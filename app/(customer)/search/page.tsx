"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search as SearchIcon, SlidersHorizontal, Star, X } from "lucide-react";
import { useSearch } from "@/hooks/useSearch";
import ProviderCard from "@/components/search/ProviderCard";
import FilterBottomSheet from "@/components/search/FilterBottomSheet";
import AuthGuard from "@/components/auth/AuthGuard";
import BottomNav from "@/components/common/BottomNav";

function SearchContent() {
  const router = useRouter();
  const { 
    searchTerm, 
    setSearchTerm, 
    filters, 
    updateFilters, 
    results, 
    loading 
  } = useSearch();

  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const RATINGS = [4, 3, 2];
  const CATEGORIES = ["All", "Plumber", "Electrician", "Cleaner", "Tutor", "Photographer", "Barber", "Carpenter"];
  const hasActiveFilters = Object.values(filters).some(v => v !== undefined && v !== "All" && (Array.isArray(v) ? v.length > 0 : v !== 0));

  return (
    <main className="min-h-screen bg-white pb-24 lg:pb-8">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white px-4 pt-4 pb-3 border-b border-gray-100 lg:px-8 lg:pt-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/home")}
            className="lg:hidden rounded-full p-2 text-gray-500 hover:bg-gray-100 transition-all active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 relative group">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search services or providers..."
              className="w-full rounded-2xl bg-gray-100 py-3 pl-10 pr-4 text-sm font-medium text-gray-800 outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all lg:py-3.5 lg:text-base"
            />
          </div>
          {/* Mobile filter button */}
          <button
            onClick={() => setIsFilterOpen(true)}
            className={`lg:hidden rounded-xl p-3 border transition-all active:scale-95 ${
              hasActiveFilters ? "bg-primary text-white border-primary shadow-md" : "bg-white text-text-light border-gray-100 shadow-sm"
            }`}
          >
            <SlidersHorizontal className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-light">
            {loading ? "Searching..." : `${results.length} ${results.length === 1 ? "provider" : "providers"} found`}
          </p>
          {hasActiveFilters && (
            <button onClick={() => updateFilters({ category: "All", minRating: 0, minPrice: undefined, maxPrice: undefined, availabilityDays: [] })}
              className="text-[10px] font-bold text-red-500 hover:underline">
              Clear filters
            </button>
          )}
        </div>
      </header>

      <div className="lg:flex lg:gap-0">
        {/* ── Desktop Filters Sidebar ─────────────────────────────────── */}
        <aside className="hidden lg:block w-[260px] flex-shrink-0 sticky top-[89px] h-[calc(100vh-89px)] overflow-y-auto bg-white border-r border-gray-100 px-5 py-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[13px] font-black text-gray-900">Filters</h3>
            {hasActiveFilters && (
              <button onClick={() => updateFilters({ category: "All", minRating: 0, minPrice: undefined, maxPrice: undefined, availabilityDays: [] })}
                className="text-[10px] font-bold text-red-500 hover:underline">Clear all</button>
            )}
          </div>

          {/* Category */}
          <div className="mb-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Category</p>
            <div className="space-y-1">
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => updateFilters({ ...filters, category: cat })}
                  className={`w-full text-left px-3 py-2 rounded-xl text-[13px] font-semibold transition-all ${
                    (filters.category || "All") === cat
                      ? "bg-primary/10 text-primary"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Min Rating */}
          <div className="mb-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Min Rating</p>
            <div className="space-y-1">
              {[0, ...RATINGS].map(r => (
                <button key={r} onClick={() => updateFilters({ ...filters, minRating: r })}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-semibold transition-all ${
                    (filters.minRating || 0) === r
                      ? "bg-primary/10 text-primary"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}>
                  {r === 0 ? "Any rating" : <><Star className="h-3.5 w-3.5 fill-orange-400 text-orange-400" />{r}+ stars</>}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div className="mb-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Max Price (₦)</p>
            <input type="number" placeholder="e.g. 50000"
              value={filters.maxPrice ?? ""}
              onChange={e => updateFilters({ ...filters, maxPrice: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] font-medium outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
            />
          </div>
        </aside>

        {/* ── Results ─────────────────────────────────────────────────── */}
        <div className="flex-1 px-4 py-6 lg:px-8">
          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="animate-pulse rounded-[2rem] bg-white p-5 h-[160px] border border-gray-100 shadow-sm" />
              ))}
            </div>
          ) : results.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {results.map((provider) => (
                <ProviderCard key={provider.id} provider={provider} />
              ))}
            </div>
          ) : (
            <div className="mt-16 flex flex-col items-center justify-center text-center px-8">
              <div className="h-20 w-20 rounded-full bg-primary/5 flex items-center justify-center mb-5">
                <SearchIcon className="h-9 w-9 text-primary/30" />
              </div>
              <h2 className="text-lg font-bold text-text">No providers found</h2>
              <p className="mt-2 text-[13px] font-medium text-text-light">
                Try adjusting your filters or search terms.
              </p>
              <button
                onClick={() => updateFilters({ category: "All", minRating: 0, minPrice: undefined, maxPrice: undefined, availabilityDays: [] })}
                className="mt-6 rounded-2xl bg-primary px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Filter Sheet */}
      <FilterBottomSheet
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        onApply={updateFilters}
        currentFilters={filters}
      />
      <BottomNav />
    </main>
  );
}

export default function SearchPage() {
  return (
    <AuthGuard>
      <Suspense fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      }>
        <SearchContent />
      </Suspense>
    </AuthGuard>
  );
}

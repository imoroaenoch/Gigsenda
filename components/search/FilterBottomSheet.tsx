"use client";

import { useState, useEffect } from "react";
import { X, Star, Check } from "lucide-react";
import { SearchFilters } from "@/lib/search";
import { subscribeCategoriesWithSubs, CategoryWithSubs } from "@/lib/categories";

interface FilterBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: SearchFilters) => void;
  currentFilters: SearchFilters;
}

const DAYS = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
];

export default function FilterBottomSheet({ 
  isOpen, 
  onClose, 
  onApply, 
  currentFilters 
}: FilterBottomSheetProps) {
  const [filters, setFilters] = useState<SearchFilters>(currentFilters);
  const [categories, setCategories] = useState<CategoryWithSubs[]>([]);

  useEffect(() => {
    setFilters(currentFilters);
  }, [currentFilters]);

  useEffect(() => {
    const unsub = subscribeCategoriesWithSubs((data) => setCategories(data));
    return () => unsub();
  }, []);

  const toggleCategory = (category: string) => {
    setFilters(prev => ({ ...prev, category: prev.category === category ? "All" : category }));
  };

  const toggleDay = (day: string) => {
    setFilters(prev => {
      const currentDays = prev.availabilityDays || [];
      const newDays = currentDays.includes(day)
        ? currentDays.filter(d => d !== day)
        : [...currentDays, day];
      return { ...prev, availabilityDays: newDays };
    });
  };

  const handleReset = () => {
    const resetFilters: SearchFilters = {
      category: "All",
      minRating: 0,
      minPrice: undefined,
      maxPrice: undefined,
      availabilityDays: [],
    };
    setFilters(resetFilters);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-300">
      <div 
        className="relative w-full max-w-lg animate-slide-up rounded-t-[3rem] bg-white px-6 pb-12 pt-8 shadow-2xl ring-1 ring-black/5"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-black text-text">Filters</h2>
          <div className="flex items-center gap-6">
            <button 
              onClick={handleReset}
              className="text-xs font-black text-primary uppercase tracking-wider hover:opacity-70 transition-all"
            >
              Reset All
            </button>
            <button 
              onClick={onClose}
              className="rounded-full bg-gray-50 p-2 text-text-light hover:bg-gray-100 transition-all"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="space-y-10 overflow-y-auto max-h-[70vh] pb-10">
          {/* Category */}
          <section>
            <h3 className="text-[10px] font-black uppercase tracking-wider text-text-light mb-4">Category</h3>
            <div className="flex flex-wrap gap-2.5">
              {/* All option */}
              <button
                onClick={() => toggleCategory("All")}
                className={`rounded-full px-5 py-2.5 text-xs font-black transition-all ${
                  filters.category === "All"
                    ? "bg-primary text-white shadow-lg shadow-primary/20"
                    : "bg-gray-50 text-text-light border border-gray-100 hover:bg-gray-100"
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => toggleCategory(cat.name)}
                  className={`rounded-full px-5 py-2.5 text-xs font-black transition-all ${
                    filters.category === cat.name
                      ? "bg-primary text-white shadow-lg shadow-primary/20"
                      : "bg-gray-50 text-text-light border border-gray-100 hover:bg-gray-100"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </section>

          {/* Rating */}
          <section>
            <h3 className="text-[10px] font-black uppercase tracking-wider text-text-light mb-4">Minimum Rating</h3>
            <div className="flex items-center justify-between gap-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  onClick={() => setFilters({ ...filters, minRating: rating })}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-2xl py-3.5 transition-all ${
                    filters.minRating === rating
                      ? "bg-primary text-white shadow-lg shadow-primary/20"
                      : "bg-gray-50 text-text-light border border-gray-100 hover:bg-gray-100"
                  }`}
                >
                  <span className="text-sm font-black">{rating}</span>
                  <Star className={`h-3.5 w-3.5 ${filters.minRating === rating ? "fill-white" : "fill-gray-300 text-gray-300"}`} />
                </button>
              ))}
            </div>
          </section>

          {/* Price Range */}
          <section>
            <h3 className="text-[10px] font-black uppercase tracking-wider text-text-light mb-4">Price Range (₦/hr)</h3>
            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-text-light pl-1">Min Price</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-text-light">₦</span>
                  <input
                    type="number"
                    value={filters.minPrice || ""}
                    onChange={(e) => setFilters({ ...filters, minPrice: Number(e.target.value) || undefined })}
                    placeholder="0"
                    className="w-full rounded-2xl bg-gray-50 border border-gray-100 py-3.5 pl-8 pr-4 text-sm font-black text-text outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>
              <div className="flex-1 space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-text-light pl-1">Max Price</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-text-light">₦</span>
                  <input
                    type="number"
                    value={filters.maxPrice || ""}
                    onChange={(e) => setFilters({ ...filters, maxPrice: Number(e.target.value) || undefined })}
                    placeholder="100,000"
                    className="w-full rounded-2xl bg-gray-50 border border-gray-100 py-3.5 pl-8 pr-4 text-sm font-black text-text outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Availability */}
          <section>
            <h3 className="text-[10px] font-black uppercase tracking-wider text-text-light mb-4">Availability</h3>
            <div className="grid grid-cols-2 gap-3">
              {DAYS.map((day) => (
                <button
                  key={day}
                  onClick={() => toggleDay(day)}
                  className={`flex items-center justify-between gap-2 rounded-2xl px-5 py-3.5 text-xs font-black transition-all ${
                    filters.availabilityDays?.includes(day)
                      ? "bg-primary/5 text-primary border-2 border-primary"
                      : "bg-gray-50 text-text-light border border-gray-100 hover:bg-gray-100"
                  }`}
                >
                  {day}
                  {filters.availabilityDays?.includes(day) && (
                    <div className="rounded-full bg-primary p-0.5">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-8">
          <button
            onClick={() => {
              onApply(filters);
              onClose();
            }}
            className="w-full rounded-[1.5rem] bg-primary py-5 text-sm font-black text-white shadow-2xl shadow-primary/30 active:scale-95 transition-all"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}

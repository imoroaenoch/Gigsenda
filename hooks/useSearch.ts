"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { searchProviders, SearchFilters } from "@/lib/search";

export const useSearch = () => {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const initialCategory = searchParams.get("category") || "All";
  const initialMinRating = Number(searchParams.get("minRating")) || 0;
  const initialMinPrice = searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : undefined;
  const initialMaxPrice = searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined;
  const initialDays = searchParams.get("days") ? searchParams.get("days")?.split(",") : [];

  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [debouncedTerm, setDebouncedTerm] = useState(initialQuery);
  const [filters, setFilters] = useState<SearchFilters>({
    category: initialCategory,
    minRating: initialMinRating,
    minPrice: initialMinPrice,
    maxPrice: initialMaxPrice,
    availabilityDays: initialDays,
  });
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync state with URL search params
  useEffect(() => {
    const q = searchParams.get("q") || "";
    const cat = searchParams.get("category") || "All";
    const minR = Number(searchParams.get("minRating")) || 0;
    const minP = searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : undefined;
    const maxP = searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined;
    const days = searchParams.get("days") ? searchParams.get("days")?.split(",") : [];

    setSearchTerm(q);
    setDebouncedTerm(q);
    setFilters({
      category: cat,
      minRating: minR,
      minPrice: minP,
      maxPrice: maxP,
      availabilityDays: days,
    });
  }, [searchParams]);

  // Handle debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const performSearch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await searchProviders(debouncedTerm, filters);
      setResults(data);
    } catch (err: any) {
      console.error("Search error:", err);
      setError(err.message || "Failed to fetch results");
    } finally {
      setLoading(false);
    }
  }, [debouncedTerm, filters]);

  useEffect(() => {
    performSearch();
  }, [performSearch]);

  const updateFilters = (newFilters: SearchFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const clearFilters = () => {
    setFilters({
      category: "All",
      minRating: 0,
      minPrice: undefined,
      maxPrice: undefined,
      availabilityDays: [],
    });
  };

  return {
    searchTerm,
    setSearchTerm,
    filters,
    updateFilters,
    clearFilters,
    results,
    loading,
    error,
    refresh: performSearch
  };
};

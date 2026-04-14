import { db } from "./firebase";
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit 
} from "firebase/firestore";

export interface SearchFilters {
  category?: string;
  minRating?: number;
  minPrice?: number;
  maxPrice?: number;
  availabilityDays?: string[];
  city?: string;
}

/**
 * searches providers in Firestore and filters them in memory for complex criteria
 */
export const searchProviders = async (searchTerm: string = "", filters: SearchFilters = {}) => {
  try {
    const providersRef = collection(db, "providers");
    let firestoreProviders: any[] = [];

    try {
      // Basic query for approved providers
      let q = query(providersRef, where("isApproved", "==", true));

      // If category is provided, add it to the query
      if (filters.category && filters.category !== "All") {
        q = query(q, where("category", "==", filters.category));
      }

      const querySnapshot = await getDocs(q);
      firestoreProviders = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (dbError) {
      console.error("Firestore query failed, likely missing index:", dbError);
    }

    let filteredResults = firestoreProviders;

    // Apply category filter (important for dummy data which isn't filtered by Firestore query)
    if (filters.category && filters.category !== "All") {
      filteredResults = filteredResults.filter(p => p.category === filters.category);
    }

    // In-memory filtering for more complex or text-based search
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filteredResults = filteredResults.filter(p => 
        p.name?.toLowerCase().includes(lowerSearch) || 
        p.serviceTitle?.toLowerCase().includes(lowerSearch) ||
        p.category?.toLowerCase().includes(lowerSearch) ||
        p.city?.toLowerCase().includes(lowerSearch) ||
        p.bio?.toLowerCase().includes(lowerSearch)
      );
    }

    // Apply other filters in-memory
    if (filters.minRating) {
      filteredResults = filteredResults.filter(p => (p.rating || 0) >= (filters.minRating || 0));
    }

    if (filters.minPrice !== undefined) {
      filteredResults = filteredResults.filter(p => (p.hourlyRate || 0) >= (filters.minPrice || 0));
    }

    if (filters.maxPrice !== undefined) {
      filteredResults = filteredResults.filter(p => (p.hourlyRate || 0) <= (filters.maxPrice || Infinity));
    }

    if (filters.availabilityDays && filters.availabilityDays.length > 0) {
      filteredResults = filteredResults.filter(p => 
        p.availability?.some((day: string) => filters.availabilityDays?.includes(day)) || true
      );
    }

    if (filters.city) {
      filteredResults = filteredResults.filter(p => p.city?.toLowerCase() === filters.city?.toLowerCase());
    }

    return filteredResults;
  } catch (error) {
    console.error("Error in searchProviders:", error);
    return [];
  }
};

/**
 * Returns top rated approved providers
 */
export const getFeaturedProviders = async (count: number = 5) => {
  try {
    const providersRef = collection(db, "providers");
    const q = query(
      providersRef, 
      where("isApproved", "==", true),
      orderBy("rating", "desc"),
      limit(count)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting featured providers:", error);
    // Fallback if index is not created yet
    const all = await searchProviders();
    return all.sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, count);
  }
};

/**
 * Returns all approved providers in a category
 */
export const getProvidersByCategory = async (category: string) => {
  return searchProviders("", { category });
};

/**
 * Returns providers in the same city as the customer
 */
export const getNearbyProviders = async (city: string) => {
  return searchProviders("", { city });
};

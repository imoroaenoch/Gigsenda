import { db } from "./firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  getDocs,
  where,
} from "firebase/firestore";

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  createdAt: any;
}

export interface Subcategory {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  createdAt: any;
}

export interface CategoryWithSubs extends Category {
  subcategories: Subcategory[];
}

// One-time fetch: all categories
export const fetchCategories = async (): Promise<Category[]> => {
  try {
    const snap = await getDocs(query(collection(db, "categories"), orderBy("name", "asc")));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Category));
  } catch {
    return [];
  }
};

// One-time fetch: all subcategories (optionally filtered by categoryId)
export const fetchSubcategories = async (categoryId?: string): Promise<Subcategory[]> => {
  try {
    const q = categoryId
      ? query(collection(db, "subcategories"), where("categoryId", "==", categoryId), orderBy("name", "asc"))
      : query(collection(db, "subcategories"), orderBy("name", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Subcategory));
  } catch {
    return [];
  }
};

// Real-time listener: categories + their subcategories grouped
export const subscribeCategoriesWithSubs = (
  callback: (data: CategoryWithSubs[]) => void
): (() => void) => {
  const unsubCats = onSnapshot(
    query(collection(db, "categories"), orderBy("name", "asc")),
    async (catSnap) => {
      const cats: Category[] = catSnap.docs.map(d => ({ id: d.id, ...d.data() } as Category));
      if (cats.length === 0) {
        callback([]);
        return;
      }
      try {
        const subSnap = await getDocs(query(collection(db, "subcategories"), orderBy("name", "asc")));
        const allSubs: Subcategory[] = subSnap.docs.map(d => ({ id: d.id, ...d.data() } as Subcategory));
        const result: CategoryWithSubs[] = cats.map(cat => ({
          ...cat,
          subcategories: allSubs.filter(s => s.categoryId === cat.id),
        }));
        callback(result);
      } catch {
        callback(cats.map(cat => ({ ...cat, subcategories: [] })));
      }
    }
  );
  return unsubCats;
};

// Real-time listener: subcategories only (for filter sheet)
export const subscribeSubcategories = (
  callback: (data: Subcategory[]) => void
): (() => void) => {
  return onSnapshot(
    query(collection(db, "subcategories"), orderBy("name", "asc")),
    (snap) => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Subcategory)));
    }
  );
};

import { db } from "./firebase";
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  increment,
  runTransaction,
  Timestamp
} from "firebase/firestore";

export interface Review {
  id: string;
  bookingId: string;
  customerId: string;
  customerName: string;
  customerPhoto?: string;
  providerId: string;
  rating: number;
  comment: string;
  createdAt: Timestamp;
}

/**
 * Adds a new review for a provider and updates their average rating
 */
export const addReview = async (reviewData: Omit<Review, "id" | "createdAt">) => {
  try {
    const reviewRef = doc(collection(db, "reviews"));
    const providerRef = doc(db, "providers", reviewData.providerId);
    const bookingRef = doc(db, "bookings", reviewData.bookingId);

    await runTransaction(db, async (transaction) => {
      // 1. Check if booking exists and isn't already reviewed
      const bookingSnap = await transaction.get(bookingRef);
      if (!bookingSnap.exists()) throw new Error("Booking not found");
      if (bookingSnap.data().isReviewed) throw new Error("Booking already reviewed");

      // 2. Get provider data to calculate new rating
      const providerSnap = await transaction.get(providerRef);
      if (!providerSnap.exists()) throw new Error("Provider not found");
      
      const providerData = providerSnap.data();
      const currentRating = providerData.rating || 0;
      const currentCount = providerData.reviewCount || 0;
      
      const newCount = currentCount + 1;
      const newRating = ((currentRating * currentCount) + reviewData.rating) / newCount;

      // 3. Add the review
      transaction.set(reviewRef, {
        ...reviewData,
        id: reviewRef.id,
        createdAt: serverTimestamp(),
      });

      // 4. Update provider stats
      transaction.update(providerRef, {
        rating: Number(newRating.toFixed(1)),
        reviewCount: increment(1)
      });

      // 5. Mark booking as reviewed
      transaction.update(bookingRef, {
        isReviewed: true
      });
    });

    return { success: true, id: reviewRef.id };
  } catch (error) {
    console.error("Error adding review:", error);
    throw error;
  }
};

/**
 * Gets all reviews for a specific provider.
 * Enriches each review with the customer's current photoURL from the users
 * collection so profile images always display, even if the photo wasn't
 * stored at review-write time or has since changed.
 */
export const getProviderReviews = async (providerId: string) => {
  try {
    const reviewsRef = collection(db, "reviews");
    const q = query(reviewsRef, where("providerId", "==", providerId));
    const querySnapshot = await getDocs(q);
    const reviews = querySnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }) as Review)
      .sort((a: any, b: any) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));

    // Collect unique customer IDs that are missing a photo
    const missingPhotoIds = Array.from(new Set(
      reviews.filter(r => !r.customerPhoto).map(r => r.customerId)
    ));

    if (missingPhotoIds.length > 0) {
      // Fetch user docs in parallel
      const userDocs = await Promise.all(
        missingPhotoIds.map(uid => getDoc(doc(db, "users", uid)))
      );
      const photoMap: Record<string, string> = {};
      userDocs.forEach(snap => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.photoURL) photoMap[snap.id] = data.photoURL;
        }
      });
      // Merge photos back into reviews
      return reviews.map(r =>
        r.customerPhoto ? r : { ...r, customerPhoto: photoMap[r.customerId] }
      );
    }

    return reviews;
  } catch (error) {
    console.error("Error getting provider reviews:", error);
    throw error;
  }
};

/**
 * Checks if a booking has already been reviewed
 */
export const isBookingReviewed = async (bookingId: string) => {
  try {
    const bookingRef = doc(db, "bookings", bookingId);
    const bookingSnap = await getDoc(bookingRef);
    return bookingSnap.exists() && bookingSnap.data().isReviewed === true;
  } catch (error) {
    console.error("Error checking review status:", error);
    return false;
  }
};

/**
 * Gets all reviews across all providers (admin use)
 */
export const getAllReviews = async (): Promise<Review[]> => {
  try {
    const snap = await getDocs(query(collection(db, "reviews"), orderBy("createdAt", "desc")));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Review);
  } catch (error) {
    console.error("Error getting all reviews:", error);
    throw error;
  }
};

/**
 * Deletes a review (admin only) and recalculates provider rating
 */
export const deleteReview = async (reviewId: string) => {
  try {
    const reviewRef = doc(db, "reviews", reviewId);
    const reviewSnap = await getDoc(reviewRef);
    if (!reviewSnap.exists()) throw new Error("Review not found");

    const review = reviewSnap.data() as Review;
    const providerRef = doc(db, "providers", review.providerId);

    await runTransaction(db, async (transaction) => {
      const provSnap = await transaction.get(providerRef);
      if (provSnap.exists()) {
        const pd = provSnap.data();
        const count = pd.reviewCount || 0;
        const currentRating = pd.rating || 0;
        const newCount = Math.max(0, count - 1);
        // Recalculate average without this review
        const newRating = newCount === 0
          ? 0
          : Number((((currentRating * count) - review.rating) / newCount).toFixed(1));
        transaction.update(providerRef, { rating: newRating, reviewCount: newCount });
      }
      // Reset booking isReviewed flag so customer can re-review if needed
      const bookingRef = doc(db, "bookings", review.bookingId);
      const bookSnap = await transaction.get(bookingRef);
      if (bookSnap.exists()) {
        transaction.update(bookingRef, { isReviewed: false });
      }
      transaction.delete(reviewRef);
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting review:", error);
    throw error;
  }
};

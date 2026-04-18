import { db, storage } from "./firebase";
import { createConversation } from "./chat";
import {
  notifyNewBooking,
  notifyJobCompleted,
  notifyBookingDeclined,
} from "./notifications";
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  updateDoc, 
  deleteDoc,
  addDoc,
  serverTimestamp,
  orderBy
} from "firebase/firestore";
import { ref, uploadBytesResumable, uploadBytes, getDownloadURL } from "firebase/storage";

// --- Timeout Helper ---
const FETCH_TIMEOUT = 10000; // 10 seconds

const withTimeout = <T>(promise: Promise<T>, timeoutMs: number = FETCH_TIMEOUT): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error("Database connection timed out. Please check your internet connection.")), timeoutMs)
    )
  ]);
};

// --- User Functions ---
export const createUser = async (uid: string, data: any) => {
  try {
    const userRef = doc(db, "users", uid);
    await setDoc(userRef, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
};

// --- Customer Functions ---
export const getCustomerById = async (customerId: string) => {
  try {
    const docRef = doc(db, 'users', customerId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    const customerData = docSnap.data();
    
    // Verify this is actually a customer account
    if (customerData && customerData.accountType === "customer") {
      return { id: docSnap.id, ...customerData };
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error getting customer by ID:", error);
    throw error;
  }
};

export const getCustomerBookings = async (customerId: string) => {
  try {
    const q = query(
      collection(db, 'bookings'),
      where('customerId', '==', customerId)
    );
    const snapshot = await getDocs(q);
    const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as any);
    
    // Sort client-side by createdAt (newest first)
    return bookings.sort((a: any, b: any) => {
      const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
      const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
      return bTime - aTime; // Descending order
    });
  } catch (error) {
    console.error("Error getting customer bookings:", error);
    throw error;
  }
};

export const getBookingById = async (bookingId: string) => {
  try {
    const docRef = doc(db, 'bookings', bookingId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      return null;
    }
    return { id: docSnap.id, ...docSnap.data() };
  } catch (error) {
    console.error("Error getting booking by ID:", error);
    throw error;
  }
};

export const updateCustomerStatus = async (customerId: string, isActive: boolean) => {
  try {
    const docRef = doc(db, 'users', customerId);
    await updateDoc(docRef, {
      isActive,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error("Error updating customer status:", error);
    throw error;
  }
};

export const deleteCustomerAccount = async (customerId: string) => {
  try {
    const docRef = doc(db, 'users', customerId);
    await updateDoc(docRef, {
      isDeleted: true,
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error("Error deleting customer account:", error);
    throw error;
  }
};

export const sendMessageToCustomer = async (customerId: string, message: string) => {
  try {
    const notificationRef = collection(db, 'notifications');
    await addDoc(notificationRef, {
      userId: customerId,
      type: 'admin_message',
      title: 'Message from Gigsenda Admin',
      message,
      read: false,
      createdAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error("Error sending message to customer:", error);
    throw error;
  }
};

export const getUser = async (uid: string) => {
  try {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      return userSnap.data();
    }
    return null;
  } catch (error) {
    console.error("Error getting user:", error);
    throw error;
  }
};

export const updateUser = async (uid: string, data: any) => {
  try {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
};

// --- Service Provider Functions ---
export const createProvider = async (uid: string, data: any) => {
  try {
    const providerRef = doc(db, "providers", uid);
    await setDoc(providerRef, {
      // personal info
      name: data.name || "",
      email: data.email || "",
      phone: data.phone || "",
      photoURL: data.photoURL || "",
      city: data.city || "",
      // service details
      category: data.category || "",
      subcategory: data.subcategory || "",
      serviceTitle: data.serviceTitle || "",
      experience: data.experience || "",
      bio: data.bio || "",
      // pricing & availability
      hourlyRate: data.hourlyRate ?? null,
      teamRate: data.teamRate ?? null,
      availability: data.availability || [],
      startTime: data.startTime || "",
      endTime: data.endTime || "",
      // documents
      documents: data.documents || [],
      // status
      userId: uid,
      isApproved: false,
      status: "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    // Also update the user profile to reflect they are a provider
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
      role: "provider",
      hasSetupProfile: true
    });
    
    return { success: true };
  } catch (error) {
    console.error("Error creating provider:", error);
    throw error;
  }
};

export const updateProvider = async (uid: string, data: any) => {
  try {
    const providerRef = doc(db, "providers", uid);
    await updateDoc(providerRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error("Error updating provider:", error);
    throw error;
  }
};

export const getProvider = async (uid: string) => {
  try {
    const providerRef = doc(db, "providers", uid);
    const providerSnap = await withTimeout(getDoc(providerRef));
    if (providerSnap.exists()) {
      const data = providerSnap.data();
      // If provider doc has no photoURL, pull it from users collection
      if (!data.photoURL) {
        try {
          const userSnap = await getDoc(doc(db, "users", uid));
          if (userSnap.exists()) {
            const userData = userSnap.data();
            if (userData.photoURL) data.photoURL = userData.photoURL;
            // Also sync availability from users if providers has none
            if (!data.availability && userData.availability) {
              data.availability = userData.availability;
            }
          }
        } catch {}
      }
      return data;
    }
    return null;
  } catch (error: any) {
    const msg = error?.message || error?.code || JSON.stringify(error);
    console.error("Error getting provider:", msg);
    throw error;
  }
};

export const getProviders = async (category?: string) => {
  try {
    const providersRef = collection(db, "providers");
    // Single-field query only — avoids composite index requirement
    const q = query(providersRef, where("isApproved", "==", true));
    const querySnapshot = await withTimeout(getDocs(q));
    let results = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

    // Filter category in-memory to avoid compound index
    if (category && category !== "All") {
      results = results.filter((p: any) => p.category === category);
    }

    // Sort newest first in-memory
    return results.sort((a: any, b: any) => {
      const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
      const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
      return dateB.getTime() - dateA.getTime();
    });
  } catch (error: any) {
    console.error("Error getting providers:", error?.message || error?.code || JSON.stringify(error));
    throw error;
  }
};

export const approveProvider = async (uid: string) => {
  try {
    const providerRef = doc(db, "providers", uid);
    await updateDoc(providerRef, {
      isApproved: true,
      status: "approved",
      rejectionReason: "",
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error("Error approving provider:", error);
    throw error;
  }
};

// --- File Upload ---
// collection: provider profile photo -> providers/{uid}, customer -> users/{uid}
export type UploadTarget = "users" | "providers";

export const uploadProfilePhoto = async (
  uid: string,
  file: File,
  target: UploadTarget = "users",
  onProgress?: (pct: number) => void
): Promise<string> => {
  // --- Validation ---
  const isImage = file.type.startsWith("image/") || file.type === "";
  if (!isImage) {
    throw new Error("Only image files (JPEG, PNG, WEBP, HEIC) are allowed.");
  }
  const MAX_SIZE_MB = 5;
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    throw new Error(`Image must be smaller than ${MAX_SIZE_MB}MB.`);
  }

  console.log("[Upload] Sending to API route:", file.name, file.type, file.size, "bytes");

  // Signal indeterminate progress while server uploads
  onProgress?.(10);

  // --- Send to server-side API route (bypasses CORS completely) ---
  const formData = new FormData();
  formData.append("file", file);
  formData.append("uid", uid);
  formData.append("target", target);

  onProgress?.(30);

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  onProgress?.(80);

  if (!response.ok) {
    const errData = await response.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(errData.error || `Upload failed with status ${response.status}`);
  }

  const { downloadURL } = await response.json();
  if (!downloadURL) throw new Error("Server did not return a download URL.");

  onProgress?.(100);
  console.log("[Upload] Complete. URL:", downloadURL);

  return downloadURL;
};

// --- Booking Functions ---
export const createBooking = async (data: any) => {
  try {
    const bookingsRef = collection(db, "bookings");
    const docRef = doc(bookingsRef);
    const totalAmount: number = data.price ?? data.totalAmount ?? 0;
    const commission   = Math.round(totalAmount * 0.1);
    const providerEarning = totalAmount - commission;
    const bookingId = docRef.id;

    // Create conversation so both sides can chat immediately
    let conversationId: string | null = null;
    try {
      conversationId = await createConversation(data.customerId, data.providerId, bookingId);
    } catch (e) {
      console.warn("Could not create conversation for booking:", e);
    }

    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72h from now

    await setDoc(docRef, {
      ...data,
      id: bookingId,
      totalAmount,
      commission,
      providerEarning,
      price: totalAmount,           // keep legacy field in sync
      status: data.status || "pending",
      paymentStatus: data.paymentStatus || "not_initiated",
      isReviewed: false,
      conversationId,
      expiresAt,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Notify provider of new booking
    notifyNewBooking(data.providerId, data.customerName || "A customer", bookingId);

    return { success: true, id: bookingId, conversationId };
  } catch (error) {
    console.error("Error creating booking:", error);
    throw error;
  }
};

export const updateBookingStatus = async (
  bookingId: string,
  status: "upcoming" | "completed" | "cancelled",
  bookingData?: { customerId?: string; providerName?: string }
) => {
  try {
    const bookingRef = doc(db, "bookings", bookingId);

    // Fetch booking data if not provided, for notification context
    let bData = bookingData;
    if (!bData) {
      const snap = await getDoc(bookingRef);
      if (snap.exists()) bData = snap.data() as any;
    }

    await updateDoc(bookingRef, { status, updatedAt: serverTimestamp() });

    if (bData?.customerId) {
      if (status === "completed")
        notifyJobCompleted(bData.customerId, bData.providerName || "Your provider", bookingId);
      else if (status === "cancelled")
        notifyBookingDeclined(bData.customerId, bData.providerName || "Your provider", bookingId);
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating booking status:", error);
    throw error;
  }
};

export const cancelBooking = async (bookingId: string) =>
  updateBookingStatus(bookingId, "cancelled");

export const getBookings = async (userId: string, role: 'customer' | 'provider') => {
  try {
    const bookingsRef = collection(db, "bookings");
    const q = query(bookingsRef, where(role === 'customer' ? "customerId" : "providerId", "==", userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting bookings:", error);
    throw error;
  }
};

// --- Transaction Functions ---
export const logTransaction = async (data: any) => {
  try {
    const transactionsRef = collection(db, "transactions");
    const docRef = doc(transactionsRef);
    await setDoc(docRef, {
      ...data,
      id: docRef.id,
      createdAt: serverTimestamp(),
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error logging transaction:", error);
    throw error;
  }
};

export const getTransactions = async () => {
  try {
    const transactionsRef = collection(db, "transactions");
    const querySnapshot = await getDocs(transactionsRef);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting transactions:", error);
    throw error;
  }
};

// --- Favorites Functions ---
export const getFavorites = async (userId: string): Promise<string[]> => {
  try {
    const userRef = doc(db, "users", userId);
    const snap = await getDoc(userRef);
    return (snap.data()?.favorites as string[]) || [];
  } catch {
    return [];
  }
};

export const toggleFavorite = async (
  userId: string,
  providerId: string,
  currentFavorites: string[]
): Promise<string[]> => {
  const isFav = currentFavorites.includes(providerId);
  const updated = isFav
    ? currentFavorites.filter(id => id !== providerId)
    : [...currentFavorites, providerId];
  await updateDoc(doc(db, "users", userId), { favorites: updated });
  return updated;
};

// --- Delete Account ---
export const deleteAccount = async (userId: string): Promise<void> => {
  // Delete Firestore user document
  await deleteDoc(doc(db, "users", userId));

  // Delete provider document if it exists
  const providerSnap = await getDoc(doc(db, "providers", userId));
  if (providerSnap.exists()) {
    await deleteDoc(doc(db, "providers", userId));
  }

  // Delete Firebase Auth user (must be done last)
  const { getAuth } = await import("firebase/auth");
  const authUser = getAuth().currentUser;
  if (authUser) {
    await authUser.delete();
  }
};

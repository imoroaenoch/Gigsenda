import { db } from "./firebase";
import { 
  collection, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy, 
  doc, 
  updateDoc, 
  deleteDoc,
  addDoc,
  serverTimestamp,
  getCountFromServer,
  Timestamp
} from "firebase/firestore";


export interface AdminStats {
  totalUsers: number;
  activeProviders: number;
  totalBookings: number;
  totalRevenue: number;
}

export const getAdminStats = async (): Promise<AdminStats> => {
  try {
    const usersSnap = await getCountFromServer(collection(db, "users"));
    const providersSnap = await getCountFromServer(query(collection(db, "providers"), where("isApproved", "==", true)));
    const bookingsSnap = await getCountFromServer(collection(db, "bookings"));
    
    // For revenue, we'd sum up the commission from all 'completed' or 'paid' bookings
    const completedBookingsSnap = await getDocs(query(collection(db, "bookings"), where("status", "==", "completed")));
    const totalRevenue = completedBookingsSnap.docs.reduce((acc, doc) => {
      const data = doc.data();
      // Platform takes 10% commission
      return acc + (data.price * 0.1);
    }, 0);

    return {
      totalUsers: usersSnap.data().count,
      activeProviders: providersSnap.data().count,
      totalBookings: bookingsSnap.data().count,
      totalRevenue: totalRevenue
    };
  } catch (error) {
    console.error("Error getting admin stats:", error);
    return { totalUsers: 0, activeProviders: 0, totalBookings: 0, totalRevenue: 0 };
  }
};

// Customer management functions
export const getCustomer = async (customerId: string) => {
  try {
    const customerDoc = await getDoc(doc(db, "users", customerId));
    if (customerDoc.exists()) {
      const customerData = customerDoc.data();
      
      // Verify this is actually a customer account
      if (customerData && customerData.accountType === "customer") {
        return {
          id: customerDoc.id,
          ...customerData
        };
      } else {
        console.log("Document exists but is not a customer account:", customerData?.accountType);
        return null;
      }
    }
    console.log("No customer found with ID:", customerId);
    return null;
  } catch (error) {
    console.error("Error getting customer:", error);
    throw error;
  }
};

export const getCustomerBookings = async (customerId: string) => {
  try {
    const bookingsQuery = query(
      collection(db, "bookings"),
      where("customerId", "==", customerId),
      orderBy("createdAt", "desc")
    );
    const bookingsSnap = await getDocs(bookingsQuery);
    return bookingsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error getting customer bookings:", error);
    throw error;
  }
};

export const getPendingProviders = async () => {
  try {
    const q = query(collection(db, "providers"), where("isApproved", "==", false));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting pending providers:", error);
    return [];
  }
};

export const getAllProviders = async () => {
  try {
    const q = query(collection(db, "providers"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting all providers:", error);
    return [];
  }
};

export const getAllCustomers = async () => {
  try {
    const q = query(collection(db, "users"), where("accountType", "==", "customer"));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting all customers:", error);
    return [];
  }
};

export const getAllBookings = async () => {
  try {
    const snap = await getDocs(collection(db, "bookings"));
    return snap.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate() || new Date(doc.data().date)
      }))
      .sort((a: any, b: any) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
  } catch (error) {
    console.error("Error getting all bookings:", error);
    return [];
  }
};

export const getAllTransactions = async () => {
  try {
    const q = query(collection(db, "bookings"), where("status", "==", "completed"));
    const snap = await getDocs(q);
    return snap.docs
      .map(doc => {
        const data = doc.data();
        const amount = data.price || 0;
        return {
          id: doc.id,
          bookingId: doc.id,
          amount,
          commission: amount * 0.1,
          providerPayout: amount * 0.9,
          status: 'success',
          customerName: data.customerName,
          providerName: data.providerName,
          createdAt: data.createdAt?.toDate() || new Date()
        };
      })
      .sort((a: any, b: any) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error("Error getting transactions:", error);
    return [];
  }
};

export const approveProvider = async (uid: string) => {
  try {
    // Get provider data first to check for bank details
    const providerSnap = await getDoc(doc(db, "providers", uid));
    if (!providerSnap.exists()) {
      throw new Error("Provider not found");
    }
    
    const providerData = providerSnap.data();
    
    // Approve the provider first
    const providerRef = doc(db, "providers", uid);
    await updateDoc(providerRef, {
      isApproved: true,
      status: "approved",
      rejectionReason: "",
      updatedAt: serverTimestamp()
    });
    
    // Also update the user record
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
      isApproved: true
    });
    
    // Try to create Paystack subaccount if bank details are available
    if (providerData.bankDetails && 
        providerData.bankDetails.bankCode && 
        providerData.bankDetails.accountNumber && 
        providerData.email) {
      
      try {
        const subaccountResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/paystack/create-subaccount`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            providerId: uid,
            businessName: providerData.serviceTitle || providerData.name || 'Service Provider',
            bankCode: providerData.bankDetails.bankCode,
            accountNumber: providerData.bankDetails.accountNumber,
            email: providerData.email,
          }),
        });

        if (subaccountResponse.ok) {
          const result = await subaccountResponse.json();
          console.log(`Successfully created Paystack subaccount for provider ${uid}:`, result.subaccountCode);
        } else {
          const error = await subaccountResponse.json().catch(() => ({}));
          console.error(`Failed to create Paystack subaccount for provider ${uid}:`, error);
          
          // Flag for manual subaccount setup
          await updateDoc(providerRef, {
            subaccountError: "Failed to create subaccount — manual setup needed",
            needsManualSubaccount: true,
            updatedAt: serverTimestamp()
          });
        }
      } catch (subaccountError) {
        console.error(`Error creating Paystack subaccount for provider ${uid}:`, subaccountError);
        
        // Flag for manual subaccount setup
        await updateDoc(providerRef, {
          subaccountError: "Failed to create subaccount — manual setup needed",
          needsManualSubaccount: true,
          updatedAt: serverTimestamp()
        });
      }
    } else {
      console.log(`Provider ${uid} approved but missing bank details for subaccount creation`);
      
      // Flag for manual subaccount setup
      await updateDoc(providerRef, {
        subaccountError: "Missing bank details — manual setup needed",
        needsManualSubaccount: true,
        updatedAt: serverTimestamp()
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error approving provider:", error);
    throw error;
  }
};

export const rejectProvider = async (uid: string, reason: string) => {
  try {
    const providerRef = doc(db, "providers", uid);
    await updateDoc(providerRef, {
      isApproved: false,
      status: "rejected",
      rejectionReason: reason,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error("Error rejecting provider:", error);
    throw error;
  }
};

// --- Customer Management ---
export const banCustomer = async (uid: string) => {
  try {
    await updateDoc(doc(db, "users", uid), { isBanned: true, updatedAt: serverTimestamp() });
    return { success: true };
  } catch (error) {
    console.error("Error banning customer:", error);
    throw error;
  }
};

export const unbanCustomer = async (uid: string) => {
  try {
    await updateDoc(doc(db, "users", uid), { isBanned: false, updatedAt: serverTimestamp() });
    return { success: true };
  } catch (error) {
    console.error("Error unbanning customer:", error);
    throw error;
  }
};

export const flagCustomer = async (uid: string, reason: string) => {
  try {
    await updateDoc(doc(db, "users", uid), {
      isFlagged: true,
      flagReason: reason,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error("Error flagging customer:", error);
    throw error;
  }
};

export const adminUpdateBookingStatus = async (
  bookingId: string,
  status: "upcoming" | "completed" | "cancelled"
) => {
  try {
    await updateDoc(doc(db, "bookings", bookingId), { status, updatedAt: serverTimestamp() });
    return { success: true };
  } catch (error) {
    console.error("Error updating booking status:", error);
    throw error;
  }
};

// --- Category Management ---
export const updateCategoryFallbackPrice = async (
  categoryId: string,
  fallbackPrice: number | null
) => {
  try {
    await updateDoc(doc(db, "categories", categoryId), {
      fallbackPrice: fallbackPrice ?? null,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error("Error updating category fallback price:", error);
    throw error;
  }
};

export const getCategories = async () => {
  try {
    const q = query(collection(db, "categories"), orderBy("name", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting categories:", error);
    return [];
  }
};

export const addCategory = async (name: string, icon: string, slug?: string) => {
  try {
    const generatedSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const docRef = await addDoc(collection(db, "categories"), {
      name,
      icon,
      slug: generatedSlug,
      createdAt: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error adding category:", error);
    throw error;
  }
};

export const deleteCategory = async (id: string) => {
  try {
    // Also delete all subcategories under this category
    const subsSnap = await getDocs(query(collection(db, "subcategories"), where("categoryId", "==", id)));
    await Promise.all(subsSnap.docs.map(d => deleteDoc(doc(db, "subcategories", d.id))));
    await deleteDoc(doc(db, "categories", id));
    return { success: true };
  } catch (error) {
    console.error("Error deleting category:", error);
    throw error;
  }
};

// --- Subcategory Management ---
export const addSubcategory = async (name: string, categoryId: string, slug?: string) => {
  try {
    const generatedSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const docRef = await addDoc(collection(db, "subcategories"), {
      name,
      slug: generatedSlug,
      categoryId,
      createdAt: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error adding subcategory:", error);
    throw error;
  }
};

export const deleteSubcategory = async (id: string) => {
  try {
    await deleteDoc(doc(db, "subcategories", id));
    return { success: true };
  } catch (error) {
    console.error("Error deleting subcategory:", error);
    throw error;
  }
};

import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";
import { AccountType, User } from "@/types";

const googleProvider = new GoogleAuthProvider();

// --- Sign Up ---
export const signUpWithEmail = async (
  email: string, 
  password: string, 
  name: string, 
  phone: string, 
  accountType: AccountType
) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const userData: User = {
      uid: user.uid,
      name,
      email,
      phone,
      accountType,
      role: accountType, // "customer" | "provider" | "admin"
      createdAt: serverTimestamp(),
      isApproved: accountType === "customer", // Customers are auto-approved, providers need admin approval
      isActive: true,
      photoURL: user.photoURL,
    };

    await setDoc(doc(db, "users", user.uid), userData);
    return user;
  } catch (error: any) {
    throw error;
  }
};

// --- Sign In ---
export const signInWithEmail = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error: any) {
    throw error;
  }
};

// --- Google Sign In ---
export const signInWithGoogle = async (accountType: AccountType) => {
  try {
    const userCredential = await signInWithPopup(auth, googleProvider);
    const user = userCredential.user;

    // Check if user already exists in Firestore
    const userDoc = await getDoc(doc(db, "users", user.uid));
    
    if (!userDoc.exists()) {
      // Create new user record for Google login
      const userData: User = {
        uid: user.uid,
        name: user.displayName || "",
        email: user.email || "",
        phone: "", // Google doesn't always provide phone number
        accountType,
        role: accountType, // "customer" | "provider" | "admin"
        createdAt: serverTimestamp(),
        isApproved: accountType === "customer",
        isActive: true,
        photoURL: user.photoURL,
      };
      await setDoc(doc(db, "users", user.uid), userData);
    }
    
    return user;
  } catch (error: any) {
    throw error;
  }
};

// --- Sign Out ---
export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error: any) {
    throw error;
  }
};

export const logout = signOut;

// --- Get User Role ---
export const getUserRole = async (uid: string): Promise<string | null> => {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) {
      const data = snap.data();
      return data.role || data.accountType || null;
    }
    return null;
  } catch {
    return null;
  }
};

// --- Get Current User ---
export const getCurrentUser = () => {
  return new Promise<FirebaseUser | null>((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        unsubscribe();
        resolve(user);
      },
      reject
    );
  });
};

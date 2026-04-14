export type AccountType = "customer" | "provider" | "admin";

export interface User {
  uid: string;
  name: string;
  email: string;
  phone: string;
  accountType: AccountType;
  createdAt: any; // Firebase Timestamp
  isApproved: boolean;
  isActive: boolean;
  photoURL: string | null;
  address?: string;
  role?: string;
  hasSetupProfile?: boolean;
  notifications?: {
    reminders?: boolean;
    messages?: boolean;
    promotions?: boolean;
  };
  favorites?: string[];
}

export interface Provider extends User {
  category: string;
  bio: string;
  location: {
    address: string;
    latitude: number;
    longitude: number;
  };
  rating: number;
  reviewCount: number;
  basePrice: number;
}

export interface ServiceCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export interface Booking {
  id: string;
  customerId: string;
  providerId: string;
  serviceId: string;
  category: string;
  status: 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled';
  scheduledDate: any; // Firebase Timestamp
  totalAmount: number;
  commission: number; // 10%
  providerEarnings: number; // 90%
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  transactionId?: string;
  createdAt: any;
}

export interface Transaction {
  id: string;
  bookingId: string;
  amount: number;
  currency: 'NGN';
  status: 'success' | 'failed' | 'pending';
  reference: string; // Paystack reference
  customerEmail: string;
  createdAt: any;
}

export interface Review {
  id: string;
  bookingId: string;
  customerId: string;
  providerId: string;
  rating: number;
  comment: string;
  createdAt: any;
}

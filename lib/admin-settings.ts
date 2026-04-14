import { db } from "./firebase";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";

// Types for admin settings
export interface GeneralSettings {
  appName: string;
  appDescription: string;
  supportEmail: string;
  supportPhone: string;
  websiteUrl: string;
  updatedAt?: any;
}

export interface PaymentSettings {
  paystackPublicKey: string;
  paystackSecretKey: string;
  updatedAt?: any;
}

export interface CommissionSettings {
  percentage: number;
  updatedAt?: any;
}

export interface EmailSettings {
  provider: "gmail" | "sendgrid" | "mailgun";
  senderEmail: string;
  appPassword: string;
  templates: {
    bookingConfirmation: string;
    paymentReceipt: string;
    providerApproval: string;
  };
  updatedAt?: any;
}

export interface BrandingSettings {
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  updatedAt?: any;
}

export interface AppConfiguration {
  categories: Array<{
    id: string;
    name: string;
    icon: string;
    description: string;
  }>;
  booking: {
    minAmount: number;
    maxAmount: number;
    cancellationHours: number;
    refundPercentage: number;
  };
  provider: {
    autoApprove: boolean;
    requireIdVerification: boolean;
    minRatingRequirement: number;
  };
  updatedAt?: any;
}

export interface AdminAccount {
  email: string;
  lastLogin: any;
  twoFactorEnabled: boolean;
  loginHistory: Array<{
    date: any;
    device: string;
    ip: string;
  }>;
}

export interface AppSettings {
  general?: GeneralSettings;
  payment?: PaymentSettings;
  commission?: CommissionSettings;
  email?: EmailSettings;
  branding?: BrandingSettings;
  configuration?: AppConfiguration;
  adminAccount?: AdminAccount;
}

// Get all app settings
export async function getAppSettings(): Promise<AppSettings> {
  try {
    const settingsDoc = await getDoc(doc(db, "app_settings", "config"));
    if (settingsDoc.exists()) {
      return settingsDoc.data() as AppSettings;
    }
    
    // Return default settings if none exist
    return getDefaultSettings();
  } catch (error) {
    console.error("Error fetching app settings:", error);
    return getDefaultSettings();
  }
}

// Get specific setting section
export async function getSettingSection<T>(section: keyof AppSettings): Promise<T | null> {
  try {
    const sectionDoc = await getDoc(doc(db, "app_settings", section));
    return sectionDoc.exists() ? sectionDoc.data() as T : null;
  } catch (error) {
    console.error(`Error fetching ${section} settings:`, error);
    return null;
  }
}

// Update General Settings
export async function updateGeneralSettings(data: Partial<GeneralSettings>): Promise<boolean> {
  try {
    await setDoc(doc(db, "app_settings", "general"), {
      ...data,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    
    // Also update in main config document
    await updateDoc(doc(db, "app_settings", "config"), {
      general: data,
      updatedAt: serverTimestamp(),
    });
    
    return true;
  } catch (error) {
    console.error("Error updating general settings:", error);
    return false;
  }
}

// Update Payment Settings
export async function updatePaymentSettings(data: Partial<PaymentSettings>): Promise<boolean> {
  try {
    await setDoc(doc(db, "app_settings", "payment"), {
      ...data,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    
    // Also update in main config document
    await updateDoc(doc(db, "app_settings", "config"), {
      payment: data,
      updatedAt: serverTimestamp(),
    });
    
    return true;
  } catch (error) {
    console.error("Error updating payment settings:", error);
    return false;
  }
}

// Update Commission Settings
export async function updateCommission(percentage: number): Promise<boolean> {
  try {
    const commissionData: CommissionSettings = {
      percentage,
      updatedAt: serverTimestamp(),
    };
    
    // Save commission settings
    await setDoc(doc(db, "app_settings", "commission"), commissionData);
    
    // Try to update main config document, create if it doesn't exist
    try {
      const configDoc = await getDoc(doc(db, "app_settings", "config"));
      if (configDoc.exists()) {
        await updateDoc(doc(db, "app_settings", "config"), {
          commission: commissionData,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(doc(db, "app_settings", "config"), {
          commission: commissionData,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (configError) {
      console.warn("Could not update main config document, but commission was saved:", configError);
    }
    
    return true;
  } catch (error) {
    console.error("Error updating commission settings:", error);
    return false;
  }
}

// Update Email Settings
export async function updateEmailSettings(data: Partial<EmailSettings>): Promise<boolean> {
  try {
    await setDoc(doc(db, "app_settings", "email"), {
      ...data,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    
    // Also update in main config document
    await updateDoc(doc(db, "app_settings", "config"), {
      email: data,
      updatedAt: serverTimestamp(),
    });
    
    return true;
  } catch (error) {
    console.error("Error updating email settings:", error);
    return false;
  }
}

// Update Branding Settings
export async function updateBrandingSettings(data: Partial<BrandingSettings>): Promise<boolean> {
  try {
    await setDoc(doc(db, "app_settings", "branding"), {
      ...data,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    
    // Also update in main config document
    await updateDoc(doc(db, "app_settings", "config"), {
      branding: data,
      updatedAt: serverTimestamp(),
    });
    
    return true;
  } catch (error) {
    console.error("Error updating branding settings:", error);
    return false;
  }
}

// Update App Configuration
export async function updateAppConfiguration(data: Partial<AppConfiguration>): Promise<boolean> {
  try {
    await setDoc(doc(db, "app_settings", "configuration"), {
      ...data,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    
    // Also update in main config document
    await updateDoc(doc(db, "app_settings", "config"), {
      configuration: data,
      updatedAt: serverTimestamp(),
    });
    
    return true;
  } catch (error) {
    console.error("Error updating app configuration:", error);
    return false;
  }
}

// Update Admin Account Settings
export async function updateAdminAccount(data: Partial<AdminAccount>): Promise<boolean> {
  try {
    await setDoc(doc(db, "app_settings", "adminAccount"), {
      ...data,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    
    // Also update in main config document
    await updateDoc(doc(db, "app_settings", "config"), {
      adminAccount: data,
      updatedAt: serverTimestamp(),
    });
    
    return true;
  } catch (error) {
    console.error("Error updating admin account settings:", error);
    return false;
  }
}

// Default settings
function getDefaultSettings(): AppSettings {
  return {
    general: {
      appName: "Gigsenda",
      appDescription: "Connect with trusted service providers for all your needs",
      supportEmail: "support@gigsenda.com",
      supportPhone: "+2348000000000",
      websiteUrl: "https://gigsenda.com",
    },
    payment: {
      paystackPublicKey: "",
      paystackSecretKey: "",
    },
    commission: {
      percentage: 10,
    },
    email: {
      provider: "gmail",
      senderEmail: "",
      appPassword: "",
      templates: {
        bookingConfirmation: "Your booking has been confirmed!",
        paymentReceipt: "Payment received successfully!",
        providerApproval: "Your provider account has been approved!",
      },
    },
    branding: {
      logoUrl: "/logo.png",
      primaryColor: "#FF8C00",
      secondaryColor: "#3B82F6",
      backgroundColor: "#FFF8F0",
    },
    configuration: {
      categories: [],
      booking: {
        minAmount: 1000,
        maxAmount: 1000000,
        cancellationHours: 24,
        refundPercentage: 80,
      },
      provider: {
        autoApprove: false,
        requireIdVerification: true,
        minRatingRequirement: 3.0,
      },
    },
    adminAccount: {
      email: "",
      lastLogin: null,
      twoFactorEnabled: false,
      loginHistory: [],
    },
  };
}

// Test payment functionality
export async function testPayment(): Promise<boolean> {
  try {
    // This would integrate with Paystack's test API
    // For now, just return true as a placeholder
    console.log("Testing payment integration...");
    return true;
  } catch (error) {
    console.error("Error testing payment:", error);
    return false;
  }
}

// Test email functionality
export async function testEmail(email: string): Promise<boolean> {
  try {
    // This would integrate with email service
    // For now, just return true as a placeholder
    console.log(`Sending test email to ${email}...`);
    return true;
  } catch (error) {
    console.error("Error testing email:", error);
    return false;
  }
}

import { getPaystackSecret, getAppUrl } from "./paystack-config";

export interface PaymentMetadata {
  bookingId: string;
  customerId: string;
  providerId: string;
  customerName: string;
  providerName: string;
  serviceName: string;
}

export interface InitializePaymentParams {
  email: string;
  amount: number;
  metadata: PaymentMetadata;
  providerSubaccountCode?: string;
  commissionRate?: number;
}

export interface InitializePaymentResponse {
  status: boolean;
  message: string;
  data?: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface VerifyPaymentResponse {
  status: boolean;
  message: string;
  data?: {
    id: number;
    status: string;
    reference: string;
    amount: number;
    paid_at: string;
    created_at: string;
    customer: {
      email: string;
    };
    metadata: PaymentMetadata;
  };
}

export interface CommissionCalculation {
  total: number;
  commission: number;
  providerAmount: number;
}

// Paystack API base URL
const PAYSTACK_BASE_URL = "https://api.paystack.co";

/**
 * Initialize a Paystack payment transaction
 * @param params - Payment initialization parameters
 * @returns Promise with authorization URL and reference
 */
export async function initializePayment({
  email,
  amount,
  metadata,
  providerSubaccountCode,
  commissionRate = 0.1,
}: InitializePaymentParams): Promise<InitializePaymentResponse> {
  try {
    const requestBody: any = {
      email,
      amount, // Already in kobo (caller sends amount * 100)
      metadata,
      callback_url: `${await getAppUrl()}/payment/verify`,
      channels: ["card", "bank", "ussd", "qr"],
    };

    // Add split payment if provider subaccount is available
    if (providerSubaccountCode) {
      const providerShare = Math.round((1 - commissionRate) * 100); // percentage
      requestBody.split = {
        type: "percentage",
        bearer_type: "subaccount",
        bearer_subaccount: providerSubaccountCode,
        subaccounts: [
          {
            subaccount: providerSubaccountCode,
            share: providerShare,
          },
        ],
      };
    }

    const secret = await getPaystackSecret();
    const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to initialize payment");
    }

    return {
      status: true,
      message: "Payment initialized successfully",
      data: data.data,
    };
  } catch (error) {
    console.error("Paystack initialization error:", error);
    return {
      status: false,
      message: error instanceof Error ? error.message : "Payment initialization failed",
    };
  }
}

/**
 * Verify a Paystack payment transaction
 * @param reference - Transaction reference
 * @returns Promise with payment verification details
 */
export async function verifyPayment(reference: string): Promise<VerifyPaymentResponse> {
  try {
    const secret = await getPaystackSecret();
    const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${reference}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to verify payment");
    }

    return {
      status: true,
      message: "Payment verified successfully",
      data: data.data,
    };
  } catch (error) {
    console.error("Paystack verification error:", error);
    return {
      status: false,
      message: error instanceof Error ? error.message : "Payment verification failed",
    };
  }
}

/**
 * Calculate commission breakdown for a transaction
 * @param amount - Total amount in Naira
 * @param commissionRate - Commission rate as decimal (e.g., 0.1 for 10%)
 * @returns Commission calculation breakdown
 */
export function calculateCommission(amount: number, commissionRate: number = 0.1): CommissionCalculation {
  const commission = amount * commissionRate;
  const providerAmount = amount - commission;

  return {
    total: amount,
    commission,
    providerAmount,
  };
}

/**
 * Format amount in Naira
 * @param amount - Amount in Naira
 * @returns Formatted currency string
 */
export function formatNaira(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

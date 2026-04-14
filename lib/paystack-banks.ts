// Paystack Banks API for Nigerian banks
// Used for provider bank details collection

export interface NigerianBank {
  id: number;
  name: string;
  code: string;
  longcode: string;
  gateway: string;
  pay_with_bank: boolean;
  active: boolean;
  country: string;
  currency: string;
  type: string;
  is_deleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BankVerificationResponse {
  status: boolean;
  message: string;
  data: {
    account_number: string;
    account_name: string;
    bank_id: number;
  };
}

const CACHE_KEY = 'paystack_nigerian_banks';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetches list of Nigerian banks from Paystack API
 * Caches the result in localStorage to avoid repeated API calls
 */
export async function getNigerianBanks(): Promise<NigerianBank[]> {
  try {
    // Check cache first
    const cachedData = localStorage.getItem(CACHE_KEY);
    if (cachedData) {
      const { banks, timestamp } = JSON.parse(cachedData);
      const now = Date.now();
      
      // Return cached data if it's less than 24 hours old
      if (now - timestamp < CACHE_DURATION) {
        console.log('Using cached banks data');
        return banks;
      }
    }

    // Fetch fresh data from Paystack API
    const paystackKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '';
    const response = await fetch('https://api.paystack.co/bank?currency=NGN', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${paystackKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.status && data.data) {
      // Cache the response
      const cacheData = {
        banks: data.data,
        timestamp: Date.now(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      
      console.log('Fetched fresh banks data from Paystack');
      return data.data;
    } else {
      throw new Error('Invalid response from Paystack API');
    }
  } catch (error) {
    console.error('Error fetching Nigerian banks:', error);
    
    // If API fails, try to return cached data even if expired
    const cachedData = localStorage.getItem(CACHE_KEY);
    if (cachedData) {
      const { banks } = JSON.parse(cachedData);
      console.log('API failed, using expired cached data as fallback');
      return banks;
    }
    
    // Return empty array if no cached data available
    return [];
  }
}

/**
 * Verifies a bank account using Paystack API
 * @param accountNumber - 10-digit account number
 * @param bankCode - Bank code from the banks list
 * @returns Promise resolving to account name or error
 */
export async function verifyBankAccount(
  accountNumber: string, 
  bankCode: string
): Promise<{ success: boolean; accountName?: string; error?: string }> {
  try {
    // Validate inputs
    if (!accountNumber || accountNumber.length !== 10) {
      return { success: false, error: 'Account number must be exactly 10 digits' };
    }
    
    if (!bankCode) {
      return { success: false, error: 'Bank code is required' };
    }

    const response = await fetch(
      `/api/paystack/resolve-account?account_number=${accountNumber}&bank_code=${bankCode}`,
      { method: 'GET' }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.error || 'Account not found. Please check your details',
      };
    }

    return { success: true, accountName: data.accountName };
  } catch (error) {
    console.error('Error verifying bank account:', error);
    return { 
      success: false, 
      error: 'Failed to verify account. Please try again.' 
    };
  }
}

/**
 * Clears cached bank data (useful for testing or forced refresh)
 */
export function clearBankCache(): void {
  localStorage.removeItem(CACHE_KEY);
  console.log('Bank cache cleared');
}

/**
 * Gets cached bank data without API call (returns null if no cache)
 */
export function getCachedBanks(): NigerianBank[] | null {
  try {
    const cachedData = localStorage.getItem(CACHE_KEY);
    if (cachedData) {
      const { banks } = JSON.parse(cachedData);
      return banks;
    }
    return null;
  } catch (error) {
    console.error('Error reading cached banks:', error);
    return null;
  }
}

/**
 * Formats account number for display (shows only last 4 digits)
 */
export function maskAccountNumber(accountNumber: string): string {
  if (!accountNumber || accountNumber.length !== 10) {
    return accountNumber;
  }
  return `**** **** ${accountNumber.slice(-4)}`;
}

/**
 * Validates bank details before submission
 */
export function validateBankDetails(bankDetails: {
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!bankDetails.bankName || !bankDetails.bankCode) {
    errors.push('Please select a bank');
  }

  if (!bankDetails.accountNumber) {
    errors.push('Account number is required');
  } else if (!/^\d{10}$/.test(bankDetails.accountNumber)) {
    errors.push('Account number must be exactly 10 digits');
  }

  if (!bankDetails.accountName) {
    errors.push('Account name must be verified');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

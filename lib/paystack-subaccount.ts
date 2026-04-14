// Paystack Subaccount Management
// Used for creating and managing provider subaccounts for automatic payouts

export interface ProviderData {
  id: string;
  name: string;
  email: string;
  serviceTitle?: string;
  bankDetails?: {
    bankName: string;
    bankCode: string;
    accountNumber: string;
    accountName: string;
    isVerified: boolean;
  };
}

export interface SubaccountResponse {
  success: boolean;
  subaccountCode?: string;
  subaccountId?: string;
  businessName?: string;
  error?: string;
  message?: string;
}

export interface SubaccountDetails {
  id: number;
  domain: string;
  subaccount_code: string;
  business_name: string;
  description: string;
  primary_contact_email: string;
  settlement_bank: string;
  account_number: string;
  percentage_charge: number;
  settlement_schedule: string;
  integration: number;
  active: boolean;
  migrate: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Creates a Paystack subaccount for a provider
 * @param providerData - Provider information including bank details
 * @returns Promise resolving to subaccount creation result
 */
export async function createProviderSubaccount(providerData: ProviderData): Promise<SubaccountResponse> {
  try {
    // Validate required fields
    if (!providerData.id || !providerData.email) {
      return { success: false, error: 'Provider ID and email are required' };
    }

    if (!providerData.bankDetails?.bankCode || !providerData.bankDetails?.accountNumber) {
      return { success: false, error: 'Bank details are required for subaccount creation' };
    }

    // Call the API route to create subaccount
    const response = await fetch('/api/paystack/create-subaccount', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        providerId: providerData.id,
        businessName: providerData.serviceTitle || providerData.name || 'Service Provider',
        bankCode: providerData.bankDetails.bankCode,
        accountNumber: providerData.bankDetails.accountNumber,
        email: providerData.email,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        success: false, 
        error: errorData.error || 'Failed to create subaccount',
        message: errorData.message
      };
    }

    const result = await response.json();
    
    return {
      success: true,
      subaccountCode: result.subaccountCode,
      subaccountId: result.subaccountId?.toString(),
      businessName: result.businessName,
    };

  } catch (error) {
    console.error('Error creating provider subaccount:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Fetches subaccount details from Paystack API
 * @param subaccountCode - The subaccount code to fetch details for
 * @returns Promise resolving to subaccount details or error
 */
export async function getSubaccountDetails(subaccountCode: string): Promise<{
  success: boolean;
  data?: SubaccountDetails;
  error?: string;
}> {
  try {
    if (!subaccountCode) {
      return { success: false, error: 'Subaccount code is required' };
    }

    const paystackSecretKey = process.env.NEXT_PUBLIC_PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecretKey) {
      return { success: false, error: 'Paystack API key not configured' };
    }

    const response = await fetch(`https://api.paystack.co/subaccount/${subaccountCode}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        success: false, 
        error: errorData.message || 'Failed to fetch subaccount details'
      };
    }

    const result = await response.json();
    
    if (result.status && result.data) {
      return { 
        success: true, 
        data: result.data 
      };
    } else {
      return { 
        success: false, 
        error: 'Invalid response from Paystack API'
      };
    }

  } catch (error) {
    console.error('Error fetching subaccount details:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Updates a Paystack subaccount
 * @param subaccountCode - The subaccount code to update
 * @param updateData - The data to update
 * @returns Promise resolving to update result
 */
export async function updateSubaccount(
  subaccountCode: string, 
  updateData: {
    business_name?: string;
    description?: string;
    primary_contact_email?: string;
    settlement_bank?: string;
    account_number?: string;
    percentage_charge?: number;
  }
): Promise<{
  success: boolean;
  data?: SubaccountDetails;
  error?: string;
}> {
  try {
    if (!subaccountCode) {
      return { success: false, error: 'Subaccount code is required' };
    }

    if (Object.keys(updateData).length === 0) {
      return { success: false, error: 'No update data provided' };
    }

    const paystackSecretKey = process.env.NEXT_PUBLIC_PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecretKey) {
      return { success: false, error: 'Paystack API key not configured' };
    }

    const response = await fetch(`https://api.paystack.co/subaccount/${subaccountCode}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        success: false, 
        error: errorData.message || 'Failed to update subaccount'
      };
    }

    const result = await response.json();
    
    if (result.status && result.data) {
      return { 
        success: true, 
        data: result.data 
      };
    } else {
      return { 
        success: false, 
        error: 'Invalid response from Paystack API'
      };
    }

  } catch (error) {
    console.error('Error updating subaccount:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Validates bank details for subaccount creation
 * @param bankDetails - Bank details to validate
 * @returns Validation result with any errors
 */
export function validateBankDetailsForSubaccount(bankDetails: {
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  isVerified: boolean;
}): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!bankDetails.bankName || bankDetails.bankName.trim().length === 0) {
    errors.push('Bank name is required');
  }

  if (!bankDetails.bankCode || bankDetails.bankCode.trim().length === 0) {
    errors.push('Bank code is required');
  }

  if (!bankDetails.accountNumber || bankDetails.accountNumber.trim().length === 0) {
    errors.push('Account number is required');
  } else if (!/^\d{10}$/.test(bankDetails.accountNumber)) {
    errors.push('Account number must be exactly 10 digits');
  }

  if (!bankDetails.accountName || bankDetails.accountName.trim().length === 0) {
    errors.push('Account name is required');
  }

  if (!bankDetails.isVerified) {
    errors.push('Bank account must be verified before creating subaccount');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Formats subaccount data for display
 * @param subaccount - Subaccount data
 * @returns Formatted display object
 */
export function formatSubaccountForDisplay(subaccount: SubaccountDetails): {
  code: string;
  businessName: string;
  email: string;
  bankName: string;
  accountNumber: string;
  chargePercentage: number;
  isActive: boolean;
  createdAt: string;
} {
  return {
    code: subaccount.subaccount_code,
    businessName: subaccount.business_name,
    email: subaccount.primary_contact_email,
    bankName: subaccount.settlement_bank, // Note: This is bank code, would need lookup for name
    accountNumber: `**** **** ${subaccount.account_number.slice(-4)}`,
    chargePercentage: subaccount.percentage_charge,
    isActive: subaccount.active,
    createdAt: subaccount.createdAt,
  };
}

/**
 * Checks if a provider needs a subaccount created
 * @param provider - Provider data
 * @returns Boolean indicating if subaccount creation is needed
 */
export function needsSubaccountCreation(provider: any): boolean {
  return (
    provider.isApproved && 
    !provider.paystackSubaccountCode && 
    !provider.needsManualSubaccount &&
    provider.bankDetails?.isVerified
  );
}

/**
 * Gets subaccount status for display
 * @param provider - Provider data
 * @returns Status object with color and message
 */
export function getSubaccountStatus(provider: any): {
  status: 'active' | 'missing' | 'pending' | 'error';
  color: 'green' | 'red' | 'blue' | 'orange';
  message: string;
  canCreateManually: boolean;
} {
  if (provider.paystackSubaccountCode) {
    return {
      status: 'active',
      color: 'green',
      message: 'Subaccount Active',
      canCreateManually: false,
    };
  }

  if (provider.needsManualSubaccount || provider.subaccountError) {
    return {
      status: 'error',
      color: 'red',
      message: 'Subaccount Missing',
      canCreateManually: true,
    };
  }

  if (!provider.isApproved) {
    return {
      status: 'pending',
      color: 'blue',
      message: 'Pending Approval',
      canCreateManually: false,
    };
  }

  if (!provider.bankDetails?.isVerified) {
    return {
      status: 'error',
      color: 'orange',
      message: 'Bank Details Required',
      canCreateManually: false,
    };
  }

  return {
    status: 'pending',
    color: 'blue',
    message: 'Subaccount Pending',
    canCreateManually: true,
  };
}

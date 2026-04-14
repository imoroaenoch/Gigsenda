import { NextRequest, NextResponse } from 'next/server';
import { updateProvider } from '@/lib/firestore';

// Make this route dynamic - don't try to statically generate
export const dynamic = 'force-dynamic';

// Lazy load the paystack config to avoid build-time errors
async function getPaystackSecretSafe(): Promise<string | null> {
  try {
    const { getPaystackSecret } = await import('@/lib/paystack-config');
    return await getPaystackSecret();
  } catch (e) {
    console.error('[create-subaccount] Failed to get Paystack secret:', e);
    // Fallback to env var directly
    return process.env.PAYSTACK_SECRET_KEY || null;
  }
}

interface CreateSubaccountRequest {
  providerId: string;
  businessName: string;
  bankCode: string;
  accountNumber: string;
  email: string;
}

interface PaystackSubaccountResponse {
  status: boolean;
  message: string;
  data: {
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
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateSubaccountRequest = await request.json();
    
    // Validate required fields
    const { providerId, businessName, bankCode, accountNumber, email } = body;
    
    if (!providerId || !businessName || !bankCode || !accountNumber || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: providerId, businessName, bankCode, accountNumber, email' },
        { status: 400 }
      );
    }

    // Get Paystack secret key from Firestore admin settings
    const paystackSecretKey = await getPaystackSecretSafe();
    
    if (!paystackSecretKey) {
      return NextResponse.json(
        { error: 'Paystack secret key not configured' },
        { status: 500 }
      );
    }

    // Create subaccount via Paystack API
    const paystackResponse = await fetch('https://api.paystack.co/subaccount', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        business_name: businessName,
        settlement_bank: bankCode,
        account_number: accountNumber,
        percentage_charge: 10, // Gigsenda takes 10% commission
        description: "Gigsenda service provider",
        primary_contact_email: email,
      }),
    });

    if (!paystackResponse.ok) {
      const errorData = await paystackResponse.json().catch(() => ({}));
      console.error('Paystack subaccount creation failed:', errorData);
      
      return NextResponse.json(
        { 
          error: 'Failed to create subaccount with Paystack',
          details: errorData.message || 'Unknown error'
        },
        { status: 400 }
      );
    }

    const paystackData: PaystackSubaccountResponse = await paystackResponse.json();
    
    if (!paystackData.status || !paystackData.data) {
      console.error('Invalid Paystack response:', paystackData);
      return NextResponse.json(
        { error: 'Invalid response from payment provider' },
        { status: 500 }
      );
    }

    // Save subaccount details to Firestore
    await updateProvider(providerId, {
      paystackSubaccountCode: paystackData.data.subaccount_code,
      paystackSubaccountId: paystackData.data.id.toString(),
      subaccountCreatedAt: new Date(),
      subaccountActive: true,
    });

    console.log(`Successfully created Paystack subaccount for provider ${providerId}: ${paystackData.data.subaccount_code}`);

    return NextResponse.json({
      success: true,
      message: 'Subaccount created successfully',
      subaccountCode: paystackData.data.subaccount_code,
      subaccountId: paystackData.data.id,
      businessName: paystackData.data.business_name,
    });

  } catch (error) {
    console.error('Error creating Paystack subaccount:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

// Handle other HTTP methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

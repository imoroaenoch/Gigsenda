import { NextRequest, NextResponse } from "next/server";
import { initializePayment } from "@/lib/paystack";
import { getProvider } from "@/lib/firestore";
import { getSettingSection } from "@/lib/admin-settings";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { verifyAuthToken, addSecurityHeaders } from "@/lib/security";

export const dynamic = 'force-dynamic';

// Payment initialization handler
export async function POST(request: NextRequest) {
  // ── Auth ──
  const user = await verifyAuthToken(request);
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  // ── Parse body ──
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  return handlePaymentInit(request, { user, data: body });
}

async function handlePaymentInit(request: NextRequest, context: { user: any; data: any }) {
  try {
    if (!context.data || !context.user) {
      return NextResponse.json(
        { error: "Invalid request context" },
        { status: 400 }
      );
    }

    const { email, amount, metadata } = context.data;
    const user = context.user;


    // Validate required fields
    if (!email || !amount || !metadata) {
      return NextResponse.json(
        { error: "Missing required fields: email, amount, metadata" },
        { status: 400 }
      );
    }

    // Validate required metadata fields
    const requiredMetadataFields = ["bookingId", "customerId", "providerId", "customerName", "providerName", "serviceName"];
    for (const field of requiredMetadataFields) {
      if (!metadata[field]) {
        return NextResponse.json(
          { error: `Missing required metadata field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Additional validation: ensure user can only make payments for themselves
    if (metadata.customerId !== user.uid) {
      return NextResponse.json(
        { error: "Unauthorized: You can only make payments for your own bookings" },
        { status: 403 }
      );
    }

    // Fetch commission settings and provider details
    let providerSubaccountCode: string | undefined;
    let commissionRate = 0.1; // Default fallback

    try {
      // Fetch current commission settings from admin
      const commissionSettings = await getSettingSection("commission") as { percentage?: number } | null;
      if (commissionSettings && commissionSettings.percentage) {
        commissionRate = commissionSettings.percentage / 100; // Convert percentage to decimal
      }

      // Fetch provider details
      const provider = await getProvider(metadata.providerId);
      
      if (!provider) {
        // Log payment error for missing provider
        await addDoc(collection(db, "payment_errors"), {
          error: "Provider not found",
          providerId: metadata.providerId,
          bookingId: metadata.bookingId,
          customerId: metadata.customerId,
          userId: user.uid,
          amount,
          email,
          commissionRate,
          createdAt: serverTimestamp(),
        });

        return NextResponse.json(
          { 
            error: "Payment temporarily unavailable for this provider. Please contact support.",
            code: "PROVIDER_NOT_FOUND"
          },
          { status: 400 }
        );
      }

      // Check if provider has subaccount
      if (provider.paystackSubaccountCode) {
        providerSubaccountCode = provider.paystackSubaccountCode;
      } else {
        // Log payment error for missing subaccount
        await addDoc(collection(db, "payment_errors"), {
          error: "Provider has no subaccount — payment blocked",
          providerId: metadata.providerId,
          providerName: metadata.providerName,
          bookingId: metadata.bookingId,
          customerId: metadata.customerId,
          userId: user.uid,
          amount,
          email,
          commissionRate,
          needsManualSubaccount: provider.needsManualSubaccount || false,
          subaccountError: provider.subaccountError || null,
          createdAt: serverTimestamp(),
        });

        return NextResponse.json(
          { 
            error: "This provider hasn't completed their payment setup yet. Please ask them to add their bank account details, or contact support.",
            code: "NO_SUBACCOUNT"
          },
          { status: 400 }
        );
      }

    } catch (providerError) {
      console.error("Error fetching provider or commission settings for payment:", providerError);
      
      // Log the error
      await addDoc(collection(db, "payment_errors"), {
        error: "Failed to fetch provider details or commission settings",
        providerId: metadata.providerId,
        bookingId: metadata.bookingId,
        customerId: metadata.customerId,
        userId: user.uid,
        amount,
        email,
        details: providerError instanceof Error ? providerError.message : "Unknown error",
        createdAt: serverTimestamp(),
      });

      return NextResponse.json(
        { 
          error: "Payment service temporarily unavailable. Please try again.",
          code: "PROVIDER_FETCH_ERROR"
        },
        { status: 500 }
      );
    }

    // Initialize payment with split
    const result = await initializePayment({
      email,
      amount,
      metadata,
      providerSubaccountCode,
      commissionRate,
    });

    if (!result.status || !result.data) {
      // Log payment initialization error
      await addDoc(collection(db, "payment_errors"), {
        error: result.message || "Failed to initialize payment",
        providerId: metadata.providerId,
        bookingId: metadata.bookingId,
        customerId: metadata.customerId,
        userId: user.uid,
        amount,
        email,
        providerSubaccountCode,
        commissionRate,
        createdAt: serverTimestamp(),
      });

      return NextResponse.json(
        { error: result.message || "Failed to initialize payment" },
        { status: 500 }
      );
    }

    // Return success response
    const response = NextResponse.json({
      success: true,
      data: {
        authorization_url: result.data.authorization_url,
        reference: result.data.reference,
        access_code: result.data.access_code,
      },
    });

    // Add security headers
    return addSecurityHeaders(response);

  } catch (error) {
    console.error("Payment initialization error:", error);
    
    // Log unexpected errors
    await addDoc(collection(db, "payment_errors"), {
      error: "Unexpected error during payment initialization",
      userId: context.user.uid,
      details: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      createdAt: serverTimestamp(),
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405 }
  );
}

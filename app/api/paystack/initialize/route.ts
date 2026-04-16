import { NextRequest, NextResponse } from "next/server";
import { initializePayment } from "@/lib/paystack";
import { verifyAuthToken, addSecurityHeaders } from "@/lib/security";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

export const dynamic = 'force-dynamic';

function getAdminDb() {
  const app = getApps().length > 0 ? getApps()[0] : initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    }),
  });
  return getFirestore(app);
}

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

    const adminDb = getAdminDb();

    // Fetch commission settings and provider details
    let providerSubaccountCode: string | undefined;
    let commissionRate = 0.1; // Default fallback

    try {
      // Fetch current commission settings from admin
      const commSnap = await adminDb.doc("app_settings/commission").get();
      if (commSnap.exists) {
        const pct = commSnap.data()?.percentage;
        if (typeof pct === "number") commissionRate = pct / 100;
      }

      // Fetch provider details
      const providerSnap = await adminDb.doc(`providers/${metadata.providerId}`).get();

      if (!providerSnap.exists) {
        await adminDb.collection("payment_errors").add({
          error: "Provider not found",
          providerId: metadata.providerId,
          bookingId: metadata.bookingId,
          customerId: metadata.customerId,
          userId: user.uid,
          amount,
          email,
          commissionRate,
          createdAt: FieldValue.serverTimestamp(),
        });
        return NextResponse.json(
          { error: "Payment temporarily unavailable for this provider. Please contact support.", code: "PROVIDER_NOT_FOUND" },
          { status: 400 }
        );
      }

      const provider = providerSnap.data()!;

      // Check if provider has subaccount
      if (provider.paystackSubaccountCode) {
        providerSubaccountCode = provider.paystackSubaccountCode;
      } else {
        await adminDb.collection("payment_errors").add({
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
          createdAt: FieldValue.serverTimestamp(),
        });
        return NextResponse.json(
          { error: "This provider hasn't completed their payment setup yet. Please ask them to add their bank account details, or contact support.", code: "NO_SUBACCOUNT" },
          { status: 400 }
        );
      }

    } catch (providerError) {
      console.error("Error fetching provider or commission settings for payment:", providerError);
      try {
        await adminDb.collection("payment_errors").add({
          error: "Failed to fetch provider details or commission settings",
          providerId: metadata.providerId,
          bookingId: metadata.bookingId,
          customerId: metadata.customerId,
          userId: user.uid,
          amount,
          email,
          details: providerError instanceof Error ? providerError.message : "Unknown error",
          createdAt: FieldValue.serverTimestamp(),
        });
      } catch {}
      return NextResponse.json(
        { error: "Payment service temporarily unavailable. Please try again.", code: "PROVIDER_FETCH_ERROR" },
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
      try {
        await adminDb.collection("payment_errors").add({
          error: result.message || "Failed to initialize payment",
          providerId: metadata.providerId,
          bookingId: metadata.bookingId,
          customerId: metadata.customerId,
          userId: user.uid,
          amount,
          email,
          providerSubaccountCode,
          commissionRate,
          createdAt: FieldValue.serverTimestamp(),
        });
      } catch {}
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

    return addSecurityHeaders(response);

  } catch (error) {
    console.error("Payment initialization error:", error);
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

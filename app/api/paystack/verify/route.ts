import { NextRequest, NextResponse } from "next/server";
import { verifyPayment, calculateCommission } from "@/lib/paystack";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { addSecurityHeaders } from "@/lib/security";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { reference } = body;

    if (!reference) {
      return NextResponse.json(
        { error: "Missing required field: reference" },
        { status: 400 }
      );
    }

    // Verify payment with Paystack
    const result = await verifyPayment(reference);

    if (!result.status || !result.data) {
      return NextResponse.json(
        { error: result.message || "Payment verification failed" },
        { status: 400 }
      );
    }

    const paymentData = result.data;

    // Check if payment was successful
    if (paymentData.status !== "success") {
      return NextResponse.json(
        { error: "Payment was not successful" },
        { status: 400 }
      );
    }

    // Extract metadata
    const metadata = paymentData.metadata;
    const amountInNaira = paymentData.amount / 100; // Convert from kobo to Naira

    const adminDb = getAdminDb();

    // Fetch current commission settings for accurate calculation
    let commissionRate = 0.1; // Default fallback
    try {
      const commSnap = await adminDb.doc("app_settings/commission").get();
      if (commSnap.exists) {
        const pct = commSnap.data()?.percentage;
        if (typeof pct === "number") commissionRate = pct / 100;
      }
    } catch (error) {
      console.error("Error fetching commission settings:", error);
    }

    // Calculate commission with dynamic rate
    const commission = calculateCommission(amountInNaira, commissionRate);

    // Fetch provider to get subaccount details
    let providerSubaccountCode: string | undefined;
    let providerBankDetails: any = null;

    try {
      const providerDoc = await adminDb.doc(`providers/${metadata.providerId}`).get();
      if (providerDoc.exists) {
        const providerData = providerDoc.data()!;
        providerSubaccountCode = providerData.paystackSubaccountCode;
        providerBankDetails = {
          bankName: providerData.bankName,
          accountNumber: providerData.bankAccountNumber,
          accountName: providerData.bankAccountName,
        };
      }
    } catch (error) {
      console.error("Error fetching provider details:", error);
    }

    // Log the transaction breakdown
    const expectedSettlementDate = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const transactionData = {
      reference: paymentData.reference,
      totalAmount: amountInNaira,
      commission: commission.commission,
      providerAmount: commission.providerAmount,
      commissionRate,
      customerId: metadata.customerId,
      customerName: metadata.customerName,
      providerId: metadata.providerId,
      providerName: metadata.providerName,
      serviceName: metadata.serviceName,
      bookingId: metadata.bookingId,
      providerSubaccountCode: providerSubaccountCode || null,
      providerBankDetails: providerBankDetails || null,
      status: "success",
      paymentMethod: "paystack",
      paidAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      settlementStatus: "pending",
      expectedSettlementDate,
    };

    // Save transaction to Firestore
    await adminDb.doc(`transactions/${paymentData.reference}`).set(transactionData);

    // Update booking status to "paid"
    try {
      await adminDb.doc(`bookings/${metadata.bookingId}`).update({
        status: "paid",
        paymentReference: paymentData.reference,
        paidAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } catch (bookingError) {
      console.error("Error updating booking status:", bookingError);
    }

    // Send notifications
    try {
      await adminDb.collection("notifications").add({
        userId: metadata.providerId,
        type: "payment_received",
        title: "Payment Received",
        message: `Payment of ₦${amountInNaira.toLocaleString()} received for your booking. ₦${commission.providerAmount.toLocaleString()} will be settled to your bank account within 24-48 hours.`,
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      });
      await adminDb.collection("notifications").add({
        userId: metadata.customerId,
        type: "payment_successful",
        title: "Payment Successful",
        message: `Your payment of ₦${amountInNaira.toLocaleString()} was successful. Your booking with ${metadata.providerName} is confirmed.`,
        bookingId: metadata.bookingId,
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch (notificationError) {
      console.error("Error sending notifications:", notificationError);
    }

    // Return success response
    const response = NextResponse.json({
      success: true,
      data: {
        reference: paymentData.reference,
        status: paymentData.status,
        amount: amountInNaira,
        bookingId: metadata.bookingId,
        commission: commission.commission,
        providerAmount: commission.providerAmount,
        settlementStatus: "pending",
        expectedSettlementDate: transactionData.expectedSettlementDate,
      },
    });

    // Add security headers
    return addSecurityHeaders(response);

  } catch (error) {
    console.error("Payment verification error:", error instanceof Error ? error.message : error);
    
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

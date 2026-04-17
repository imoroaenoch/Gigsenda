import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/admin-db";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function getPaystackSecretSafe(): Promise<string> {
  try {
    const { getPaystackSecret } = await import("@/lib/paystack-config");
    return await getPaystackSecret();
  } catch {
    const key = process.env.PAYSTACK_SECRET_KEY;
    if (key) return key;
    throw new Error("Paystack secret key not configured");
  }
}

async function getLiveCommissionRateSafe(): Promise<number> {
  try {
    const db = getAdminDb();
    const snap = await db.doc("app_settings/commission").get();
    if (snap.exists) {
      const pct = snap.data()?.percentage;
      if (typeof pct === "number" && pct > 0) return pct / 100;
    }
  } catch {}
  return 0.1;
}

async function createOrGetRecipient(
  name: string,
  accountNumber: string,
  bankCode: string
): Promise<string> {
  const secret = await getPaystackSecretSafe();
  const res = await fetch("https://api.paystack.co/transferrecipient", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "nuban",
      name,
      account_number: accountNumber,
      bank_code: bankCode,
      currency: "NGN",
    }),
  });
  const data = await res.json();
  if (!data.status) throw new Error(data.message || "Failed to create transfer recipient");
  return data.data.recipient_code;
}

async function initiateTransfer(
  amount: number,
  recipientCode: string,
  reason: string
): Promise<string> {
  const secret = await getPaystackSecretSafe();
  const res = await fetch("https://api.paystack.co/transfer", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      source: "balance",
      amount: Math.round(amount * 100), // kobo
      recipient: recipientCode,
      reason,
    }),
  });
  const data = await res.json();
  if (!data.status) throw new Error(data.message || "Transfer failed");
  return data.data.reference;
}

export async function POST(req: NextRequest) {
  try {
    const { bookingId, providerId, amount } = await req.json();

    if (!bookingId || !providerId || !amount) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const adminDb = getAdminDb();

    // Fetch provider bank details
    const providerSnap = await adminDb.doc(`providers/${providerId}`).get();
    if (!providerSnap.exists) {
      return NextResponse.json({ success: false, error: "Provider not found" }, { status: 404 });
    }

    const providerData = providerSnap.data()!;
    const bankDetails = providerData.bankDetails;

    if (!bankDetails?.accountNumber || !bankDetails?.bankCode || !bankDetails?.accountName) {
      return NextResponse.json(
        { success: false, error: "Provider bank details incomplete" },
        { status: 400 }
      );
    }

    const commissionRate = await getLiveCommissionRateSafe();
    const commission = Math.round(amount * commissionRate);
    const providerAmount = amount - commission;

    // Create or get recipient
    const recipientCode = providerData.paystackRecipientCode ||
      await createOrGetRecipient(
        bankDetails.accountName,
        bankDetails.accountNumber,
        bankDetails.bankCode
      );

    // Save recipient code for future use
    if (!providerData.paystackRecipientCode) {
      await adminDb.doc(`providers/${providerId}`).update({
        paystackRecipientCode: recipientCode,
      });
    }

    // Initiate transfer
    const transferReference = await initiateTransfer(
      providerAmount,
      recipientCode,
      `Gigsenda service payment - Booking #${bookingId}`
    );

    // Update booking
    await adminDb.doc(`bookings/${bookingId}`).update({
      escrowStatus: "released",
      fundsReleased: true,
      fundsReleasedAt: FieldValue.serverTimestamp(),
      transferReference,
      providerAmountPaid: providerAmount,
      commissionEarned: commission,
      status: "completed",
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      data: { transferReference, providerAmount, commission },
    });
  } catch (error) {
    console.error("Transfer error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Transfer failed" },
      { status: 500 }
    );
  }
}

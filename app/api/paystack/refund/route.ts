import { NextRequest, NextResponse } from "next/server";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

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

export async function POST(req: NextRequest) {
  try {
    const { bookingId, customerId, reason } = await req.json();

    if (!bookingId || !customerId || !reason) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const adminDb = getAdminDb();

    // Fetch booking
    const bookingSnap = await adminDb.doc(`bookings/${bookingId}`).get();
    if (!bookingSnap.exists) {
      return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 });
    }

    const booking = bookingSnap.data()!;
    const paymentReference = booking.paymentReference;

    if (!paymentReference) {
      return NextResponse.json(
        { success: false, error: "No payment reference found for this booking" },
        { status: 400 }
      );
    }

    // Call Paystack refund API
    const secret = await getPaystackSecretSafe();
    const res = await fetch("https://api.paystack.co/refund", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        transaction: paymentReference,
        amount: Math.round((booking.totalAmount || booking.price) * 100),
      }),
    });

    const data = await res.json();
    if (!data.status) {
      throw new Error(data.message || "Refund failed");
    }

    // Update booking status
    await adminDb.doc(`bookings/${bookingId}`).update({
      status: "refunded",
      escrowStatus: "refunded",
      refundedAt: FieldValue.serverTimestamp(),
      refundReason: reason,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Send notification to customer
    await adminDb.collection("notifications").add({
      userId: customerId,
      title: "Refund Processed",
      message: "Your refund has been processed. Money will return to your account within 3-5 business days.",
      type: "payment",
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    // Send notification to provider
    if (booking.providerId) {
      await adminDb.collection("notifications").add({
        userId: booking.providerId,
        title: "Booking Refunded",
        message: `A booking has been refunded due to: ${reason}`,
        type: "booking",
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    return NextResponse.json({ success: true, data: data.data });
  } catch (error) {
    console.error("Refund error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Refund failed" },
      { status: 500 }
    );
  }
}

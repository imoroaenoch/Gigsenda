import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/admin-db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-paystack-signature");

    // Verify webhook signature
    const secret = process.env.PAYSTACK_SECRET_KEY!;
    const hash = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");

    if (hash !== signature) {
      console.error("[webhook] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    console.log("[webhook] Event received:", event.event);

    if (event.event === "charge.success") {
      const data = event.data;
      const metadata = data.metadata;
      const bookingId = metadata?.bookingId;
      const reference = data.reference;

      if (!bookingId) {
        console.warn("[webhook] No bookingId in metadata");
        return NextResponse.json({ received: true });
      }

      const adminDb = getAdminDb();

      // Check if already processed (idempotency)
      const bookingSnap = await adminDb.doc(`bookings/${bookingId}`).get();
      if (!bookingSnap.exists) {
        console.warn("[webhook] Booking not found:", bookingId);
        return NextResponse.json({ received: true });
      }

      const booking = bookingSnap.data()!;
      if (booking.paymentStatus === "success") {
        console.log("[webhook] Already processed:", bookingId);
        return NextResponse.json({ received: true });
      }

      // Update booking to paid
      await adminDb.doc(`bookings/${bookingId}`).update({
        status: "paid",
        paymentStatus: "success",
        paymentReference: reference,
        paidAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      console.log("[webhook] Booking marked as paid:", bookingId);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[webhook] Error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

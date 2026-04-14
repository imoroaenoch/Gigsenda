import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";

export const dynamic = 'force-dynamic';
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getPaystackSecret } from "@/lib/paystack-config";

export async function POST(req: NextRequest) {
  try {
    const { bookingId, customerId, reason } = await req.json();

    if (!bookingId || !customerId || !reason) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    // Fetch booking
    const bookingSnap = await getDoc(doc(db, "bookings", bookingId));
    if (!bookingSnap.exists()) {
      return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 });
    }

    const booking = bookingSnap.data();
    const paymentReference = booking.paymentReference;

    if (!paymentReference) {
      return NextResponse.json(
        { success: false, error: "No payment reference found for this booking" },
        { status: 400 }
      );
    }

    // Call Paystack refund API
    const secret = await getPaystackSecret();
    const res = await fetch("https://api.paystack.co/refund", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        transaction: paymentReference,
        amount: Math.round((booking.totalAmount || booking.price) * 100), // kobo
      }),
    });

    const data = await res.json();
    if (!data.status) {
      throw new Error(data.message || "Refund failed");
    }

    // Update booking status
    await updateDoc(doc(db, "bookings", bookingId), {
      status: "refunded",
      escrowStatus: "refunded",
      refundedAt: serverTimestamp(),
      refundReason: reason,
      updatedAt: serverTimestamp(),
    });

    // Send notification to customer
    await addDoc(collection(db, "notifications"), {
      userId: customerId,
      title: "Refund Processed",
      message: "Your refund has been processed. Money will return to your account within 3-5 business days.",
      type: "payment",
      read: false,
      createdAt: serverTimestamp(),
    });

    // Send notification to provider
    if (booking.providerId) {
      await addDoc(collection(db, "notifications"), {
        userId: booking.providerId,
        title: "Booking Refunded",
        message: `A booking has been refunded due to: ${reason}`,
        type: "booking",
        read: false,
        createdAt: serverTimestamp(),
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

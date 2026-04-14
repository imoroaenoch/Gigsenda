"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format } from "date-fns";
import { CheckCircle2, Calendar, User, MessageSquare, Home, Star } from "lucide-react";
import Image from "next/image";
import confetti from "canvas-confetti";

export default function BookingSuccessPage() {
  const { id } = useParams();
  const router = useRouter();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getDoc(doc(db, "bookings", id as string))
      .then(snap => {
        if (snap.exists()) setBooking({ id: snap.id, ...snap.data() });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!loading && booking) {
      // Fire confetti on load
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.5 },
        colors: ["#FF8C00", "#FFB347", "#FFF", "#FF6B00"],
      });
    }
  }, [loading, booking]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFDF7] flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-[#FFFDF7] flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-gray-500">Booking not found.</p>
        <button onClick={() => router.push("/home")} className="text-primary font-bold underline">
          Go Home
        </button>
      </div>
    );
  }

  const bookingDate = booking.date?.toDate ? booking.date.toDate() : new Date(booking.date);
  const amount = (booking.totalAmount ?? booking.price ?? booking.amount ?? 0).toLocaleString();

  return (
    <div className="min-h-screen bg-[#FFFDF7] flex flex-col items-center justify-center px-5 py-12">
      {/* Success card */}
      <div className="w-full max-w-md">

        {/* Icon */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-24 w-24 rounded-full bg-green-100 flex items-center justify-center mb-4 shadow-lg shadow-green-200">
            <CheckCircle2 className="h-14 w-14 text-green-500" />
          </div>
          <h1 className="text-2xl font-black text-text text-center">Booking Confirmed!</h1>
          <p className="text-sm text-text-light text-center mt-2">
            Your payment was successful and your booking is confirmed.
          </p>
        </div>

        {/* Booking summary card */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 mb-5">
          {/* Provider */}
          <div className="flex items-center gap-3 mb-5 pb-5 border-b border-gray-100">
            {booking.providerPhoto ? (
              <Image
                src={booking.providerPhoto}
                alt={booking.providerName}
                width={52}
                height={52}
                className="rounded-full object-cover"
              />
            ) : (
              <div className="h-13 w-13 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
            )}
            <div>
              <p className="text-[13px] text-text-light font-semibold uppercase tracking-wider">Your Provider</p>
              <p className="text-base font-black text-text">{booking.providerName}</p>
              <p className="text-xs text-text-light">{booking.serviceTitle || booking.category}</p>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-text-light">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">Date</span>
              </div>
              <span className="text-sm font-bold text-text">
                {format(bookingDate, "EEE, MMM d, yyyy")}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-text-light">Package</span>
              <span className="text-sm font-bold text-text">{booking.servicePackage || "Standard"}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-text-light">Amount Paid</span>
              <span className="text-base font-black text-primary">₦{amount}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-text-light">Status</span>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 px-3 py-1 rounded-full">
                <CheckCircle2 className="h-3 w-3" /> Paid & Confirmed
              </span>
            </div>
          </div>
        </div>

        {/* Info banner */}
        <div className="bg-orange-50 border border-orange-100 rounded-2xl px-4 py-3 mb-6 flex items-start gap-3">
          <Star className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-xs text-orange-800 font-medium">
            Your funds are held securely in escrow and will be released to the provider after you confirm the service is completed.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => router.push(`/chat?providerId=${booking.providerId}&bookingId=${booking.id}`)}
            className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-gradient-to-r from-[#FF9A3E] to-[#FF8C00] text-white font-black text-[15px] shadow-lg shadow-primary/20"
          >
            <MessageSquare className="h-5 w-5" />
            Message {booking.providerName?.split(" ")[0]}
          </button>

          <button
            onClick={() => router.push("/home")}
            className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl border-2 border-gray-200 text-text font-bold text-[15px]"
          >
            <Home className="h-5 w-5" />
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}

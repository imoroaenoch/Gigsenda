import { db } from "@/lib/firebase";
import {
  doc, getDoc, updateDoc, addDoc, collection, serverTimestamp,
} from "firebase/firestore";

export async function holdFunds(bookingId: string) {
  await updateDoc(doc(db, "bookings", bookingId), {
    escrowStatus: "holding",
    fundsReleased: false,
    updatedAt: serverTimestamp(),
  });
}

export async function releaseFunds(bookingId: string, providerId: string, amount: number) {
  const res = await fetch("/api/paystack/transfer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bookingId, providerId, amount }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || "Transfer failed");
  return data;
}

export async function refundFunds(bookingId: string, customerId: string, reason: string) {
  const res = await fetch("/api/paystack/refund", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bookingId, customerId, reason }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || "Refund failed");
  return data;
}

export async function getEscrowStatus(bookingId: string) {
  const snap = await getDoc(doc(db, "bookings", bookingId));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    escrowStatus: d.escrowStatus || "none",
    fundsReleased: d.fundsReleased || false,
    status: d.status,
    inProgressAt: d.inProgressAt || null,
  };
}

export async function createDispute(
  bookingId: string,
  customerId: string,
  providerId: string,
  reason: string,
  amount: number
) {
  const ref = await addDoc(collection(db, "disputes"), {
    bookingId,
    customerId,
    providerId,
    reason,
    amount,
    status: "open",
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "bookings", bookingId), {
    status: "disputed",
    escrowStatus: "disputed",
    disputeId: ref.id,
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

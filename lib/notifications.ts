import { db } from "./firebase";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch,
  serverTimestamp,
  Timestamp,
  limit,
} from "firebase/firestore";

export type NotifType = "booking" | "message" | "system";

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotifType;
  read: boolean;
  link: string;
  createdAt: Timestamp;
}

// ── Write ──────────────────────────────────────────────────────────────────

export const sendNotification = async (
  userId: string,
  title: string,
  message: string,
  type: NotifType,
  link: string
) => {
  if (!userId) return;
  try {
    await addDoc(collection(db, "notifications"), {
      userId,
      title,
      message,
      type,
      read: false,
      link,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.error("sendNotification error:", e);
  }
};

// ── Booking event helpers ──────────────────────────────────────────────────

export const notifyNewBooking = (
  providerId: string,
  customerName: string,
  bookingId: string
) =>
  sendNotification(
    providerId,
    "New Booking Request",
    `${customerName} has booked your service. Review and accept it.`,
    "booking",
    "/provider/bookings"
  );

export const notifyBookingAccepted = (
  customerId: string,
  providerName: string,
  bookingId: string
) =>
  sendNotification(
    customerId,
    "Booking Accepted! 🎉",
    `${providerName} has accepted your booking. You're all set!`,
    "booking",
    "/bookings"
  );

export const notifyBookingDeclined = (
  customerId: string,
  providerName: string,
  bookingId: string
) =>
  sendNotification(
    customerId,
    "Booking Declined",
    `${providerName} has declined your booking request.`,
    "booking",
    "/bookings"
  );

export const notifyJobCompleted = (
  customerId: string,
  providerName: string,
  bookingId: string
) =>
  sendNotification(
    customerId,
    "Job Completed ✅",
    `${providerName} has marked your job as completed. Leave a review!`,
    "booking",
    "/bookings"
  );

// ── Message event helper ───────────────────────────────────────────────────

export const notifyNewMessage = (
  recipientId: string,
  senderName: string,
  conversationId: string,
  messageText?: string
) =>
  sendNotification(
    recipientId,
    `New message from ${senderName}`,
    messageText
      ? messageText.length > 120 ? messageText.slice(0, 117) + "…" : messageText
      : "You have a new message. Tap to reply.",
    "message",
    `/chat/${conversationId}`
  );

// ── Read ───────────────────────────────────────────────────────────────────

export const markNotificationRead = async (notifId: string) => {
  try {
    await updateDoc(doc(db, "notifications", notifId), { read: true });
  } catch (e) {
    console.error("markNotificationRead error:", e);
  }
};

export const markAllNotificationsRead = async (userId: string) => {
  try {
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      where("read", "==", false)
    );
    const snap = await getDocs(q);
    if (snap.empty) return;
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
    await batch.commit();
  } catch (e) {
    console.error("markAllNotificationsRead error:", e);
  }
};

// ── Real-time listener ─────────────────────────────────────────────────────

export const subscribeNotifications = (
  userId: string,
  callback: (notifs: AppNotification[]) => void,
  maxItems = 50
) => {
  const q = query(
    collection(db, "notifications"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(maxItems)
  );
  return onSnapshot(
    q,
    (snap) => {
      const notifs = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<AppNotification, "id">),
      }));
      callback(notifs);
    },
    (err) => {
      if ((err as any)?.code === "failed-precondition") {
        console.warn(
          "[Notifications] Missing Firestore index. Create it here:",
          "https://console.firebase.google.com/project/gigsenda/firestore/indexes"
        );
        callback([]); // return empty so UI doesn't hang
      } else {
        console.error("subscribeNotifications error:", err);
      }
    }
  );
};

export const subscribeUnreadCount = (
  userId: string,
  callback: (count: number) => void
) => {
  const q = query(
    collection(db, "notifications"),
    where("userId", "==", userId),
    where("read", "==", false)
  );
  return onSnapshot(
    q,
    (snap) => callback(snap.size),
    (err) => {
      if ((err as any)?.code === "failed-precondition") {
        console.warn("[Notifications] Missing index for unread count query.");
        callback(0);
      } else {
        console.error("subscribeUnreadCount error:", err);
      }
    }
  );
};

import { db } from "./firebase";
import { notifyNewMessage } from "./notifications";
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  updateDoc, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  addDoc,
  Timestamp,
  increment,
  writeBatch,
  limit,
  startAfter,
  QueryDocumentSnapshot,
} from "firebase/firestore";

export const MESSAGE_PAGE_SIZE = 40;

export interface Conversation {
  id: string;
  customerId: string;
  providerId: string;
  bookingId: string;
  lastMessage: string;
  lastMessageTime: Timestamp;
  lastMessageAt: Timestamp;
  unreadCount: { [userId: string]: number };
  createdAt: Timestamp;
  participants: string[];
}

export interface Message {
  id: string;
  senderId: string;
  message: string;
  createdAt: Timestamp;
  isRead: boolean;
  status: "sent" | "delivered" | "read";
}

// Module-level cache so sendMessage doesn't re-fetch convData on every keystroke
const convCache = new Map<string, { data: Conversation; ts: number }>();
const CONV_CACHE_TTL = 60_000; // 1 min

async function getCachedConv(conversationId: string): Promise<Conversation> {
  const cached = convCache.get(conversationId);
  if (cached && Date.now() - cached.ts < CONV_CACHE_TTL) return cached.data;
  const snap = await getDoc(doc(db, "conversations", conversationId));
  if (!snap.exists()) throw new Error("Conversation not found");
  const data = { id: snap.id, ...snap.data() } as Conversation;
  convCache.set(conversationId, { data, ts: Date.now() });
  return data;
}

export function invalidateConvCache(conversationId: string) {
  convCache.delete(conversationId);
}

/**
 * Creates a new conversation or returns existing one
 * One conversation per customer-provider pair (not per booking)
 */
export const createConversation = async (customerId: string, providerId: string, bookingId: string) => {
  try {
    const conversationsRef = collection(db, "conversations");
    
    // Check if conversation already exists between this customer and provider
    const q = query(
      conversationsRef, 
      where("customerId", "==", customerId),
      where("providerId", "==", providerId)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      // Return existing conversation
      return querySnapshot.docs[0].id;
    }

    // Create new conversation only if one doesn't exist
    const newConvRef = doc(conversationsRef);
    const conversationData: Conversation = {
      id: newConvRef.id,
      customerId,
      providerId,
      bookingId,
      lastMessage: "",
      lastMessageTime: serverTimestamp() as Timestamp,
      lastMessageAt: serverTimestamp() as Timestamp,
      unreadCount: {
        [customerId]: 0,
        [providerId]: 0
      },
      createdAt: serverTimestamp() as Timestamp,
      participants: [customerId, providerId]
    };

    await setDoc(newConvRef, conversationData);
    return newConvRef.id;
  } catch (error) {
    console.error("Error creating conversation:", error);
    throw error;
  }
};

/**
 * Sends a message in a conversation
 */
export const sendMessage = async (conversationId: string, senderId: string, message: string) => {
  try {
    const messagesRef = collection(db, "conversations", conversationId, "messages");
    const convRef = doc(db, "conversations", conversationId);

    // Use cache to avoid a Firestore read on every send
    const convData = await getCachedConv(conversationId);
    const recipientId = convData.participants.find(p => p !== senderId);
    if (!recipientId) throw new Error("Recipient not found");

    // Add message to subcollection with status field
    const newMessageRef = await addDoc(messagesRef, {
      senderId,
      message,
      createdAt: serverTimestamp(),
      isRead: false,
      status: "sent",
    });

    // Update conversation summary — write both aliases for compatibility
    await updateDoc(convRef, {
      lastMessage: message,
      lastMessageTime: serverTimestamp(),
      lastMessageAt: serverTimestamp(),
      [`unreadCount.${recipientId}`]: increment(1),
    });

    // Invalidate cache so next fetch gets fresh data
    invalidateConvCache(conversationId);

    // Notify recipient (fire-and-forget) — include actual message text
    getDoc(doc(db, "users", senderId))
      .then(snap => {
        const name = snap.exists() ? (snap.data().name || "Someone") : "Someone";
        notifyNewMessage(recipientId, name, conversationId, message);
      })
      .catch(() => notifyNewMessage(recipientId, "Someone", conversationId, message));

    return newMessageRef.id;
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};

/**
 * Returns a real-time listener for the latest page of messages.
 * Pass a cursor doc to load older messages (pagination).
 */
export const getMessages = (
  conversationId: string,
  callback: (messages: Message[]) => void,
  onError?: (error: any) => void,
  pageSize = MESSAGE_PAGE_SIZE,
  cursorDoc?: QueryDocumentSnapshot
) => {
  const messagesRef = collection(db, "conversations", conversationId, "messages");
  let q = query(messagesRef, orderBy("createdAt", "asc"), limit(pageSize));
  if (cursorDoc) {
    q = query(messagesRef, orderBy("createdAt", "asc"), startAfter(cursorDoc), limit(pageSize));
  }

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data(),
    })) as Message[];
    callback(messages);
  }, (error) => {
    console.error("Error listening to messages:", error);
    if (onError) onError(error);
  });
};

/**
 * Fetches ONE older page of messages before the given cursor doc (for load-more).
 * Returns the docs so caller can keep the oldest doc as new cursor.
 */
export const fetchOlderMessages = async (
  conversationId: string,
  beforeDoc: QueryDocumentSnapshot,
  pageSize = MESSAGE_PAGE_SIZE
): Promise<{ messages: Message[]; docs: QueryDocumentSnapshot[] }> => {
  const messagesRef = collection(db, "conversations", conversationId, "messages");
  const q = query(
    messagesRef,
    orderBy("createdAt", "desc"),
    startAfter(beforeDoc),
    limit(pageSize)
  );
  const snap = await getDocs(q);
  const docs = snap.docs as QueryDocumentSnapshot[];
  const messages = docs
    .map(d => ({ id: d.id, ...d.data() } as Message))
    .reverse(); // put back in ascending order
  return { messages, docs };
};

/**
 * Returns all conversations for a user
 */
export const getConversations = (
  userId: string, 
  callback: (conversations: Conversation[]) => void,
  onError?: (error: any) => void
) => {
  const conversationsRef = collection(db, "conversations");
  const q = query(conversationsRef, where("participants", "array-contains", userId));
  
  return onSnapshot(q, (snapshot) => {
    const conversations = (snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Conversation[])
      .sort((a, b) => {
        const aTime = (a.lastMessageTime as any)?.toMillis?.() || 0;
        const bTime = (b.lastMessageTime as any)?.toMillis?.() || 0;
        return bTime - aTime;
      });
    callback(conversations);
  }, (error) => {
    console.error("Error listening to conversations:", error);
    if (onError) onError(error);
  });
};

/**
 * Deletes a conversation and all its messages
 */
export const deleteConversation = async (conversationId: string) => {
  try {
    const convRef = doc(db, "conversations", conversationId);
    const messagesRef = collection(db, "conversations", conversationId, "messages");
    
    // Delete all messages first
    const messagesSnap = await getDocs(messagesRef);
    const batch = writeBatch(db);
    
    messagesSnap.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Delete the conversation
    batch.delete(convRef);
    
    await batch.commit();
    
    // Invalidate cache
    invalidateConvCache(conversationId);
    
    return true;
  } catch (error) {
    console.error("Error deleting conversation:", error);
    throw error;
  }
};

/**
 * Marks all messages as read in a conversation for a specific user
 */
export const markAsRead = async (conversationId: string, userId: string) => {
  try {
    const convRef = doc(db, "conversations", conversationId);
    const messagesRef = collection(db, "conversations", conversationId, "messages");
    
    // Check if conversation exists before updating
    const convSnap = await getDoc(convRef);
    if (!convSnap.exists()) {
      console.warn(`Conversation ${conversationId} not found, skipping markAsRead`);
      return;
    }

    // Reset unread count for this user
    await updateDoc(convRef, {
      [`unreadCount.${userId}`]: 0
    });

    // Mark messages as read in batch
    // We only filter by isRead == false to avoid needing a composite index for != senderId
    const q = query(messagesRef, where("isRead", "==", false));
    const unreadSnap = await getDocs(q);
    
    // Filter by senderId in memory
    const messagesToUpdate = unreadSnap.docs.filter(doc => doc.data().senderId !== userId);
    
    if (messagesToUpdate.length === 0) return;

    const batch = writeBatch(db);
    messagesToUpdate.forEach(doc => {
      batch.update(doc.ref, { isRead: true, status: "read" });
    });
    
    await batch.commit();
  } catch (error) {
    console.error("Error marking messages as read:", error);
    throw error;
  }
};

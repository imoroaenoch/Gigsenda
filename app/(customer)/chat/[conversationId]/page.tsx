"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Send, 
  User as UserIcon,
  MoreVertical,
  Phone,
  MessageSquare,
  Trash2
} from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { 
  getMessages,
  fetchOlderMessages,
  sendMessage, 
  markAsRead, 
  deleteConversation,
  Message, 
  Conversation,
  MESSAGE_PAGE_SIZE,
} from "@/lib/chat";
import { getUser } from "@/lib/firestore";
import { doc, onSnapshot, QueryDocumentSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import MessageBubble from "@/components/chat/MessageBubble";
import AuthGuard from "@/components/auth/AuthGuard";
import toast from "react-hot-toast";

export default function ChatDetailPage({ params }: { params: { conversationId: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const { conversationId } = params;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [olderMessages, setOlderMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  // Oldest doc snapshot for load-more cursor
  const oldestDocRef = useRef<QueryDocumentSnapshot | null>(null);
  const isInitialLoad = useRef(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom — instant on first load, smooth on new messages
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // On new realtime messages: smooth scroll only if near bottom already
  useEffect(() => {
    if (isInitialLoad.current) {
      scrollToBottom("instant");
      isInitialLoad.current = false;
      return;
    }
    const container = scrollContainerRef.current;
    if (!container) return;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    // Only auto-scroll if within 150px of the bottom (user hasn't scrolled up)
    if (distanceFromBottom < 150) {
      scrollToBottom("smooth");
    }
  }, [messages]);

  useEffect(() => {
    if (!conversationId || !user?.uid) return;

    setLoading(true);
    isInitialLoad.current = true;

    // Listen to conversation doc
    const convRef = doc(db, "conversations", conversationId);
    const unsubConv = onSnapshot(convRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Conversation;
        setConversation(data);
        const otherId = data.participants.find(p => p !== user.uid);
        if (otherId && !otherUser) {
          getUser(otherId).then(setOtherUser);
        }
      } else {
        setConversation(null);
      }
      setLoading(false);
    }, (err) => {
      console.error("Error listening to conversation:", err);
      setLoading(false);
    });

    // Listen to latest page of messages
    const unsubMessages = getMessages(
      conversationId,
      (incoming) => {
        setMessages(incoming);
        setHasMore(incoming.length >= MESSAGE_PAGE_SIZE);
        // Mark as read whenever new messages arrive
        markAsRead(conversationId, user.uid).catch(() => {});
      },
      (error) => {
        console.error("Failed to load messages:", error);
      }
    );

    return () => {
      unsubConv();
      unsubMessages();
    };
  }, [conversationId, user?.uid]);

  const handleLoadOlder = async () => {
    if (!oldestDocRef.current && messages.length === 0) return;
    setLoadingOlder(true);
    try {
      // Build a cursor from the oldest visible message
      // We need the raw Firestore doc; re-fetch first visible message as cursor
      const container = scrollContainerRef.current;
      const prevScrollHeight = container?.scrollHeight ?? 0;

      // fetchOlderMessages needs a QueryDocumentSnapshot — we'll use the
      // oldest message doc we stored from the last load-more, or
      // we approximate by querying the first current message id
      if (!oldestDocRef.current) {
        // First time: no cursor stored yet — skip (messages listener covers latest page)
        setHasMore(false);
        return;
      }
      const { messages: older } = await fetchOlderMessages(conversationId, oldestDocRef.current);
      if (older.length < MESSAGE_PAGE_SIZE) setHasMore(false);
      setOlderMessages(prev => [...older, ...prev]);

      // Restore scroll position after prepending
      requestAnimationFrame(() => {
        if (container) {
          container.scrollTop = container.scrollHeight - prevScrollHeight;
        }
      });
    } catch (e) {
      console.error("Failed to load older messages:", e);
    } finally {
      setLoadingOlder(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user?.uid || isSending) return;

    setIsSending(true);
    try {
      await sendMessage(conversationId, user.uid, newMessage.trim());
      setNewMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AuthGuard>
      <main className="flex h-screen flex-col bg-white lg:h-screen">
        {/* Header */}
        <header className="bg-white px-6 pt-12 pb-4 shadow-sm border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => router.back()} 
                className="rounded-xl p-2 hover:bg-gray-100"
              >
                <ArrowLeft className="h-6 w-6 text-text" />
              </button>
              
              <div className="flex items-center gap-3">
                <div className="relative h-10 w-10 overflow-hidden rounded-full bg-gray-100 border border-gray-100">
                  {otherUser?.photoURL ? (
                    <Image 
                      src={otherUser.photoURL} 
                      alt={otherUser.name || "User"} 
                      fill 
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-400">
                      <UserIcon className="h-5 w-5" />
                    </div>
                  )}
                </div>
                <div>
                  <h1 className="text-sm font-medium text-text leading-none">
                    {otherUser?.name || (loading ? "Loading..." : "Unknown User")}
                  </h1>
                  <p className="mt-1 text-[10px] font-medium text-green-500 uppercase tracking-wider">
                    {loading ? "..." : (conversation ? "Online" : "Offline")}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => toast("Phone calls are not supported. Please use in-app chat.", { icon: "📵" })}
                className="rounded-xl p-2 text-text-light hover:bg-gray-100 active:scale-95 transition-all"
              >
                <Phone className="h-5 w-5" />
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowMenu(v => !v)}
                  className="rounded-xl p-2 text-text-light hover:bg-gray-100 active:scale-95 transition-all"
                >
                  <MoreVertical className="h-5 w-5" />
                </button>
                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                    <div className="absolute right-0 top-11 z-50 w-48 rounded-2xl bg-white shadow-xl border border-gray-100 overflow-hidden">
                      {conversation?.bookingId && !conversation.bookingId.startsWith("initial_") && (
                        <button
                          onClick={() => { setShowMenu(false); router.push(`/bookings`); }}
                          className="flex w-full items-center gap-3 px-4 py-3 text-[13px] font-medium text-text hover:bg-gray-50 transition-colors"
                        >
                          View Booking
                        </button>
                      )}
                      <button
                        onClick={async () => {
                          setShowMenu(false);
                          if (confirm("Delete this conversation? This will delete it for both you and the other person.")) {
                            try {
                              await deleteConversation(conversationId);
                              router.push("/chat");
                              toast.success("Conversation deleted", { icon: "�️" });
                            } catch (error) {
                              toast.error("Failed to delete conversation");
                            }
                          }
                        }}
                        className="flex w-full items-center gap-3 px-4 py-3 text-[13px] font-medium text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete Chat
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Messages Area */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
            </div>
          ) : !conversation ? (
            <div className="flex h-full flex-col items-center justify-center text-center px-6">
              <div className="rounded-full bg-gray-100 p-8 text-gray-300">
                <MessageSquare className="h-16 w-16" />
              </div>
              <h2 className="mt-6 text-xl font-medium text-text">Conversation Not Found</h2>
              <p className="mt-2 text-text-light">
                This conversation doesn't exist or you don't have access to it.
              </p>
              <button
                onClick={() => router.push("/chat")}
                className="mt-8 rounded-2xl bg-primary px-8 py-4 font-medium text-white active:scale-95 transition-all"
              >
                Back to Messages
              </button>
            </div>
          ) : (
            <>
              {/* Load older messages */}
              {hasMore && (
                <div className="flex justify-center py-2">
                  <button
                    onClick={handleLoadOlder}
                    disabled={loadingOlder}
                    className="rounded-full border border-gray-200 bg-white px-4 py-1.5 text-[11px] font-medium text-text-light shadow-sm active:scale-95 transition-all disabled:opacity-50"
                  >
                    {loadingOlder ? "Loading..." : "Load older messages"}
                  </button>
                </div>
              )}
              {/* Older messages loaded via load-more */}
              {olderMessages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isOwn={msg.senderId === user?.uid}
                />
              ))}
              {/* Latest page (real-time) */}
              {messages.map((msg) => (
                <MessageBubble 
                  key={msg.id} 
                  message={msg} 
                  isOwn={msg.senderId === user?.uid} 
                />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="bg-white p-4 pb-10 border-t border-gray-100">
          <form 
            onSubmit={handleSendMessage}
            className="flex items-center gap-3 bg-gray-50 rounded-[2rem] px-4 py-2 border border-gray-100 focus-within:border-primary/30 focus-within:ring-1 focus-within:ring-primary/10 transition-all"
          >
            <input 
              type="text" 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-transparent py-2 text-[13px] font-medium outline-none text-text"
            />
            <button 
              type="submit"
              disabled={!newMessage.trim() || isSending}
              className={`flex h-10 w-10 items-center justify-center rounded-full transition-all active:scale-95 ${
                newMessage.trim() && !isSending 
                  ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                  : 'bg-gray-200 text-gray-400'
              }`}
            >
              <Send className="h-4.5 w-4.5" />
            </button>
          </form>
        </div>
      </main>
    </AuthGuard>
  );
}

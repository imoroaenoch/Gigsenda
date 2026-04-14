"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  MessageSquare, 
  Home, 
  Briefcase, 
  Calendar, 
  User, 
  Search,
  X
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getConversations, Conversation } from "@/lib/chat";
import ConversationCard from "@/components/chat/ConversationCard";
import AuthGuard from "@/components/auth/AuthGuard";

export default function ChatListPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (user?.uid) {
      const unsubscribe = getConversations(
        user.uid, 
        (data) => {
          setConversations(data);
          setLoading(false);
        },
        (error) => {
          console.error("Failed to load conversations:", error);
          setLoading(false);
        }
      );
      return () => unsubscribe();
    }
  }, [user]);

  return (
    <AuthGuard>
      <main className="min-h-screen bg-white pb-32 lg:pb-0">
        <header className="sticky top-0 z-50 bg-white px-6 pt-5 pb-3 border-b border-gray-100 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => router.push(profile?.accountType === "provider" ? "/provider/dashboard" : "/home")} 
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100 transition-all"
              >
                <ArrowLeft className="h-6 w-6 text-text" />
              </button>
              <h1 className="text-xl font-black text-text">Messages</h1>
            </div>
            <button
              onClick={() => { setShowSearch(s => !s); setSearchQuery(""); }}
              className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center"
            >
              {showSearch ? <X className="h-5 w-5 text-gray-400" /> : <Search className="h-5 w-5 text-gray-400" />}
            </button>
          </div>
          {showSearch && (
            <div className="mt-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full rounded-xl bg-gray-50 border border-gray-100 pl-9 pr-4 py-2.5 text-sm font-bold text-text outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/10 transition-all"
              />
            </div>
          )}
        </header>

        {/* Desktop two-panel wrapper */}
        <div className="lg:flex lg:gap-0 lg:h-[calc(100vh-73px)]">
        {/* Left panel — conversation list */}
        <div className="lg:w-[350px] xl:w-[400px] lg:border-r lg:border-gray-100 lg:overflow-y-auto lg:h-full lg:flex-shrink-0">
        <div className="px-4 mt-6 lg:px-3 lg:mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
            </div>
          ) : conversations.length > 0 ? (
            <div className="space-y-4">
              {(searchQuery.trim()
                ? conversations.filter(c => {
                    const cc = c as any;
                    const q = searchQuery.toLowerCase();
                    return cc.otherUserName?.toLowerCase().includes(q) ||
                      c.lastMessage?.toLowerCase().includes(q);
                  })
                : conversations
              ).map((conv) => (
                <ConversationCard 
                  key={conv.id} 
                  conversation={conv} 
                  currentUserId={user?.uid || ""} 
                />
              ))}
              {searchQuery.trim() && conversations.filter(c => {
                const cc = c as any;
                const q = searchQuery.toLowerCase();
                return cc.otherUserName?.toLowerCase().includes(q) ||
                  c.lastMessage?.toLowerCase().includes(q);
              }).length === 0 && (
                <div className="flex flex-col items-center py-16 text-center">
                  <Search className="h-10 w-10 text-gray-200 mb-3" />
                  <p className="text-sm font-black text-text">No results for &ldquo;{searchQuery}&rdquo;</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center pt-20 px-10 text-center">
              <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-6 shadow-xl shadow-primary/10">
                <MessageSquare className="h-10 w-10" />
              </div>
              <h2 className="text-xl font-black text-text">No conversations yet</h2>
              {profile?.accountType === "provider" ? (
                <>
                  <p className="mt-2 text-[13px] font-bold text-text-light max-w-[220px] leading-relaxed">
                    Conversations will appear here once customers book and message you.
                  </p>
                  <button
                    onClick={() => router.push("/provider/bookings")}
                    className="mt-8 rounded-2xl bg-primary px-10 py-4 font-black text-white shadow-lg shadow-primary/20 active:scale-95 transition-all"
                  >
                    View My Bookings
                  </button>
                </>
              ) : (
                <>
                  <p className="mt-2 text-[13px] font-bold text-text-light max-w-[200px] leading-relaxed">
                    Book a service to start chatting with service providers.
                  </p>
                  <button
                    onClick={() => router.push("/search")}
                    className="mt-8 rounded-2xl bg-primary px-10 py-4 font-black text-white shadow-lg shadow-primary/20 active:scale-95 transition-all"
                  >
                    Find a Service
                  </button>
                </>
              )}
            </div>
          )}
        </div>
        </div>{/* end left panel */}

        {/* Right panel — desktop only: empty state until a convo is selected */}
        <div className="hidden lg:flex flex-1 items-center justify-center bg-gray-50 border-l border-gray-100">
          <div className="flex flex-col items-center text-center px-8">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
              <MessageSquare className="h-10 w-10" />
            </div>
            <h3 className="text-base font-black text-text">Select a conversation</h3>
            <p className="mt-2 text-[12px] font-bold text-text-light max-w-[200px] leading-relaxed">
              Choose a conversation from the list to start chatting.
            </p>
          </div>
        </div>
        </div>{/* end desktop two-panel */}

        {/* Premium Floating Bottom Navigation - Compact */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 flex items-center justify-around bg-white px-4 py-3.5 border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] z-50">
          <button className="flex flex-col items-center gap-1 text-text-light" onClick={() => router.push("/bookings")}>
            <div className="p-1"><Calendar className="h-5 w-5" /></div>
            <span className="text-[9px] font-bold uppercase tracking-tight">Booking</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-primary">
            <div className="p-1 rounded-lg bg-primary/10"><MessageSquare className="h-5 w-5 fill-primary" /></div>
            <span className="text-[9px] font-black uppercase tracking-tight">Chat</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-text-light" onClick={() => router.push(profile?.accountType === "provider" ? "/provider/dashboard" : "/home")}>
            <div className="p-1"><Home className="h-5 w-5" /></div>
            <span className="text-[9px] font-bold uppercase tracking-tight">Home</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-text-light" onClick={() => router.push("/search")}>
            <div className="p-1"><Briefcase className="h-5 w-5" /></div>
            <span className="text-[9px] font-bold uppercase tracking-tight">Services</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-text-light" onClick={() => router.push("/profile")}>
            <div className="p-1"><User className="h-5 w-5" /></div>
            <span className="text-[9px] font-bold uppercase tracking-tight">Profile</span>
          </button>
        </nav>
      </main>
    </AuthGuard>
  );
}

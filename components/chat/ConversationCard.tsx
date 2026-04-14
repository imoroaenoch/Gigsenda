"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { format, isToday, isThisWeek } from "date-fns";
import { User } from "lucide-react";
import { Conversation } from "@/lib/chat";
import { getUser } from "@/lib/firestore";

interface ConversationCardProps {
  conversation: Conversation;
  currentUserId: string;
}

export default function ConversationCard({ conversation, currentUserId }: ConversationCardProps) {
  const router = useRouter();
  const [otherUser, setOtherUser] = useState<any>(null);
  
  const otherUserId = conversation.participants.find(p => p !== currentUserId);
  const unreadCount = conversation.unreadCount?.[currentUserId] || 0;

  useEffect(() => {
    if (otherUserId) {
      getUser(otherUserId).then(setOtherUser);
    }
  }, [otherUserId]);

  const lastTs = (conversation.lastMessageAt ?? conversation.lastMessageTime);
  const timeStr = (() => {
    if (!lastTs) return "";
    const d = lastTs.toDate();
    if (isToday(d)) return format(d, "hh:mm a");
    if (isThisWeek(d)) return format(d, "EEE");
    return format(d, "MMM d");
  })();

  return (
    <button
      onClick={() => router.push(`/chat/${conversation.id}`)}
      className="flex w-full items-center gap-4 rounded-[2rem] bg-white p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all active:scale-[0.98]"
    >
        <div className="relative h-14 w-14 flex-shrink-0">
          <div className="h-full w-full overflow-hidden rounded-[1.25rem] bg-gray-50 border border-gray-100">
            {otherUser?.photoURL ? (
              <Image
                src={otherUser.photoURL}
                alt={otherUser.name || "User"}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-gray-400">
                <User className="h-6 w-6" />
              </div>
            )}
          </div>
          {unreadCount > 0 && (
            <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-black text-white border-2 border-white shadow-md">
              {unreadCount}
            </div>
          )}
        </div>

        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-black text-text truncate">
              {otherUser?.name || "Loading..."}
            </h3>
            <span className="text-[9px] font-bold text-text-light whitespace-nowrap">
              {timeStr}
            </span>
          </div>
          <p className={`mt-1 text-[11px] truncate ${unreadCount > 0 ? 'font-black text-text' : 'font-medium text-text-light'}`}>
            {conversation.lastMessage || "Start a conversation"}
          </p>
        </div>
    </button>
  );
}

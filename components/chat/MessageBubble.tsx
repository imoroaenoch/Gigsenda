"use client";

import { format } from "date-fns";
import { Check, CheckCheck } from "lucide-react";
import { Message } from "@/lib/chat";

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
}

function ReadReceipt({ status }: { status?: string }) {
  if (status === "read") {
    return <CheckCheck className="h-3 w-3 text-blue-300" />;
  }
  if (status === "delivered") {
    return <CheckCheck className="h-3 w-3 text-white/60" />;
  }
  // sent or undefined
  return <Check className="h-3 w-3 text-white/60" />;
}

export default function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const timeStr = message.createdAt
    ? format(message.createdAt.toDate(), "hh:mm a")
    : "";

  return (
    <div className={`flex w-full mb-2 ${isOwn ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[75%] rounded-[1.5rem] px-4 py-3 shadow-sm ${
        isOwn
          ? "bg-primary text-white rounded-br-sm"
          : "bg-white text-text rounded-bl-sm border border-gray-100"
      }`}>
        <p className="text-[13px] font-medium leading-relaxed break-words">
          {message.message}
        </p>
        <div className={`mt-1 flex items-center gap-1 text-[9px] font-bold ${
          isOwn ? "text-white/70 justify-end" : "text-text-light justify-start"
        }`}>
          <span>{timeStr}</span>
          {isOwn && <ReadReceipt status={message.status} />}
        </div>
      </div>
    </div>
  );
}

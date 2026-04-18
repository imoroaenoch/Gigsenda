"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Bell, BookOpen, MessageSquare, Zap, X, CheckCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  subscribeNotifications,
  subscribeUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  AppNotification,
} from "@/lib/notifications";
import { formatDistanceToNow } from "date-fns";

const TYPE_META: Record<string, { icon: any; bg: string; color: string }> = {
  booking: { icon: BookOpen,      bg: "bg-blue-50",   color: "text-blue-500"   },
  message: { icon: MessageSquare, bg: "bg-primary/10", color: "text-primary"   },
  system:  { icon: Zap,           bg: "bg-yellow-50", color: "text-yellow-500" },
};

interface NotificationBellProps {
  dropdownSide?: "left" | "right";
}

export default function NotificationBell({ dropdownSide = "left" }: NotificationBellProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notifs, setNotifs] = useState<AppNotification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user?.uid) return;
    const unsubCount = subscribeUnreadCount(user.uid, setUnread);
    const unsubNotifs = subscribeNotifications(user.uid, setNotifs, 20);
    return () => { unsubCount(); unsubNotifs(); };
  }, [user?.uid]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleNotifClick = async (n: AppNotification) => {
    if (!n.read) await markNotificationRead(n.id);
    setOpen(false);
    if (n.link) {
      router.push(n.link);
    }
  };

  const handleMarkAll = async () => {
    if (!user?.uid) return;
    await markAllNotificationsRead(user.uid);
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm border border-gray-100 active:scale-95 transition-all"
      >
        <Bell className="h-5 w-5 text-text" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[9px] font-black text-white border-2 border-white shadow">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className={`fixed inset-x-3 top-20 z-[9999] rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden sm:absolute sm:inset-x-auto sm:top-12 sm:w-[340px] ${
          dropdownSide === "right" ? "sm:left-0" : "sm:right-0"
        }`}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <h3 className="text-[13px] font-black text-text">Notifications</h3>
              {unread > 0 && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black text-primary">
                  {unread} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  onClick={handleMarkAll}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-black text-primary hover:bg-primary/5 transition-colors"
                >
                  <CheckCheck className="h-3 w-3" /> Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 hover:bg-gray-100 transition-colors"
              >
                <X className="h-3.5 w-3.5 text-text-light" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[360px] overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center px-6">
                <div className="h-12 w-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 mb-3">
                  <Bell className="h-6 w-6" />
                </div>
                <p className="text-[12px] font-black text-text-light">No notifications yet</p>
              </div>
            ) : (
              notifs.slice(0, 10).map(n => {
                const meta = TYPE_META[n.type] || TYPE_META.system;
                const IconComp = meta.icon;
                return (
                  <button
                    key={n.id}
                    onClick={() => handleNotifClick(n)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${!n.read ? "bg-primary/[0.03]" : ""}`}
                  >
                    <div className={`flex-shrink-0 h-9 w-9 rounded-xl ${meta.bg} flex items-center justify-center`}>
                      <IconComp className={`h-4 w-4 ${meta.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-[12px] leading-snug ${n.read ? "font-bold text-text-light" : "font-black text-text"}`}>
                          {n.title}
                        </p>
                        {!n.read && (
                          <span className="flex-shrink-0 h-2 w-2 rounded-full bg-primary mt-1" />
                        )}
                      </div>
                      <p className="text-[11px] font-medium text-text-light mt-0.5 leading-snug line-clamp-2">
                        {n.message}
                      </p>
                      <p className="text-[10px] font-bold text-text-light/70 mt-1">
                        {n.createdAt ? formatDistanceToNow(n.createdAt.toDate(), { addSuffix: true }) : ""}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifs.length > 0 && (
            <div className="border-t border-gray-100 px-4 py-2.5">
              <button
                onClick={() => { setOpen(false); router.push("/notifications"); }}
                className="w-full text-center text-[12px] font-black text-primary hover:underline"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

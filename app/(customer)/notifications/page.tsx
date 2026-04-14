"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bell, BookOpen, MessageSquare, Zap, CheckCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  subscribeNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  AppNotification,
} from "@/lib/notifications";
import { formatDistanceToNow } from "date-fns";
import BottomNav from "@/components/common/BottomNav";

const TYPE_META: Record<string, { icon: any; bg: string; color: string }> = {
  booking: { icon: BookOpen,      bg: "bg-blue-50",    color: "text-blue-500"   },
  message: { icon: MessageSquare, bg: "bg-primary/10",  color: "text-primary"   },
  system:  { icon: Zap,           bg: "bg-yellow-50",  color: "text-yellow-500" },
};

export default function NotificationsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeNotifications(user.uid, (data) => {
      setNotifications(data);
      setLoading(false);
    });
    return () => unsub();
  }, [user?.uid]);

  const handleClick = async (n: AppNotification) => {
    if (!n.read) await markNotificationRead(n.id);
    router.push(n.link);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <main className="min-h-screen bg-white pb-28 lg:pb-8">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white px-5 pt-5 pb-5 border-b border-gray-100 lg:pt-6 lg:max-w-full lg:px-8">
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm border border-gray-100 active:scale-95 transition-all">
            <ArrowLeft className="h-5 w-5 text-text" />
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-[17px] font-medium text-text">Notifications</h1>
            {unreadCount > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                {unreadCount} new
              </span>
            )}
          </div>
          {unreadCount > 0 ? (
            <button
              onClick={() => user?.uid && markAllNotificationsRead(user.uid)}
              className="flex items-center gap-1 rounded-xl bg-white border border-gray-100 px-3 py-2 text-[11px] font-medium text-primary shadow-sm active:scale-95 transition-all"
            >
              <CheckCheck className="h-3.5 w-3.5" /> All read
            </button>
          ) : (
            <div className="w-10" />
          )}
        </div>
      </header>

      {/* Content */}
      <div className="px-5 lg:max-w-3xl lg:mx-auto">
        {loading ? (
          <div className="space-y-3 mt-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 rounded-2xl bg-white border border-gray-100 animate-pulse" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-24 text-center px-6">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-5">
              <Bell className="h-10 w-10" />
            </div>
            <h2 className="text-lg font-medium text-text">All caught up!</h2>
            <p className="mt-2 text-sm font-medium text-text-light max-w-xs leading-relaxed">
              You have no notifications yet.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            <p className="text-[11px] font-medium text-text-light uppercase tracking-widest mb-3">
              {notifications.length} notification{notifications.length !== 1 ? "s" : ""}
            </p>
            {notifications.map(n => {
              const meta = TYPE_META[n.type] || TYPE_META.system;
              const IconComp = meta.icon;
              const time = n.createdAt?.toDate ? n.createdAt.toDate() : new Date();
              return (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full flex items-start gap-4 rounded-2xl p-4 border shadow-sm active:scale-[0.98] transition-all text-left ${
                    n.read ? "bg-white border-gray-100" : "bg-primary/[0.03] border-primary/10"
                  }`}
                >
                  <div className={`flex-shrink-0 h-11 w-11 rounded-xl ${meta.bg} flex items-center justify-center`}>
                    <IconComp className={`h-5 w-5 ${meta.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-[13px] leading-snug ${n.read ? "font-medium text-text-light" : "font-medium text-text"}`}>
                        {n.title}
                      </p>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-[10px] font-medium text-text-light whitespace-nowrap">
                          {formatDistanceToNow(time, { addSuffix: true })}
                        </span>
                        {!n.read && <span className="h-2 w-2 rounded-full bg-primary" />}
                      </div>
                    </div>
                    <p className="mt-0.5 text-[12px] font-medium text-text-light leading-snug">{n.message}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  );
}

"use client";

import { useRouter, usePathname } from "next/navigation";
import { 
  Home as HomeIcon, 
  Briefcase, 
  Calendar, 
  MessageSquare, 
  User as UserIcon 
} from "lucide-react";
import { useEffect, useState, useMemo, useCallback } from "react";
import { getConversations } from "@/lib/chat";
import { useAuth } from "@/hooks/useAuth";

const NAV_ITEMS = [
  { id: "services", label: "Services", icon: Briefcase, path: "/search" },
  { id: "chat", label: "Chat", icon: MessageSquare, path: "/chat", hasBadge: true },
  { id: "home", label: "Home", icon: HomeIcon, path: "/home" },
  { id: "booking", label: "Booking", icon: Calendar, path: "/bookings" },
  { id: "profile", label: "Profile", icon: UserIcon, path: "/profile" },
];

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user?.uid) {
      const unsubscribe = getConversations(user.uid, (conversations) => {
        const totalUnread = conversations.reduce((acc, conv) => {
          return acc + (conv.unreadCount?.[user.uid] || 0);
        }, 0);
        setUnreadCount(totalUnread);
      });
      return () => unsubscribe();
    }
  }, [user?.uid]);

  // Memoize navigation items to prevent re-renders
  const navItemsWithStatus = useMemo(() => {
    return NAV_ITEMS.map((item) => ({
      ...item,
      isActive: pathname === item.path,
    }));
  }, [pathname]);

  // Optimized click handler with touch feedback
  const handleNavClick = useCallback((path: string) => {
    // Add immediate visual feedback
    const button = document.querySelector(`[data-path="${path}"]`) as HTMLElement;
    if (button) {
      button.style.transform = 'scale(0.95)';
      setTimeout(() => {
        button.style.transform = '';
      }, 100);
    }
    
    // Navigate immediately
    router.push(path);
  }, [router]);

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 flex items-center justify-around bg-white px-4 py-3.5 border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] z-50">
      {navItemsWithStatus.map((item) => (
        <button 
          key={item.id}
          data-path={item.path}
          onClick={() => handleNavClick(item.path)}
          className={`flex flex-col items-center gap-1 touch-manipulation transition-colors duration-150 ${
            item.isActive 
              ? "text-primary scale-110" 
              : "text-text-light hover:text-text"
          }`}
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <div className={`p-1 rounded-lg ${item.isActive ? "bg-primary/10" : ""} relative`}>
            <item.icon className={`h-5 w-5 ${item.isActive ? "fill-primary" : ""}`} />
            {item.hasBadge && unreadCount > 0 && (
              <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[8px] font-black text-white border border-white">
                {unreadCount}
              </div>
            )}
          </div>
          <span className={`text-[9px] uppercase tracking-tight ${item.isActive ? "font-black" : "font-bold"}`}>
            {item.label}
          </span>
        </button>
      ))}
    </nav>
  );
}

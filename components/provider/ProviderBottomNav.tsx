"use client";

import { useRouter, usePathname } from "next/navigation";
import { Home, ClipboardList, MessageSquare, User } from "lucide-react";
import { useMemo, useCallback } from "react";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: Home,          path: "/provider/dashboard" },
  { id: "bookings",  label: "Bookings",  icon: ClipboardList, path: "/provider/bookings" },
  { id: "messages",  label: "Messages",  icon: MessageSquare, path: "/chat" },
  { id: "profile",   label: "Profile",   icon: User,          path: "/provider/profile" },
];

export default function ProviderBottomNav() {
  const router   = useRouter();
  const pathname = usePathname();

  // Memoize navigation items to prevent re-renders
  const navItemsWithStatus = useMemo(() => {
    return NAV_ITEMS.map((item) => ({
      ...item,
      isActive: pathname === item.path || pathname.startsWith(item.path + "/"),
    }));
  }, [pathname]);

  // Optimized click handler with touch feedback
  const handleNavClick = useCallback((path: string) => {
    // Add immediate visual feedback
    const button = document.querySelector(`[data-provider-path="${path}"]`) as HTMLElement;
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
          data-provider-path={item.path}
          onClick={() => handleNavClick(item.path)}
          className={`flex flex-col items-center gap-1 touch-manipulation transition-colors duration-150 ${
            item.isActive 
              ? "text-primary scale-110" 
              : "text-text-light hover:text-text"
          }`}
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <div className={`p-1 rounded-lg ${item.isActive ? "bg-primary/10" : ""}`}>
            <item.icon className={`h-5 w-5 ${item.isActive ? "fill-primary" : ""}`} />
          </div>
          <span className={`text-[9px] uppercase tracking-tight ${item.isActive ? "font-black" : "font-bold"}`}>
            {item.label}
          </span>
        </button>
      ))}
    </nav>
  );
}

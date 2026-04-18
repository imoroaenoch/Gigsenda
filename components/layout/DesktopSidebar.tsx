"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  Home, Search, Calendar, MessageSquare, User as UserIcon,
  Zap, LogOut, Bell, Settings,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { auth } from "@/lib/firebase";
import { getConversations } from "@/lib/chat";
import { useEffect, useState } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import NotificationBell from "@/components/common/NotificationBell";

const NAV_ITEMS = [
  { id: "home",     label: "Home",     icon: Home,          path: "/home" },
  { id: "services", label: "Services", icon: Search,        path: "/search" },
  { id: "bookings", label: "Bookings", icon: Calendar,      path: "/bookings" },
  { id: "messages", label: "Messages", icon: MessageSquare, path: "/chat", hasBadge: true },
  { id: "profile",  label: "Profile",  icon: UserIcon,      path: "/profile" },
];

export default function DesktopSidebar() {
  const router   = useRouter();
  const pathname = usePathname();
  const { user, profile } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = getConversations(user.uid, (convs) => {
      setUnreadCount(convs.reduce((acc, c) => acc + (c.unreadCount?.[user.uid] || 0), 0));
    });
    return () => unsub();
  }, [user?.uid]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.replace("/login");
    } catch {
      toast.error("Failed to sign out");
    }
  };

  const firstName = profile?.name?.split(" ")[0] || "User";
  const photoURL  = profile?.photoURL || null;

  return (
    <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-screen w-[260px] bg-white border-r border-gray-100 shadow-sm z-40">
      {/* Logo + Bell */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-[#FF8C00] flex items-center justify-center shadow-md shadow-orange-200">
            <Zap className="h-5 w-5 fill-white text-white" />
          </div>
          <span className="text-[20px] font-black tracking-tight text-gray-900">Gigsenda</span>
        </div>
        <NotificationBell dropdownSide="right" />
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.path || pathname.startsWith(item.path + "/");
          return (
            <button
              key={item.id}
              onClick={() => router.push(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[14px] font-semibold transition-all hover:bg-orange-50 group ${
                isActive
                  ? "bg-[#FF8C00] text-white shadow-md shadow-orange-200"
                  : "text-gray-600 hover:text-[#FF8C00]"
              }`}
            >
              <div className="relative">
                <item.icon className={`h-5 w-5 ${isActive ? "text-white" : "text-gray-400 group-hover:text-[#FF8C00]"}`} />
                {item.hasBadge && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-4 w-4 flex items-center justify-center rounded-full bg-red-500 text-[8px] font-black text-white border-2 border-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              <span>{item.label}</span>
              {item.hasBadge && unreadCount > 0 && (
                <span className="ml-auto text-[10px] font-black bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom: User + Logout */}
      <div className="px-3 py-4 border-t border-gray-50 space-y-1">
        {/* Profile */}
        <button
          onClick={() => router.push("/profile")}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-gray-50 transition-all group"
        >
          <div className="relative h-9 w-9 rounded-full overflow-hidden bg-orange-100 flex-shrink-0 border-2 border-orange-200">
            {photoURL ? (
              <Image src={photoURL} alt={firstName} fill className="object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <UserIcon className="h-4 w-4 text-orange-500" />
              </div>
            )}
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-[13px] font-bold text-gray-900 truncate">{profile?.name || "User"}</p>
            <p className="text-[11px] text-gray-400 truncate">{user?.email}</p>
          </div>
        </button>

        {/* Sign out */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-[13px] font-semibold text-red-500 hover:bg-red-50 transition-all"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}

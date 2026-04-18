"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  Home,
  Briefcase,
  Calendar,
  MessageSquare,
  User,
  Zap,
  LogOut,
  Bell,
} from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { logout } from "@/lib/auth";
import { getConversations } from "@/lib/chat";
import { useEffect, useState } from "react";
import NotificationBell from "./NotificationBell";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

const customerNav = [
  { label: "Home",     icon: Home,         path: "/home" },
  { label: "Services", icon: Briefcase,     path: "/search" },
  { label: "Bookings", icon: Calendar,      path: "/bookings" },
  { label: "Messages", icon: MessageSquare, path: "/chat" },
  { label: "Profile",  icon: User,          path: "/profile" },
];

const providerNav = [
  { label: "Dashboard", icon: Home,         path: "/provider/dashboard" },
  { label: "Bookings",  icon: Calendar,     path: "/provider/bookings" },
  { label: "Messages",  icon: MessageSquare, path: "/chat" },
  { label: "Profile",   icon: User,         path: "/provider/profile" },
];

export default function DesktopSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile } = useAuth();
  const [unread, setUnread] = useState(0);
  const [providerPhoto, setProviderPhoto] = useState<string | null>(null);

  const isProvider = profile?.accountType === "provider" || profile?.role === "provider";
  const navItems = isProvider ? providerNav : customerNav;

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = getConversations(user.uid, (convs) => {
      setUnread(convs.reduce((acc, c) => acc + (c.unreadCount?.[user.uid] || 0), 0));
    });
    return () => unsub();
  }, [user?.uid]);

  // Fetch photo from providers collection as fallback
  useEffect(() => {
    if (!user?.uid || !isProvider) return;
    getDoc(doc(db, "providers", user.uid)).then(snap => {
      if (snap.exists()) {
        const p = snap.data().photoURL;
        if (p) setProviderPhoto(p);
      }
    }).catch(() => {});
  }, [user?.uid, isProvider]);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 h-screen sticky top-0 bg-white border-r border-gray-100 shadow-sm px-4 py-6 z-40">
      {/* Logo */}
      <div className="flex items-center gap-2 px-2 mb-8">
        <Zap className="h-5 w-5 fill-primary text-primary" />
        <span className="text-lg font-black text-text tracking-tight">Gigsenda</span>
      </div>

      {/* User card */}
      {profile && (
        <div className="rounded-2xl bg-primary/5 p-3 mb-3 border border-primary/10">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 shrink-0 rounded-xl overflow-hidden bg-gray-100">
              {(profile.photoURL || providerPhoto) ? (
                <Image src={profile.photoURL || providerPhoto!} alt={profile.name || ""} fill className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-gray-400">
                  <User className="h-5 w-5" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-black text-text truncate">{profile.name || "User"}</p>
              <p className="text-[10px] font-bold text-text-light capitalize">{profile.accountType || "customer"}</p>
            </div>
          </div>

          {/* Notifications row — full width, clearly visible */}
          <button
            onClick={() => {
              const bell = document.querySelector<HTMLButtonElement>("[data-notif-trigger]");
              bell?.click();
            }}
            className="sr-only"
          />
          <div className="mt-3 pt-3 border-t border-primary/10 flex items-center justify-between">
            <span className="text-[10px] font-bold text-text-light uppercase tracking-widest">Notifications</span>
            <NotificationBell />
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.path || pathname.startsWith(item.path + "/");
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-black transition-all relative ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-text-light hover:bg-gray-50 hover:text-text"
              }`}
            >
              <item.icon className={`h-4.5 w-4.5 ${isActive ? "fill-primary/20" : ""}`} />
              {item.label}
              {item.label === "Messages" && unread > 0 && (
                <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[9px] font-black text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-black text-red-400 hover:bg-red-50 transition-all mt-4"
      >
        <LogOut className="h-4 w-4" />
        Log out
      </button>
    </aside>
  );
}

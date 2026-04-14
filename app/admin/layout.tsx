"use client";

import AdminGuard from "@/components/admin/AdminGuard";
import { useAuth } from "@/hooks/useAuth";
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  CalendarCheck, 
  CreditCard, 
  Settings, 
  LogOut,
  Bell,
  Search,
  Menu,
  X,
  Layers,
  Star
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import toast from "react-hot-toast";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/admin" },
  { label: "Providers", icon: Briefcase, href: "/admin/providers" },
  { label: "Customers", icon: Users, href: "/admin/customers" },
  { label: "Bookings", icon: CalendarCheck, href: "/admin/bookings" },
  { label: "Payments", icon: CreditCard, href: "/admin/payments" },
  { label: "Reviews", icon: Star, href: "/admin/reviews" },
  { label: "Categories", icon: Layers, href: "/admin/categories" },
  { label: "Settings", icon: Settings, href: "/admin/settings" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  const notificationRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Logged out successfully");
      router.push("/login");
    } catch (error) {
      toast.error("Failed to log out");
    }
  };

  return (
    <AdminGuard>
      <div className="flex min-h-screen bg-gray-50 text-text">
        {/* Sidebar */}
        <aside 
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transition-transform duration-300 lg:static lg:translate-x-0 ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="flex items-center justify-between px-6 py-8 border-b border-gray-50">
              <Link href="/admin" className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                  <span className="text-white font-black text-xl">G</span>
                </div>
                <span className="text-xl font-black tracking-tight text-text">Gigsenda<span className="text-primary font-black ml-1 text-xs uppercase">Admin</span></span>
              </Link>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="lg:hidden text-text-light hover:text-text"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                      isActive 
                        ? "bg-primary text-white shadow-lg shadow-primary/20" 
                        : "text-text-light hover:bg-gray-50 hover:text-text"
                    }`}
                  >
                    <item.icon className={`h-5 w-5 ${isActive ? "text-white" : "text-gray-400"}`} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100">
              <button 
                onClick={handleLogout}
                className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 transition-all"
              >
                <LogOut className="h-5 w-5" />
                Sign Out
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header */}
          <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-40">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden text-text-light hover:text-text"
              >
                <Menu className="h-6 w-6" />
              </button>
              
              <div className="hidden md:flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100 min-w-[300px]">
                <Search className="h-4 w-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search providers, bookings..."
                  className="bg-transparent border-none outline-none text-sm font-medium w-full placeholder:text-gray-400"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative" ref={notificationRef}>
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`relative p-2 rounded-xl transition-all ${
                    showNotifications ? "bg-primary/10 text-primary" : "text-text-light hover:text-text hover:bg-gray-50"
                  }`}
                >
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-2 right-2 h-2 w-2 bg-primary rounded-full border-2 border-white"></span>
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-3 w-80 bg-white rounded-3xl shadow-2xl border border-gray-100 py-6 px-6 animate-in fade-in zoom-in duration-200">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-sm font-black text-text uppercase tracking-widest">Notifications</h3>
                      <span className="text-[10px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded-full">New</span>
                    </div>
                    <div className="space-y-4">
                      {/* Empty State for now */}
                      <div className="py-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                        <Bell className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                        <p className="text-xs font-bold text-text-light">No new notifications</p>
                      </div>
                    </div>
                    <button className="w-full mt-6 py-3 text-[10px] font-black text-primary hover:bg-primary/5 rounded-xl transition-all uppercase tracking-widest border border-primary/10">
                      View All Activity
                    </button>
                  </div>
                )}
              </div>
              
              <div className="h-8 w-px bg-gray-200 mx-2"></div>
              
              <div className="relative" ref={profileRef}>
                <button 
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className={`flex items-center gap-3 pl-2 transition-all p-1.5 rounded-2xl ${
                    showProfileMenu ? "bg-gray-50 ring-1 ring-gray-100" : "hover:bg-gray-50"
                  }`}
                >
                  <div className="text-right hidden sm:block px-1">
                    <p className="text-sm font-black text-text leading-tight">{profile?.name || "Admin"}</p>
                    <p className="text-[10px] font-bold text-text-light uppercase tracking-wider">System Admin</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-gray-100 overflow-hidden border border-gray-200 shadow-sm">
                    {profile?.photoURL ? (
                      <Image src={profile.photoURL} alt="Admin" width={40} height={40} className="object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-gray-400 bg-white">
                        <Users className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                </button>

                {showProfileMenu && (
                  <div className="absolute right-0 mt-3 w-56 bg-white rounded-[2rem] shadow-2xl border border-gray-100 p-2 animate-in fade-in zoom-in duration-200">
                    <div className="p-4 border-b border-gray-50 mb-1">
                      <p className="text-xs font-black text-text uppercase tracking-widest">{profile?.name || "Admin User"}</p>
                      <p className="text-[10px] font-bold text-text-light mt-0.5 truncate">{profile?.email || "admin@gigsenda.com"}</p>
                    </div>
                    <div className="space-y-0.5">
                      <Link 
                        href="/admin/settings"
                        onClick={() => setShowProfileMenu(false)}
                        className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-text-light hover:bg-gray-50 hover:text-text transition-all"
                      >
                        <Settings className="h-4 w-4" />
                        Admin Settings
                      </Link>
                      <button 
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 transition-all"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </AdminGuard>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Bell, 
  HelpCircle, 
  LogOut, 
  Camera,
  ChevronRight,
  ChevronDown,
  Settings,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  Home,
  Briefcase,
  MessageSquare
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { logout } from "@/lib/auth";
import { updateUser, uploadProfilePhoto, getBookings } from "@/lib/firestore";
import AuthGuard from "@/components/auth/AuthGuard";
import Image from "next/image";
import toast from "react-hot-toast";
import { auth } from "@/lib/firebase";
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";

export default function CustomerProfilePage() {
  const router = useRouter();
  const { profile, user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  
  const [notifications, setNotifications] = useState({
    reminders: true,
    messages: true,
    promotions: true,
  });

  const [collapsedSections, setCollapsedSections] = useState({
    personalInfo: true,
    changePassword: true,
  });

  const toggleSection = (section: 'personalInfo' | 'changePassword') => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  const [bookingCount, setBookingCount] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [uploadedPhotoURL, setUploadedPhotoURL] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || "",
        phone: profile.phone || "",
      });
      if (profile.notifications) {
        setNotifications(prev => ({ ...prev, ...profile.notifications }));
      }
      
      // Fetch bookings count
      if (user?.uid) {
        getBookings(user.uid, 'customer').then(bookings => {
          setBookingCount(bookings.length);
        });
      }
    }
  }, [profile, user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;
    
    setIsUpdating(true);
    try {
      await updateUser(user.uid, formData);
      toast.success("Profile updated successfully!");
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.uid) return;

    // Instant local preview
    setLocalPreview(URL.createObjectURL(file));
    setIsUploading(true);
    setUploadProgress(0);
    try {
      // uploadProfilePhoto now writes photoURL to users/{uid} automatically
      const newPhotoURL = await uploadProfilePhoto(user.uid, file, "users", (pct) => setUploadProgress(pct));
      setLocalPreview(null);
      setUploadedPhotoURL(newPhotoURL);
      toast.success("Profile photo updated!");
    } catch (error: any) {
      setLocalPreview(null);
      toast.error(error.message || "Failed to upload photo");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email) return;
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setIsChangingPassword(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, passwordData.currentPassword);
      await reauthenticateWithCredential(auth.currentUser!, credential);
      await updatePassword(auth.currentUser!, passwordData.newPassword);
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast.success("Password updated successfully!");
    } catch (error: any) {
      const code = error?.code || "";
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        toast.error("Current password is incorrect");
      } else if (code === "auth/requires-recent-login") {
        toast.error("Please log out and log back in, then try again");
      } else {
        toast.error("Failed to update password");
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleNotificationToggle = async (key: keyof typeof notifications) => {
    if (!user?.uid) return;
    const updated = { ...notifications, [key]: !notifications[key] };
    setNotifications(updated);
    try {
      await updateDoc(doc(db, "users", user.uid), { notifications: updated });
    } catch {
      toast.error("Failed to save notification preference");
      setNotifications(notifications);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (error) {
      toast.error("Failed to logout");
    }
  };

  return (
    <AuthGuard>
      <main className="min-h-screen bg-white pb-24 lg:pb-8">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-white px-6 pt-5 pb-3 border-b border-gray-100 lg:pt-6 lg:px-8">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="rounded-full p-2 text-gray-500 hover:bg-gray-100 transition-all">
              <ArrowLeft className="h-6 w-6 text-text" />
            </button>
            <h1 className="text-[20px] font-black text-gray-900">Profile</h1>
          </div>
        </header>

        {/* Desktop two-column */}
        <div className="lg:flex lg:gap-0">
          {/* Left col: photo + stats */}
          <div className="lg:w-[300px] lg:flex-shrink-0 lg:border-r lg:border-gray-100 lg:bg-white">
            <div className="flex flex-col items-center pt-10 pb-8 px-6">
              <div className="relative h-28 w-28">
                <div className="relative h-full w-full overflow-hidden rounded-full border-4 border-primary/10 bg-gray-100">
                  {(localPreview || uploadedPhotoURL || profile?.photoURL) ? (
                    <Image
                      src={localPreview || uploadedPhotoURL || profile!.photoURL!}
                      alt="Profile"
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-400">
                      <User className="h-14 w-14" />
                    </div>
                  )}
                  {isUploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                      <span className="text-white text-[10px] font-medium">{uploadProgress}%</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white shadow-lg active:scale-90 transition-all disabled:opacity-70"
                >
                  {isUploading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp,image/heic"
                  onChange={handlePhotoUpload}
                />
              </div>
              <h2 className="mt-5 text-xl font-bold text-text text-center">{profile?.name}</h2>
              <p className="text-sm font-medium text-text-light text-center">{user?.email}</p>
              {profile?.createdAt && (
                <p className="mt-1 text-[10px] font-medium text-gray-400 uppercase tracking-wider text-center">
                  Member since {new Date(profile.createdAt.seconds * 1000).toLocaleDateString()}
                </p>
              )}
              {/* Stats */}
              <div className="mt-6 w-full bg-orange-50 rounded-2xl p-4 flex justify-around">
                <div className="text-center">
                  <p className="text-xl font-black text-primary">{bookingCount}</p>
                  <p className="text-[10px] font-semibold text-gray-500">Bookings</p>
                </div>
                <div className="w-px bg-orange-200" />
                <div className="text-center">
                  <p className="text-xl font-black text-primary">5.0</p>
                  <p className="text-[10px] font-semibold text-gray-500">Rating</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right col: settings sections */}
          <div className="flex-1 px-6 py-6 space-y-6 lg:px-8 lg:py-8">
          {/* My Bookings Shortcut */}
          <button 
            onClick={() => router.push("/bookings")}
            className="flex w-full items-center justify-between rounded-2xl bg-white p-5 shadow-sm border border-gray-100 active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Calendar className="h-6 w-6" />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-text">My Bookings</h3>
                <p className="text-xs font-medium text-text-light">{bookingCount} total bookings</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-300" />
          </button>

          {/* Personal Information */}
          <div className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
            <button 
              onClick={() => toggleSection('personalInfo')}
              className="flex w-full items-center justify-between p-5 active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <User className="h-6 w-6" />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-text">Personal Information</h3>
                  <p className="text-xs font-medium text-text-light">Update your personal details</p>
                </div>
              </div>
              <ChevronDown className={`h-5 w-5 text-gray-300 transition-transform ${collapsedSections.personalInfo ? 'rotate-180' : ''}`} />
            </button>

            {!collapsedSections.personalInfo && (
              <div className="px-5 pb-5 border-t border-gray-100">
                <form onSubmit={handleUpdateProfile} className="space-y-4 pt-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-medium uppercase tracking-wider text-text-light">Full Name</label>
                    <div className="flex items-center rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                      <User className="h-4 w-4 text-gray-400" />
                      <input 
                        type="text" 
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="ml-3 w-full bg-transparent text-sm font-medium outline-none text-text"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-medium uppercase tracking-wider text-text-light">Phone Number</label>
                    <div className="flex items-center rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <input 
                        type="tel" 
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="ml-3 w-full bg-transparent text-sm font-medium outline-none text-text"
                      />
                    </div>
                  </div>
                  
                  <button 
                    type="submit"
                    disabled={isUpdating}
                    className="w-full rounded-xl bg-primary py-3.5 text-sm font-medium text-white shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isUpdating ? "Saving..." : "Save Changes"}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Change Password */}
          <div className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
            <button 
              onClick={() => toggleSection('changePassword')}
              className="flex w-full items-center justify-between p-5 active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Lock className="h-6 w-6" />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-text">Change Password</h3>
                  <p className="text-xs font-medium text-text-light">Update your password</p>
                </div>
              </div>
              <ChevronDown className={`h-5 w-5 text-gray-300 transition-transform ${collapsedSections.changePassword ? 'rotate-180' : ''}`} />
            </button>

            {!collapsedSections.changePassword && (
              <div className="px-5 pb-5 border-t border-gray-100">
                <form onSubmit={handleChangePassword} className="space-y-4 pt-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-medium uppercase tracking-wider text-text-light">Current Password</label>
                    <div className="relative">
                      <input
                        type={showCurrentPw ? "text" : "password"}
                        value={passwordData.currentPassword}
                        onChange={e => setPasswordData(p => ({ ...p, currentPassword: e.target.value }))}
                        placeholder="Enter current password"
                        className="w-full rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 pr-11 text-sm font-medium outline-none text-text focus:border-primary/30 focus:ring-2 focus:ring-primary/10 transition-all"
                      />
                      <button type="button" onClick={() => setShowCurrentPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                        {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-medium uppercase tracking-wider text-text-light">New Password</label>
                    <div className="relative">
                      <input
                        type={showNewPw ? "text" : "password"}
                        value={passwordData.newPassword}
                        onChange={e => setPasswordData(p => ({ ...p, newPassword: e.target.value }))}
                        placeholder="Min. 6 characters"
                        className="w-full rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 pr-11 text-sm font-medium outline-none text-text focus:border-primary/30 focus:ring-2 focus:ring-primary/10 transition-all"
                      />
                      <button type="button" onClick={() => setShowNewPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                        {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-medium uppercase tracking-wider text-text-light">Confirm New Password</label>
                    <div className="relative">
                      <input
                        type={showConfirmPw ? "text" : "password"}
                        value={passwordData.confirmPassword}
                        onChange={e => setPasswordData(p => ({ ...p, confirmPassword: e.target.value }))}
                        placeholder="Repeat new password"
                        className="w-full rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 pr-11 text-sm font-medium outline-none text-text focus:border-primary/30 focus:ring-2 focus:ring-primary/10 transition-all"
                      />
                      <button type="button" onClick={() => setShowConfirmPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                        {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isChangingPassword || !passwordData.currentPassword || !passwordData.newPassword}
                    className="w-full rounded-xl border-2 border-primary/20 py-3.5 text-sm font-medium text-primary hover:bg-primary/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isChangingPassword ? "Updating..." : "Update Password"}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Notifications */}
          <section className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-6">
              <Bell className="h-5 w-5 text-primary" />
              <h3 className="font-bold text-text">Notifications</h3>
            </div>
            
            <div className="space-y-5">
              {[
                { id: 'reminders', label: 'Booking Reminders' },
                { id: 'messages', label: 'New Messages' },
                { id: 'promotions', label: 'Promotions' }
              ].map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-text">{item.label}</span>
                  <button 
                    onClick={() => handleNotificationToggle(item.id as keyof typeof notifications)}
                    className={`relative h-6 w-11 rounded-full transition-colors ${notifications[item.id as keyof typeof notifications] ? 'bg-primary' : 'bg-gray-200'}`}
                  >
                    <div className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${notifications[item.id as keyof typeof notifications] ? 'left-6' : 'left-1'}`}></div>
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Help & Support */}
          <button onClick={() => router.push("/support")} className="flex w-full items-center justify-between rounded-2xl bg-white p-5 shadow-sm border border-gray-100 active:scale-[0.98] transition-all">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-500">
                <HelpCircle className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-text text-left">Help & Support</h3>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-300" />
          </button>

          {/* Logout */}
          <button 
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-50 py-5 text-sm font-medium text-red-500 hover:bg-red-100 transition-all active:scale-95"
          >
            <LogOut className="h-5 w-5" />
            Logout Account
          </button>
          </div>{/* end right col */}
        </div>{/* end lg:flex two-column */}

        {/* Premium Floating Bottom Navigation - Compact */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 flex items-center justify-around bg-white px-4 py-3.5 border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] z-50">
          <button className="flex flex-col items-center gap-1 text-text-light" onClick={() => router.push("/bookings")}>
            <div className="p-1"><Calendar className="h-5 w-5" /></div>
            <span className="text-[9px] font-medium uppercase tracking-tight">Booking</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-text-light" onClick={() => router.push("/chat")}>
            <div className="p-1"><MessageSquare className="h-5 w-5" /></div>
            <span className="text-[9px] font-medium uppercase tracking-tight">Chat</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-text-light" onClick={() => router.push("/home")}>
            <div className="p-1"><Home className="h-5 w-5" /></div>
            <span className="text-[9px] font-medium uppercase tracking-tight">Home</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-text-light" onClick={() => router.push("/search")}>
            <div className="p-1"><Briefcase className="h-5 w-5" /></div>
            <span className="text-[9px] font-medium uppercase tracking-tight">Services</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-primary">
            <div className="p-1 rounded-lg bg-primary/10"><User className="h-5 w-5 fill-primary" /></div>
            <span className="text-[9px] font-medium uppercase tracking-tight">Profile</span>
          </button>
        </nav>
      </main>
    </AuthGuard>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar as CalendarIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import AvailabilityCalendar from "@/components/provider/AvailabilityCalendar";
import toast from "react-hot-toast";
import BottomNav from "@/components/common/BottomNav";

interface DayAvailability {
  available: boolean;
  timeSlots: Array<{
    start: string;
    end: string;
  }>;
}

export default function AvailabilityPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [availability, setAvailability] = useState<Record<string, DayAvailability>>({});
  const [saving, setSaving] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    fetchAvailability();
  }, [user]);

  const fetchAvailability = async () => {
    if (!user?.uid) return;

    try {
      setPageLoading(true);
      const providerDoc = await getDoc(doc(db, "users", user.uid));
      
      if (providerDoc.exists()) {
        const providerData = providerDoc.data();
        setAvailability(providerData.availability || {});
      }
    } catch (error) {
      console.error("Error fetching availability:", error);
      toast.error("Failed to load availability");
    } finally {
      setPageLoading(false);
    }
  };

  const handleSaveAvailability = async (newAvailability: Record<string, DayAvailability>) => {
    if (!user?.uid) return;

    try {
      setSaving(true);
      // Save to users collection (for dashboard)
      await updateDoc(doc(db, "users", user.uid), {
        availability: newAvailability,
        updatedAt: new Date().toISOString()
      });
      // Also sync to providers collection (for customer-facing pages)
      try {
        await updateDoc(doc(db, "providers", user.uid), {
          availability: newAvailability,
          updatedAt: new Date().toISOString()
        });
      } catch {
        // providers doc may not exist yet — not fatal
      }

      setAvailability(newAvailability);
      toast.success("Availability saved successfully!");
    } catch (error) {
      console.error("Error saving availability:", error);
      toast.error("Failed to save availability");
    } finally {
      setSaving(false);
    }
  };

  if (loading || pageLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-t-2 border-orange-500"></div>
      </div>
    );
  }

  if (!user || !profile || profile.role !== "provider") {
    router.push("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </button>
          
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-gray-900">Availability</h1>
            <p className="text-sm text-gray-500">Set your weekly working hours</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-6 max-w-2xl mx-auto">
        <AvailabilityCalendar
          initialAvailability={availability}
          onSave={handleSaveAvailability}
          loading={saving}
        />

        {/* Info Card */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex gap-3">
            <CalendarIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900 mb-1">How it works</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Toggle days you're available to work</li>
                <li>• Set specific time slots for each day</li>
                <li>• Customers will only see your available times</li>
                <li>• Add multiple time slots per day if needed</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Stats */}
        {availability && (
          <div className="mt-6 bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="font-medium text-gray-900 mb-3">Current Status</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-500">
                  {Object.values(availability).filter(day => day.available).length}
                </div>
                <div className="text-sm text-gray-500">Days available</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-700">
                  {Object.values(availability)
                    .filter(day => day.available)
                    .reduce((total, day) => total + day.timeSlots.length, 0)}
                </div>
                <div className="text-sm text-gray-500">Time slots</div>
              </div>
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

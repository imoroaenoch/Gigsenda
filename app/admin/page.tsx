"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { getAdminStats, AdminStats, getAllBookings } from "@/lib/admin";
import { 
  Users, 
  Briefcase, 
  CalendarCheck, 
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  MoreVertical,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import toast from "react-hot-toast";
import { Settings } from "lucide-react";
import RevenueChart from "@/components/admin/charts/RevenueChart";
import BookingsChart from "@/components/admin/charts/BookingsChart";
import CategoryChart from "@/components/admin/charts/CategoryChart";
import ProvidersChart from "@/components/admin/charts/ProvidersChart";

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState(30); // 7, 30, or 90 days

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsData, bookingsData] = await Promise.all([
          getAdminStats(),
          getAllBookings()
        ]);
        setStats(statsData);
        setRecentBookings(bookingsData.slice(0, 5));
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const statCards = [
    { label: "Total Users", value: stats?.totalUsers || 0, icon: Users, color: "bg-blue-500", trend: "+12.5%", isUp: true },
    { label: "Active Providers", value: stats?.activeProviders || 0, icon: Briefcase, color: "bg-orange-500", trend: "+5.2%", isUp: true },
    { label: "Total Bookings", value: stats?.totalBookings || 0, icon: CalendarCheck, color: "bg-purple-500", trend: "+8.1%", isUp: true },
    { label: "Total Revenue", value: `₦${stats?.totalRevenue.toLocaleString()}`, icon: TrendingUp, color: "bg-green-500", trend: "+15.3%", isUp: true },
  ];

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium text-text">Dashboard</h1>
          <p className="text-sm font-medium text-text-light mt-1 uppercase tracking-wider">Overview of your marketplace activity</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-gray-100 shadow-sm">
            <CalendarCheck className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-text">{format(new Date(), "MMMM dd, yyyy")}</span>
          </div>
          <Link 
            href="/admin/settings" 
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-gray-100 shadow-sm hover:bg-gray-50 transition-all"
          >
            <Settings className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-text">Settings</span>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all">
            <div className="flex items-center justify-between mb-6">
              <div className={`h-12 w-12 rounded-2xl ${card.color} flex items-center justify-center text-white shadow-lg shadow-${card.color.split('-')[1]}-500/20`}>
                <card.icon className="h-6 w-6" />
              </div>
              <div className={`flex items-center gap-1 text-xs font-medium ${card.isUp ? "text-green-500" : "text-red-500"}`}>
                {card.isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {card.trend}
              </div>
            </div>
            <p className="text-[11px] font-medium text-text-light uppercase tracking-[0.15em] mb-1">{card.label}</p>
            <h3 className="text-3xl font-medium text-text tracking-tight">{card.value}</h3>
          </div>
        ))}
      </div>

      {/* Analytics Section */}
      <div className="space-y-8">
        {/* Date Range Selector */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-text">Analytics</h2>
          <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-100 p-1 shadow-sm">
            {[
              { label: 'Last 7 days', value: 7 },
              { label: 'Last 30 days', value: 30 },
              { label: 'Last 3 months', value: 90 }
            ].map((range) => (
              <button
                key={range.value}
                onClick={() => setDateRange(range.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  dateRange === range.value
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-text-light hover:text-text hover:bg-gray-50'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RevenueChart days={dateRange} />
          <BookingsChart days={dateRange} />
          <CategoryChart />
          <ProvidersChart weeks={Math.ceil(dateRange / 7)} />
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Bookings Table */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-lg font-medium text-text">Recent Bookings</h2>
            <Link href="/admin/bookings" className="text-xs font-medium text-primary uppercase tracking-widest hover:opacity-70 transition-all">
              View All
            </Link>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="pb-4 text-[10px] font-medium text-text-light uppercase tracking-widest">Customer</th>
                  <th className="pb-4 text-[10px] font-medium text-text-light uppercase tracking-widest">Provider</th>
                  <th className="pb-4 text-[10px] font-medium text-text-light uppercase tracking-widest">Price</th>
                  <th className="pb-4 text-[10px] font-medium text-text-light uppercase tracking-widest">Status</th>
                  <th className="pb-4 text-[10px] font-medium text-text-light uppercase tracking-widest text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentBookings.map((booking) => (
                  <tr key={booking.id} className="group hover:bg-gray-50/50 transition-all">
                    <td className="py-5">
                      <p className="text-sm font-medium text-text leading-tight">{booking.customerName}</p>
                      <p className="text-[10px] font-medium text-text-light mt-0.5 uppercase tracking-tight">{booking.category}</p>
                    </td>
                    <td className="py-5 text-sm font-medium text-text">{booking.providerName}</td>
                    <td className="py-5 text-sm font-medium text-primary">₦{booking.price?.toLocaleString()}</td>
                    <td className="py-5">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-medium uppercase tracking-tight ${
                        booking.status === "completed" ? "bg-green-50 text-green-600 border border-green-100" :
                        booking.status === "cancelled" ? "bg-red-50 text-red-600 border border-red-100" :
                        "bg-blue-50 text-blue-600 border border-blue-100"
                      }`}>
                        {booking.status === "completed" ? <CheckCircle2 className="h-3 w-3" /> :
                         booking.status === "cancelled" ? <AlertCircle className="h-3 w-3" /> :
                         <Clock className="h-3 w-3" />}
                        {booking.status}
                      </span>
                    </td>
                    <td className="py-5 text-right text-xs font-medium text-text-light">{format(booking.date, "MMM dd")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions / Activity Feed */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm flex flex-col h-full">
          <h2 className="text-lg font-medium text-text mb-8">System Activity</h2>
          <div className="space-y-8 relative before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-50">
            {[
              { text: "New provider 'Sarah Beauty' applied for approval", time: "2m ago", type: "provider" },
              { text: "Booking #G8923 completed by John Doe", time: "15m ago", type: "booking" },
              { text: "Payout of ₦45,000 processed for Jane Smith", time: "1h ago", type: "payment" },
              { text: "New customer 'Mike Ross' joined", time: "3h ago", type: "user" },
              { text: "Commission report for March generated", time: "5h ago", type: "report" },
            ].map((activity, i) => (
              <div key={i} className="flex items-start gap-5 relative z-10">
                <div className={`h-5 w-5 rounded-full mt-1 border-4 border-white shadow-sm ${
                  activity.type === 'provider' ? 'bg-blue-500' :
                  activity.type === 'booking' ? 'bg-green-500' :
                  activity.type === 'payment' ? 'bg-orange-500' :
                  'bg-purple-500'
                }`}></div>
                <div className="flex-1">
                  <p className="text-[13px] font-medium text-text leading-tight">{activity.text}</p>
                  <p className="text-[10px] font-medium text-text-light mt-1 uppercase tracking-wider">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-auto pt-8 border-t border-gray-50">
            <h3 className="text-[11px] font-medium text-text-light uppercase tracking-widest mb-4">Quick Actions</h3>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/admin/disputes"
                className="flex-1 min-w-[120px] rounded-xl bg-red-500 py-3 text-[10px] font-medium text-white shadow-lg shadow-red-200 active:scale-95 transition-all text-center"
              >
                View Disputes
              </Link>
              <button
                onClick={() => toast.success("Data export coming soon — check back later.")}
                className="flex-1 min-w-[120px] rounded-xl bg-gray-50 py-3 text-[10px] font-medium text-text hover:bg-gray-100 transition-all active:scale-95"
              >
                Export Data
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

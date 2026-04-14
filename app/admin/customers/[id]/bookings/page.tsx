"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  User, 
  Calendar, 
  Clock, 
  DollarSign, 
  TrendingUp, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  BookOpen,
  Filter,
  CreditCard
} from "lucide-react";
import { getCustomerById, getCustomerBookings } from "@/lib/firestore";
import { format } from "date-fns";
import Image from "next/image";
import toast from "react-hot-toast";

interface Customer {
  id: string;
  name?: string;
  email?: string;
  photoURL?: string;
}

interface Booking {
  id: string;
  providerName?: string;
  providerPhotoURL?: string;
  serviceName?: string;
  category?: string;
  amount?: number;
  status?: string;
  createdAt?: any;
  bookingDate?: string;
  bookingTime?: string;
  referenceNumber?: string;
}

type TabType = "all" | "pending" | "confirmed" | "completed" | "cancelled";

export default function CustomerBookingsPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("all");

  useEffect(() => {
    if (customerId) {
      fetchCustomerData();
    }
  }, [customerId]);

  const fetchCustomerData = async () => {
    setLoading(true);
    try {
      // Fetch customer data first
      const customerData = await getCustomerById(customerId);
      setCustomer(customerData);
      
      // Try to fetch bookings separately, but don't fail if it errors
      try {
        const bookingsData = await getCustomerBookings(customerId);
        setBookings(bookingsData || []);
      } catch (bookingError) {
        console.error("Error fetching bookings:", bookingError);
        setBookings([]);
        toast("Could not load booking history. Please check Firestore indexes.");
      }
      
    } catch (error) {
      console.error("Error fetching customer data:", error);
      toast.error("Failed to load customer data");
    } finally {
      setLoading(false);
    }
  };

  const filteredBookings = bookings.filter(booking => {
    if (activeTab === "all") return true;
    return booking.status === activeTab;
  });

  const getTabCount = (status: TabType) => {
    if (status === "all") return bookings.length;
    return bookings.filter(b => b.status === status).length;
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateCommission = (amount?: number) => {
    if (!amount) return 0;
    return amount * 0.1; // 10% commission
  };

  const totalCommission = bookings.reduce((sum, booking) => sum + calculateCommission(booking.amount), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading customer bookings...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Customer Not Found</h2>
          <p className="text-gray-600 mb-4">The customer you're looking for doesn't exist.</p>
          <button
            onClick={() => router.push("/admin/customers")}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push(`/admin/customers/${customerId}`)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <nav className="flex items-center space-x-2 text-sm">
                <span className="text-gray-600 hover:text-gray-900 cursor-pointer" onClick={() => router.push("/admin")}>
                  Admin
                </span>
                <span className="text-gray-400">/</span>
                <span className="text-gray-600 hover:text-gray-900 cursor-pointer" onClick={() => router.push("/admin/customers")}>
                  Customer Management
                </span>
                <span className="text-gray-400">/</span>
                <span className="text-gray-600 hover:text-gray-900 cursor-pointer" onClick={() => router.push(`/admin/customers/${customerId}`)}>
                  {customer.name || "Unknown"}
                </span>
                <span className="text-gray-400">/</span>
                <span className="text-gray-900 font-medium">Bookings</span>
              </nav>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Customer Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 rounded-full overflow-hidden border-2 border-gray-100 bg-gray-50">
              {customer.photoURL ? (
                <Image src={customer.photoURL} alt={customer.name || ""} fill className="object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-gray-400 text-lg font-bold">
                  {customer.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{customer.name || "Unknown Customer"}</h1>
              <p className="text-gray-600">{customer.email || "No email"}</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                <p className="text-2xl font-semibold text-gray-900">{bookings.length}</p>
              </div>
              <BookOpen className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Spent</p>
                <p className="text-2xl font-semibold text-gray-900">
                  ₦{bookings.reduce((sum, b) => sum + (b.amount || 0), 0).toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Commission Earned</p>
                <p className="text-2xl font-semibold text-gray-900">₦{totalCommission.toLocaleString()}</p>
              </div>
              <CreditCard className="h-8 w-8 text-purple-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {bookings.filter(b => b.status === "completed").length}
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {[
                { key: "all", label: "All Bookings" },
                { key: "pending", label: "Pending" },
                { key: "confirmed", label: "Confirmed" },
                { key: "completed", label: "Completed" },
                { key: "cancelled", label: "Cancelled" }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as TabType)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    activeTab === tab.key
                      ? "border-orange-500 text-orange-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <Filter className="h-4 w-4" />
                  {tab.label}
                  <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                    {getTabCount(tab.key as TabType)}
                  </span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Bookings List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {filteredBookings.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No {activeTab === "all" ? "" : activeTab} bookings found
              </h3>
              <p className="text-gray-600">
                {activeTab === "all" 
                  ? "This customer hasn't made any bookings yet." 
                  : `This customer has no ${activeTab} bookings.`}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredBookings.map((booking) => (
                <div key={booking.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      {/* Provider Info */}
                      <div className="relative h-12 w-12 rounded-full overflow-hidden border-2 border-gray-100 bg-gray-50 flex-shrink-0">
                        {booking.providerPhotoURL ? (
                          <Image src={booking.providerPhotoURL} alt={booking.providerName || ""} fill className="object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-gray-400 text-sm font-bold">
                            {booking.providerName?.charAt(0)?.toUpperCase() || "P"}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{booking.serviceName}</h3>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(booking.status)}`}>
                            {booking.status || 'Unknown'}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                          <div className="flex items-center gap-2 text-gray-600">
                            <User className="h-4 w-4" />
                            <span>{booking.providerName || "Unknown Provider"}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {booking.createdAt ? format(booking.createdAt.toDate(), "MMM dd, yyyy") : "No date"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <Clock className="h-4 w-4" />
                            <span>
                              {booking.bookingTime || booking.createdAt ? 
                                format(booking.createdAt.toDate(), "h:mm a") : "No time"
                              }
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <TrendingUp className="h-4 w-4" />
                            <span>{booking.category || "General"}</span>
                          </div>
                        </div>

                        {/* Booking Reference */}
                        {booking.referenceNumber && (
                          <div className="mt-2 text-xs text-gray-500">
                            Reference: #{booking.referenceNumber}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Amount and Commission */}
                    <div className="text-right">
                      <div className="text-lg font-semibold text-gray-900">
                        ₦{booking.amount?.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        Commission: ₦{calculateCommission(booking.amount).toLocaleString()}
                      </div>
                      <button
                        onClick={() => {
                          // TODO: Navigate to booking details
                          toast.info("Booking details page coming soon");
                        }}
                        className="mt-2 text-orange-600 hover:text-orange-700 text-sm font-medium flex items-center gap-1"
                      >
                        <Eye className="h-4 w-4" />
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

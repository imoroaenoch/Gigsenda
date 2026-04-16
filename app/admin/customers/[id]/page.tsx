"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  BookOpen, 
  DollarSign, 
  TrendingUp, 
  MessageSquare, 
  Ban, 
  UserCheck, 
  Trash2, 
  Eye,
  Clock,
  Star
} from "lucide-react";
import { 
  getCustomerById, 
  getCustomerBookings, 
  updateCustomerStatus, 
  deleteCustomerAccount, 
  sendMessageToCustomer 
} from "@/lib/firestore";
import { format } from "date-fns";
import Image from "next/image";
import toast from "react-hot-toast";

interface Customer {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  city?: string;
  createdAt?: any;
  isActive?: boolean;
  isDeleted?: boolean;
  photoURL?: string;
  averageRating?: number;
}

interface Booking {
  id: string;
  providerName?: string;
  serviceName?: string;
  category?: string;
  amount?: number;
  status?: string;
  createdAt?: any;
  bookingDate?: string;
  bookingTime?: string;
}

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modal states
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [message, setMessage] = useState("");

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
      
      // Set customer data immediately
      setCustomer(customerData);
      
      // Try to fetch bookings separately, but don't fail if it errors
      try {
        const bookingsData = await getCustomerBookings(customerId);
        setBookings(bookingsData || []);
      } catch (bookingError) {
        console.error("Error fetching bookings (customer profile still loads):", bookingError);
        // Set empty bookings if fetch fails
        setBookings([]);
        // Show a message but don't block the customer profile
        toast("Could not load booking history");
      }
      
    } catch (error) {
      console.error("Error fetching customer data:", error);
      toast.error("Failed to load customer data");
    } finally {
      setLoading(false);
    }
  };

  const handleSuspendAccount = async () => {
    if (!customer) return;
    
    setActionLoading(true);
    try {
      const newStatus = !customer.isActive;
      await updateCustomerStatus(customerId, newStatus);
      setCustomer(prev => prev ? { ...prev, isActive: newStatus } : null);
      toast.success(`Customer ${newStatus ? 'reactivated' : 'suspended'} successfully`);
      setShowSuspendModal(false);
    } catch (error) {
      toast.error("Failed to update customer status");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!customer) return;
    
    setActionLoading(true);
    try {
      await deleteCustomerAccount(customerId);
      toast.success("Customer account deleted successfully");
      setShowDeleteModal(false);
      router.push("/admin/customers");
    } catch (error) {
      toast.error("Failed to delete customer account");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!customer || !message.trim()) return;
    
    setActionLoading(true);
    try {
      await sendMessageToCustomer(customerId, message);
      toast.success("Message sent to customer successfully");
      setShowMessageModal(false);
      setMessage("");
    } catch (error) {
      toast.error("Failed to send message");
    } finally {
      setActionLoading(false);
    }
  };

  // Calculate statistics
  const totalBookings = bookings.length;
  const totalSpent = bookings.reduce((sum, booking) => sum + (booking.amount || 0), 0);
  const completedBookings = bookings.filter(b => b.status === "completed").length;
  const lastBooking = bookings[0];
  
  // Find favorite service category
  const categoryCounts = bookings.reduce((acc, booking) => {
    const category = booking.category || "Other";
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const favoriteCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "None";

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading customer profile...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Customer Not Found</h2>
          <p className="text-gray-600 mb-6">The customer you're looking for doesn't exist or has been deleted.</p>
          <button
            onClick={() => router.push("/admin/customers")}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 mx-auto"
          >
            <ArrowLeft className="h-4 w-4" />
            Go back to Customer Management
          </button>
        </div>
      </div>
    );
  }

  if (customer.isDeleted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Customer Account Deleted</h2>
          <p className="text-gray-600 mb-6">This customer account has been deleted and is no longer accessible.</p>
          <button
            onClick={() => router.push("/admin/customers")}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 mx-auto"
          >
            <ArrowLeft className="h-4 w-4" />
            Go back to Customer Management
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
                onClick={() => router.push("/admin/customers")}
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
                <span className="text-gray-900 font-medium">{customer.name || "Unknown"}</span>
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                customer.isActive !== false 
                  ? "bg-green-50 text-green-600 border border-green-100" 
                  : "bg-red-50 text-red-600 border border-red-100"
              }`}>
                {customer.isActive !== false ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {customer.isActive !== false ? "Active" : "Suspended"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Customer Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="text-center">
                <div className="relative h-24 w-24 mx-auto rounded-full overflow-hidden border-4 border-gray-100 bg-gray-50">
                  {customer.photoURL ? (
                    <Image src={customer.photoURL} alt={customer.name || ""} fill className="object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-gray-400 text-2xl font-bold">
                      {customer.name?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                  )}
                </div>
                <h2 className="mt-4 text-xl font-semibold text-gray-900">{customer.name || "Unknown"}</h2>
                {customer.averageRating && (
                  <div className="flex items-center justify-center gap-1 mt-2">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < Math.floor(customer.averageRating) ? "text-yellow-400 fill-current" : "text-gray-300"
                        }`}
                      />
                    ))}
                    <span className="text-sm text-gray-600 ml-1">({customer.averageRating.toFixed(1)})</span>
                  </div>
                )}
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-900">{customer.email || "No email"}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-900">{customer.phone || "No phone"}</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-900">{customer.city || "No location"}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-900">
                    Member since {customer.createdAt ? format(customer.createdAt.toDate(), "MMMM yyyy") : "Unknown"}
                  </span>
                </div>
              </div>

              {/* Admin Actions */}
              <div className="mt-6 space-y-3">
                <button
                  onClick={() => setShowSuspendModal(true)}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium ${
                    customer.isActive !== false 
                      ? "bg-red-500 text-white hover:bg-red-600" 
                      : "bg-green-500 text-white hover:bg-green-600"
                  }`}
                >
                  {customer.isActive !== false ? <Ban className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                  {customer.isActive !== false ? "Suspend Account" : "Reactivate Account"}
                </button>
                <button
                  onClick={() => setShowMessageModal(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium"
                >
                  <MessageSquare className="h-4 w-4" />
                  Send Message
                </button>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-medium"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Account
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Booking Statistics */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Booking Statistics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-600">Total Bookings</p>
                      <p className="text-2xl font-bold text-blue-900">{totalBookings}</p>
                    </div>
                    <BookOpen className="h-8 w-8 text-blue-500" />
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-600">Total Spent</p>
                      <p className="text-2xl font-bold text-green-900">₦{totalSpent.toLocaleString()}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-500" />
                  </div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-600">Completed</p>
                      <p className="text-2xl font-bold text-purple-900">{completedBookings}</p>
                    </div>
                    <CheckCircle2 className="h-8 w-8 text-purple-500" />
                  </div>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-600">Favorite Service</p>
                      <p className="text-lg font-bold text-orange-900 truncate">{favoriteCategory}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-orange-500" />
                  </div>
                </div>
              </div>
              {lastBooking && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span>Last booking: {format(lastBooking.createdAt.toDate(), "MMM dd, yyyy 'at' h:mm a")}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Recent Bookings */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Recent Bookings</h3>
                <button
                  onClick={() => router.push(`/admin/customers/${customerId}/bookings`)}
                  className="text-orange-600 hover:text-orange-700 text-sm font-medium flex items-center gap-1"
                >
                  <Eye className="h-4 w-4" />
                  View All Bookings
                </button>
              </div>
              <div className="overflow-x-auto">
                {bookings.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No bookings found</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Provider
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Service
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date & Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {bookings.slice(0, 10).map((booking) => (
                        <tr key={booking.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{booking.providerName}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{booking.serviceName}</div>
                            <div className="text-xs text-gray-500">{booking.category}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {booking.createdAt ? format(booking.createdAt.toDate(), "MMM dd, yyyy h:mm a") : "N/A"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₦{booking.amount?.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                              booking.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                              booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {booking.status || 'Unknown'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Suspend Modal */}
      {showSuspendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {customer.isActive !== false ? "Suspend Account" : "Reactivate Account"}
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              {customer.isActive !== false 
                ? "Are you sure you want to suspend this customer's account? They will not be able to make new bookings."
                : "Are you sure you want to reactivate this customer's account?"
              }
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSuspendModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSuspendAccount}
                disabled={actionLoading}
                className={`flex-1 px-4 py-2 text-white rounded-lg disabled:opacity-50 ${
                  customer.isActive !== false ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"
                }`}
              >
                {actionLoading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mx-auto" />
                ) : (
                  customer.isActive !== false ? "Suspend" : "Reactivate"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete Account</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure? This action cannot be undone. The customer's account will be marked as deleted and they will lose access to the platform.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mx-auto" />
                ) : (
                  "Delete Account"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Send Message to Customer</h3>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              rows={4}
            />
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowMessageModal(false);
                  setMessage("");
                }}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSendMessage}
                disabled={actionLoading || !message.trim()}
                className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
              >
                {actionLoading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mx-auto" />
                ) : (
                  "Send Message"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

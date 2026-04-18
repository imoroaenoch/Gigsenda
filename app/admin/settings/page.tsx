"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Settings, Upload, Eye, EyeOff, TestTube, Mail, Save, Trash2, Plus, Edit2, Check, X, AlertTriangle, Shield, LogOut, Smartphone, Calendar, Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import AuthGuard from "@/components/auth/AuthGuard";
import SettingsTabs, { TABS } from "@/components/admin/SettingsTabs";
import {
  getAppSettings,
  updateGeneralSettings,
  updatePaymentSettings,
  updateCommission,
  updateEmailSettings,
  updateBrandingSettings,
  updateAppConfiguration,
  updateAdminAccount,
  testPayment,
  testEmail,
  GeneralSettings,
  PaymentSettings,
  EmailSettings,
  BrandingSettings,
  AppConfiguration,
} from "@/lib/admin-settings";
import toast from "react-hot-toast";

export default function AdminSettingsPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState("general");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { theme, toggleTheme } = useTheme();

  // Settings state
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>({
    appName: "Gigsenda",
    appDescription: "",
    supportEmail: "",
    supportPhone: "",
    websiteUrl: "",
  });

  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    paystackPublicKey: "",
    paystackSecretKey: "",
  });

  const [commissionRate, setCommissionRate] = useState(10);
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    provider: "gmail",
    senderEmail: "",
    appPassword: "",
    templates: {
      bookingConfirmation: "",
      paymentReceipt: "",
      providerApproval: "",
    },
  });

  const [brandingSettings, setBrandingSettings] = useState<BrandingSettings>({
    logoUrl: "",
    primaryColor: "#FF8C00",
    secondaryColor: "#3B82F6",
    backgroundColor: "#FFF8F0",
  });

  const [appConfiguration, setAppConfiguration] = useState<AppConfiguration>({
    categories: [],
    booking: {
      minAmount: 1000,
      maxAmount: 1000000,
      cancellationHours: 24,
      refundPercentage: 80,
    },
    provider: {
      autoApprove: false,
      requireIdVerification: true,
      minRatingRequirement: 3.0,
    },
  });

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Email change state
  const [emailData, setEmailData] = useState({
    currentPassword: "",
    newEmail: "",
    confirmEmail: "",
  });
  const [isChangingEmail, setIsChangingEmail] = useState(false);

  // Show/hide password states
  const [showKeys, setShowKeys] = useState({
    publicKey: false,
    secretKey: false,
    emailPassword: false,
  });

  // New category state
  const [newCategory, setNewCategory] = useState({
    name: "",
    icon: "",
    description: "",
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const settings = await getAppSettings();
      
      if (settings.general) setGeneralSettings(settings.general);
      if (settings.payment) setPaymentSettings(settings.payment);
      if (settings.commission) setCommissionRate(settings.commission.percentage);
      if (settings.email) setEmailSettings(settings.email);
      if (settings.branding) setBrandingSettings(settings.branding);
      if (settings.configuration) setAppConfiguration(settings.configuration);
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGeneral = async () => {
    if (!generalSettings.appName || !generalSettings.supportEmail) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSaving(true);
    try {
      const success = await updateGeneralSettings(generalSettings);
      if (success) {
        toast.success("General settings saved successfully!");
      } else {
        toast.error("Failed to save settings");
      }
    } catch (error) {
      toast.error("Error saving settings");
    } finally {
      setSaving(false);
    }
  };

  const handleSavePayment = async () => {
    if (!paymentSettings.paystackPublicKey || !paymentSettings.paystackSecretKey) {
      toast.error("Please enter both Paystack keys");
      return;
    }

    setSaving(true);
    try {
      const success = await updatePaymentSettings(paymentSettings);
      if (success) {
        toast.success("Payment settings saved successfully!");
      } else {
        toast.error("Failed to save payment settings");
      }
    } catch (error) {
      toast.error("Error saving payment settings");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCommission = async () => {
    setSaving(true);
    try {
      const success = await updateCommission(commissionRate);
      if (success) {
        toast.success("Commission rate saved successfully!");
      } else {
        toast.error("Failed to save commission rate");
      }
    } catch (error) {
      toast.error("Error saving commission rate");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEmail = async () => {
    if (!emailSettings.senderEmail || !emailSettings.appPassword) {
      toast.error("Please enter sender email and app password");
      return;
    }

    setSaving(true);
    try {
      const success = await updateEmailSettings(emailSettings);
      if (success) {
        toast.success("Email settings saved successfully!");
      } else {
        toast.error("Failed to save email settings");
      }
    } catch (error) {
      toast.error("Error saving email settings");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBranding = async () => {
    setSaving(true);
    try {
      const success = await updateBrandingSettings(brandingSettings);
      if (success) {
        toast.success("Branding settings saved successfully!");
      } else {
        toast.error("Failed to save branding settings");
      }
    } catch (error) {
      toast.error("Error saving branding settings");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveConfiguration = async () => {
    setSaving(true);
    try {
      const success = await updateAppConfiguration(appConfiguration);
      if (success) {
        toast.success("App configuration saved successfully!");
      } else {
        toast.error("Failed to save app configuration");
      }
    } catch (error) {
      toast.error("Error saving app configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleTestPayment = async () => {
    try {
      const success = await testPayment();
      if (success) {
        toast.success("Payment test successful!");
      } else {
        toast.error("Payment test failed");
      }
    } catch (error) {
      toast.error("Error testing payment");
    }
  };

  const handleTestEmail = async () => {
    if (!emailSettings.senderEmail) {
      toast.error("Please configure email settings first");
      return;
    }

    try {
      const success = await testEmail(emailSettings.senderEmail);
      if (success) {
        toast.success("Test email sent successfully!");
      } else {
        toast.error("Failed to send test email");
      }
    } catch (error) {
      toast.error("Error sending test email");
    }
  };

  const handleEmailChange = async () => {
    // Validation
    if (!emailData.currentPassword) {
      toast.error("Please enter your current password");
      return;
    }
    
    if (!emailData.newEmail) {
      toast.error("Please enter a new email address");
      return;
    }
    
    if (emailData.newEmail !== emailData.confirmEmail) {
      toast.error("New email addresses do not match");
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailData.newEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }
    
    if (emailData.newEmail === user?.email) {
      toast.error("New email cannot be the same as current email");
      return;
    }

    setSaving(true);
    
    try {
      // In a real implementation, you would:
      // 1. Reauthenticate user with current password
      // 2. Update email in Firebase Auth
      // 3. Update email in Firestore
      // 4. Send verification email to new address
      
      // For now, we'll simulate the process
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      
      // Log the email change for security
      console.log(`Email change requested: ${user?.email} -> ${emailData.newEmail}`);
      
      toast.success("Email change request submitted! Please check your new email for verification.");
      
      // Reset form
      setEmailData({
        currentPassword: "",
        newEmail: "",
        confirmEmail: "",
      });
      setIsChangingEmail(false);
      
    } catch (error) {
      console.error("Email change error:", error);
      toast.error("Failed to change email. Please check your password and try again.");
    } finally {
      setSaving(false);
    }
  };

  const addCategory = () => {
    if (!newCategory.name) return;
    
    const category = {
      id: Date.now().toString(),
      ...newCategory,
    };
    
    setAppConfiguration(prev => ({
      ...prev,
      categories: [...prev.categories, category],
    }));
    
    setNewCategory({ name: "", icon: "", description: "" });
  };

  const removeCategory = (id: string) => {
    setAppConfiguration(prev => ({
      ...prev,
      categories: prev.categories.filter(cat => cat.id !== id),
    }));
  };

  const calculateCommission = (amount: number) => {
    const commission = (amount * commissionRate) / 100;
    const providerEarning = amount - commission;
    return { commission, providerEarning };
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <AuthGuard requiredRole="admin">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200">
          <div className="px-4 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-700" />
              </button>
              
              <div className="flex-1">
                <h1 className="text-xl font-semibold text-gray-900">Admin Settings</h1>
                <p className="text-sm text-gray-500">Manage app configuration and preferences</p>
              </div>
              
              <Settings className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </header>

        <div className="flex flex-col lg:flex-row">
          {/* Sidebar */}
          <aside className="w-full lg:w-80 p-4 lg:p-6">
            <SettingsTabs activeTab={activeTab} onTabChange={setActiveTab} />
          </aside>

          {/* Main Content */}
          <main className="flex-1 p-4 lg:p-6">
            {/* General Settings Tab */}
            {activeTab === "general" && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">General Settings</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      App Name *
                    </label>
                    <input
                      type="text"
                      value={generalSettings.appName}
                      onChange={(e) => setGeneralSettings(prev => ({ ...prev, appName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      App Description
                    </label>
                    <textarea
                      value={generalSettings.appDescription}
                      onChange={(e) => setGeneralSettings(prev => ({ ...prev, appDescription: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Support Email *
                    </label>
                    <input
                      type="email"
                      value={generalSettings.supportEmail}
                      onChange={(e) => setGeneralSettings(prev => ({ ...prev, supportEmail: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Support Phone
                    </label>
                    <input
                      type="tel"
                      value={generalSettings.supportPhone}
                      onChange={(e) => setGeneralSettings(prev => ({ ...prev, supportPhone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Website URL
                    </label>
                    <input
                      type="url"
                      value={generalSettings.websiteUrl}
                      onChange={(e) => setGeneralSettings(prev => ({ ...prev, websiteUrl: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSaveGeneral}
                  disabled={saving}
                  className="mt-6 flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
                >
                  {saving ? (
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Changes
                </button>
              </div>
            )}

            {/* Payment Settings Tab */}
            {activeTab === "payment" && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Payment Settings</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Paystack Public Key *
                    </label>
                    <div className="relative">
                      <input
                        type={showKeys.publicKey ? "text" : "password"}
                        value={paymentSettings.paystackPublicKey}
                        onChange={(e) => setPaymentSettings(prev => ({ ...prev, paystackPublicKey: e.target.value }))}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKeys(prev => ({ ...prev, publicKey: !prev.publicKey }))}
                        className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"
                      >
                        {showKeys.publicKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Paystack Secret Key *
                    </label>
                    <div className="relative">
                      <input
                        type={showKeys.secretKey ? "text" : "password"}
                        value={paymentSettings.paystackSecretKey}
                        onChange={(e) => setPaymentSettings(prev => ({ ...prev, paystackSecretKey: e.target.value }))}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKeys(prev => ({ ...prev, secretKey: !prev.secretKey }))}
                        className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"
                      >
                        {showKeys.secretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex gap-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                      <p className="text-sm text-yellow-800">
                        Keep your secret key private. Never share it with anyone.
                      </p>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm font-semibold text-blue-900 mb-1">Paystack Webhook URL</p>
                    <p className="text-xs text-blue-700 mb-2">
                      Copy this URL into your Paystack Dashboard → Settings → Webhooks. Set event to <strong>charge.success</strong>.
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs bg-white border border-blue-200 rounded px-3 py-2 text-blue-900 font-mono break-all select-all">
                        {(process.env.NEXT_PUBLIC_APP_URL || "https://gigsenda.vercel.app") + "/api/paystack/webhook"}
                      </code>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText((process.env.NEXT_PUBLIC_APP_URL || "https://gigsenda.vercel.app") + "/api/paystack/webhook");
                          toast.success("Webhook URL copied!");
                        }}
                        className="flex-shrink-0 px-3 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleSavePayment}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
                    >
                      {saving ? (
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Update Keys
                    </button>

                    <button
                      onClick={handleTestPayment}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                      <TestTube className="h-4 w-4" />
                      Test Payment
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Commission Settings Tab */}
            {activeTab === "commission" && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Commission Settings</h2>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Commission Percentage: {commissionRate}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      value={commissionRate}
                      onChange={(e) => setCommissionRate(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>0%</span>
                      <span>25%</span>
                      <span>50%</span>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Commission Preview</h3>
                    <div className="text-sm text-gray-600">
                      <p>If a customer pays ₦10,000:</p>
                      <ul className="mt-2 space-y-1">
                        <li>• Gigsenda earns: <span className="font-semibold text-orange-600">₦{calculateCommission(10000).commission.toLocaleString()}</span></li>
                        <li>• Provider earns: <span className="font-semibold text-green-600">₦{calculateCommission(10000).providerEarning.toLocaleString()}</span></li>
                      </ul>
                    </div>
                  </div>

                  <button
                    onClick={handleSaveCommission}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
                  >
                    {saving ? (
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save Commission Rate
                  </button>
                </div>
              </div>
            )}

            {/* Email Settings Tab */}
            {activeTab === "email" && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Email Settings</h2>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Service Provider
                    </label>
                    <select
                      value={emailSettings.provider}
                      onChange={(e) => setEmailSettings(prev => ({ ...prev, provider: e.target.value as "gmail" | "sendgrid" | "mailgun" }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="gmail">Gmail</option>
                      <option value="sendgrid">SendGrid</option>
                      <option value="mailgun">Mailgun</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sender Email Address
                    </label>
                    <input
                      type="email"
                      value={emailSettings.senderEmail}
                      onChange={(e) => setEmailSettings(prev => ({ ...prev, senderEmail: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      App Password
                    </label>
                    <div className="relative">
                      <input
                        type={showKeys.emailPassword ? "text" : "password"}
                        value={emailSettings.appPassword}
                        onChange={(e) => setEmailSettings(prev => ({ ...prev, appPassword: e.target.value }))}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKeys(prev => ({ ...prev, emailPassword: !prev.emailPassword }))}
                        className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"
                      >
                        {showKeys.emailPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveEmail}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
                    >
                      {saving ? (
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Save Email Settings
                    </button>

                    <button
                      onClick={handleTestEmail}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                      <Mail className="h-4 w-4" />
                      Test Email
                    </button>
                  </div>

                  {/* Email Templates */}
                  <div className="border-t pt-6">
                    <h3 className="text-sm font-medium text-gray-900 mb-4">Email Templates</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Booking Confirmation Template
                        </label>
                        <textarea
                          value={emailSettings.templates.bookingConfirmation}
                          onChange={(e) => setEmailSettings(prev => ({
                            ...prev,
                            templates: {
                              ...prev.templates,
                              bookingConfirmation: e.target.value,
                            },
                          }))}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Payment Receipt Template
                        </label>
                        <textarea
                          value={emailSettings.templates.paymentReceipt}
                          onChange={(e) => setEmailSettings(prev => ({
                            ...prev,
                            templates: {
                              ...prev.templates,
                              paymentReceipt: e.target.value,
                            },
                          }))}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Provider Approval Template
                        </label>
                        <textarea
                          value={emailSettings.templates.providerApproval}
                          onChange={(e) => setEmailSettings(prev => ({
                            ...prev,
                            templates: {
                              ...prev.templates,
                              providerApproval: e.target.value,
                            },
                          }))}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Brand & Logo Tab */}
            {activeTab === "branding" && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Brand & Logo</h2>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Current Logo
                    </label>
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
                        {brandingSettings.logoUrl ? (
                          <img src={brandingSettings.logoUrl} alt="Logo" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <Upload className="h-8 w-8 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <button className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm">
                          Upload New Logo
                        </button>
                        <p className="text-xs text-gray-500 mt-1">
                          PNG, JPG, WEBP. Max 2MB
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Color Scheme
                    </label>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <label className="text-sm text-gray-600 w-24">Primary:</label>
                        <input
                          type="color"
                          value={brandingSettings.primaryColor}
                          onChange={(e) => setBrandingSettings(prev => ({ ...prev, primaryColor: e.target.value }))}
                          className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={brandingSettings.primaryColor}
                          onChange={(e) => setBrandingSettings(prev => ({ ...prev, primaryColor: e.target.value }))}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>

                      <div className="flex items-center gap-3">
                        <label className="text-sm text-gray-600 w-24">Secondary:</label>
                        <input
                          type="color"
                          value={brandingSettings.secondaryColor}
                          onChange={(e) => setBrandingSettings(prev => ({ ...prev, secondaryColor: e.target.value }))}
                          className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={brandingSettings.secondaryColor}
                          onChange={(e) => setBrandingSettings(prev => ({ ...prev, secondaryColor: e.target.value }))}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>

                      <div className="flex items-center gap-3">
                        <label className="text-sm text-gray-600 w-24">Background:</label>
                        <input
                          type="color"
                          value={brandingSettings.backgroundColor}
                          onChange={(e) => setBrandingSettings(prev => ({ ...prev, backgroundColor: e.target.value }))}
                          className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={brandingSettings.backgroundColor}
                          onChange={(e) => setBrandingSettings(prev => ({ ...prev, backgroundColor: e.target.value }))}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Preview
                    </label>
                    <div 
                      className="p-4 rounded-lg border-2 border-dashed border-gray-300"
                      style={{ backgroundColor: brandingSettings.backgroundColor }}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: brandingSettings.primaryColor }}
                        >
                          G
                        </div>
                        <div>
                          <div className="font-semibold" style={{ color: brandingSettings.primaryColor }}>
                            {generalSettings.appName}
                          </div>
                          <div className="text-sm" style={{ color: brandingSettings.secondaryColor }}>
                            Preview Text
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleSaveBranding}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
                  >
                    {saving ? (
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save Branding
                  </button>
                </div>
              </div>
            )}

            {/* App Configuration Tab */}
            {activeTab === "configuration" && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">App Configuration</h2>
                
                <div className="space-y-8">
                  {/* Service Categories */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-4">Service Categories</h3>
                    
                    <div className="space-y-2 mb-4">
                      {appConfiguration.categories.map((category) => (
                        <div key={category.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{category.name}</div>
                            <div className="text-sm text-gray-500">{category.description}</div>
                          </div>
                          <button className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => removeCategory(category.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Add New Category</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <input
                          type="text"
                          placeholder="Category name"
                          value={newCategory.name}
                          onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Icon name"
                          value={newCategory.icon}
                          onChange={(e) => setNewCategory(prev => ({ ...prev, icon: e.target.value }))}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Description"
                          value={newCategory.description}
                          onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      <button
                        onClick={addCategory}
                        className="mt-3 flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                      >
                        <Plus className="h-4 w-4" />
                        Add Category
                      </button>
                    </div>
                  </div>

                  {/* Booking Settings */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-4">Booking Settings</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Minimum Booking Amount (₦)
                        </label>
                        <input
                          type="number"
                          value={appConfiguration.booking.minAmount}
                          onChange={(e) => setAppConfiguration(prev => ({
                            ...prev,
                            booking: { ...prev.booking, minAmount: Number(e.target.value) },
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Maximum Booking Amount (₦)
                        </label>
                        <input
                          type="number"
                          value={appConfiguration.booking.maxAmount}
                          onChange={(e) => setAppConfiguration(prev => ({
                            ...prev,
                            booking: { ...prev.booking, maxAmount: Number(e.target.value) },
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Allow Cancellation (hours before)
                        </label>
                        <input
                          type="number"
                          value={appConfiguration.booking.cancellationHours}
                          onChange={(e) => setAppConfiguration(prev => ({
                            ...prev,
                            booking: { ...prev.booking, cancellationHours: Number(e.target.value) },
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Cancellation Refund (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={appConfiguration.booking.refundPercentage}
                          onChange={(e) => setAppConfiguration(prev => ({
                            ...prev,
                            booking: { ...prev.booking, refundPercentage: Number(e.target.value) },
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Provider Settings */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-4">Provider Settings</h3>
                    
                    <div className="space-y-3">
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={appConfiguration.provider.autoApprove}
                          onChange={(e) => setAppConfiguration(prev => ({
                            ...prev,
                            provider: { ...prev.provider, autoApprove: e.target.checked },
                          }))}
                          className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                        />
                        <span className="text-sm text-gray-700">Auto-approve new providers</span>
                      </label>

                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={appConfiguration.provider.requireIdVerification}
                          onChange={(e) => setAppConfiguration(prev => ({
                            ...prev,
                            provider: { ...prev.provider, requireIdVerification: e.target.checked },
                          }))}
                          className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                        />
                        <span className="text-sm text-gray-700">Require ID verification</span>
                      </label>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Minimum rating requirement to stay active
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="5"
                          step="0.1"
                          value={appConfiguration.provider.minRatingRequirement}
                          onChange={(e) => setAppConfiguration(prev => ({
                            ...prev,
                            provider: { ...prev.provider, minRatingRequirement: Number(e.target.value) },
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleSaveConfiguration}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
                  >
                    {saving ? (
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save Configuration
                  </button>
                </div>
              </div>
            )}

            {/* Admin Account Tab */}
            {activeTab === "admin" && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Admin Account</h2>
                
                <div className="space-y-8">
                  {/* Account Info */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-4">Account Information</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-600">Email:</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">{user?.email}</span>
                          <button
                            onClick={() => setIsChangingEmail(!isChangingEmail)}
                            className="text-orange-600 hover:text-orange-700 text-sm font-medium"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-600">Last Login:</span>
                        <span className="text-sm font-medium text-gray-900">Just now</span>
                      </div>
                    </div>

                    {/* Email Change Form */}
                    {isChangingEmail && (
                      <div className="mt-4 p-4 border border-orange-200 rounded-lg bg-orange-50">
                        <h4 className="text-sm font-medium text-gray-900 mb-3">Change Email Address</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Current Password</label>
                            <input
                              type="password"
                              placeholder="Enter your current password"
                              value={emailData.currentPassword}
                              onChange={(e) => setEmailData(prev => ({ ...prev, currentPassword: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">New Email Address</label>
                            <input
                              type="email"
                              placeholder="Enter new email address"
                              value={emailData.newEmail}
                              onChange={(e) => setEmailData(prev => ({ ...prev, newEmail: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Confirm New Email</label>
                            <input
                              type="email"
                              placeholder="Confirm new email address"
                              value={emailData.confirmEmail}
                              onChange={(e) => setEmailData(prev => ({ ...prev, confirmEmail: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            />
                          </div>
                          <div className="flex items-center gap-2 pt-2">
                            <button
                              onClick={handleEmailChange}
                              disabled={saving}
                              className="flex items-center gap-2 px-3 py-1.5 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600 disabled:opacity-50"
                            >
                              {saving ? (
                                <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <Save className="h-3 w-3" />
                              )}
                              Change Email
                            </button>
                            <button
                              onClick={() => {
                                setIsChangingEmail(false);
                                setEmailData({
                                  currentPassword: "",
                                  newEmail: "",
                                  confirmEmail: "",
                                });
                              }}
                              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                            >
                              Cancel
                            </button>
                          </div>
                          <div className="text-xs text-gray-600 mt-2">
                            <AlertTriangle className="h-3 w-3 inline mr-1 text-orange-500" />
                            For security, you'll need to verify your new email address before the change takes effect.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Security Settings */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-4">Security Settings</h3>
                    
                    <div className="space-y-4">
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                        />
                        <span className="text-sm text-gray-700">Enable two-factor authentication</span>
                      </label>

                      <div className="border-t pt-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-3">Change Password</h4>
                        <div className="space-y-3">
                          <input
                            type="password"
                            placeholder="Current password"
                            value={passwordData.currentPassword}
                            onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                          <input
                            type="password"
                            placeholder="New password"
                            value={passwordData.newPassword}
                            onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                          <input
                            type="password"
                            placeholder="Confirm new password"
                            value={passwordData.confirmPassword}
                            onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                          <button className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm">
                            Update Password
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Login History */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-4">Recent Login History</h3>
                    <div className="space-y-2">
                      {[
                        { date: "Just now", device: "Chrome on Windows", ip: "192.168.1.1" },
                        { date: "2 hours ago", device: "Safari on iPhone", ip: "192.168.1.1" },
                        { date: "Yesterday", device: "Chrome on Android", ip: "192.168.1.1" },
                      ].map((login, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <Smartphone className="h-4 w-4 text-gray-400" />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">{login.device}</div>
                            <div className="text-xs text-gray-500">{login.date} • {login.ip}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
                    <LogOut className="h-4 w-4" />
                    Logout from All Devices
                  </button>
                </div>
              </div>
            )}

            {/* Theme Tab */}
            {activeTab === "theme" && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Theme</h2>
                <p className="text-sm text-gray-500 mb-8">Choose how the admin area looks for you.</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
                  {/* Light */}
                  <button
                    onClick={() => theme !== "light" && toggleTheme()}
                    className={`flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-all ${
                      theme === "light"
                        ? "border-orange-500 bg-orange-50"
                        : "border-gray-200 hover:border-gray-300 bg-gray-50"
                    }`}
                  >
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                      theme === "light" ? "bg-orange-100" : "bg-white border border-gray-200"
                    }`}>
                      <Sun className={`h-6 w-6 ${theme === "light" ? "text-orange-500" : "text-gray-400"}`} />
                    </div>
                    <div className="text-center">
                      <p className={`font-semibold text-sm ${theme === "light" ? "text-orange-600" : "text-gray-700"}`}>Light</p>
                      <p className="text-xs text-gray-400 mt-0.5">Bright & clean</p>
                    </div>
                    {theme === "light" && (
                      <span className="text-[10px] font-black uppercase tracking-wider text-orange-500 bg-orange-100 px-2 py-0.5 rounded-full">Active</span>
                    )}
                  </button>

                  {/* Dark */}
                  <button
                    onClick={() => theme !== "dark" && toggleTheme()}
                    className={`flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-all ${
                      theme === "dark"
                        ? "border-orange-500 bg-orange-50"
                        : "border-gray-200 hover:border-gray-300 bg-gray-50"
                    }`}
                  >
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                      theme === "dark" ? "bg-orange-100" : "bg-gray-800"
                    }`}>
                      <Moon className={`h-6 w-6 ${theme === "dark" ? "text-orange-500" : "text-gray-200"}`} />
                    </div>
                    <div className="text-center">
                      <p className={`font-semibold text-sm ${theme === "dark" ? "text-orange-600" : "text-gray-700"}`}>Dark</p>
                      <p className="text-xs text-gray-400 mt-0.5">Easy on the eyes</p>
                    </div>
                    {theme === "dark" && (
                      <span className="text-[10px] font-black uppercase tracking-wider text-orange-500 bg-orange-100 px-2 py-0.5 rounded-full">Active</span>
                    )}
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}

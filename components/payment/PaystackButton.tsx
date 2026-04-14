"use client";

import { useState } from "react";
import { loadScript } from "@/lib/utils";
import { initializePayment } from "@/lib/paystack";
import { useAuth } from "@/hooks/useAuth";
import toast from "react-hot-toast";

interface PaystackButtonProps {
  amount: number;
  email: string;
  bookingId: string;
  providerId: string;
  providerName: string;
  customerName: string;
  serviceName: string;
  disabled?: boolean;
  className?: string;
}

const PaystackButton = ({
  amount,
  email,
  bookingId,
  providerId,
  providerName,
  customerName,
  serviceName,
  disabled = false,
  className = "",
}: PaystackButtonProps) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handlePayment = async () => {
    if (isLoading) return;

    // Check if user is authenticated
    if (!user) {
      toast.error("Please log in to make a payment");
      return;
    }

    setIsLoading(true);

    try {
      // Get authentication token
      const token = await user.getIdToken();

      // Call initialize API route with authentication
      const response = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          email,
          amount,
          metadata: {
            bookingId,
            customerId: user.uid,
            providerId,
            customerName,
            providerName,
            serviceName,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.code === "NO_SUBACCOUNT") {
          throw new Error("Payment temporarily unavailable for this provider. Please contact support.");
        } else if (result.code === "PROVIDER_NOT_FOUND") {
          throw new Error("Provider not found. Please contact support.");
        } else if (result.code === "PROVIDER_FETCH_ERROR") {
          throw new Error("Payment service temporarily unavailable. Please try again.");
        }
        throw new Error(result.error || "Failed to initialize payment");
      }

      // Redirect to Paystack payment page
      window.location.href = result.data.authorization_url;
    } catch (error) {
      console.error("Payment initialization error:", error);
      toast.error(
        error instanceof Error ? error.message : "Payment initialization failed"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handlePayment}
      disabled={disabled || isLoading}
      className={`w-full py-3 px-4 bg-gradient-to-r from-orange-400 to-orange-600 text-white font-medium rounded-lg hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 ${className}`}
    >
      {isLoading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
          <span>Initializing...</span>
        </>
      ) : (
        <>
          <span>Pay {formatNaira(amount)} Securely</span>
        </>
      )}
    </button>
  );
};

export default PaystackButton;

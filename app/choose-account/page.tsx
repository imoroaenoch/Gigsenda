"use client";

export const dynamic = 'force-dynamic';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Hammer, Users, Wrench, Check } from "lucide-react";
import { AccountType } from "@/types";

export default function ChooseAccountPage() {
  const [selected, setSelected] = useState<AccountType | null>(null);
  const router = useRouter();

  const handleContinue = () => {
    if (selected) {
      router.push(`/signup?type=${selected}`);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex flex-col">
      {/* Header */}
      <div className="text-center px-4 pt-4 pb-3">
        <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl mx-auto mb-2 flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
          </svg>
        </div>
        <h1 className="text-lg font-medium text-gray-900 mb-1">Join Gigsenda</h1>
        <p className="text-xs text-gray-600 max-w-md mx-auto leading-relaxed">
          How would you like to use our platform?
        </p>
      </div>

      {/* Account Type Cards */}
      <div className="flex-1 px-4 pb-4">
        <div className="max-w-md mx-auto space-y-3">
          {/* Customer Card */}
          <button
            onClick={() => setSelected("customer")}
            className={`w-full text-left p-3 rounded-xl transition-all duration-300 relative ${
              selected === "customer"
                ? "border-2 border-orange-600 bg-white text-gray-900 shadow-lg"
                : "bg-white text-gray-900 shadow-sm hover:border-yellow-500 hover:shadow-md border border-gray-200"
            }`}
          >
            <div className="flex items-center space-x-3">
              <div
                className={`rounded-lg p-2 transition-all duration-300 ${
                  selected === "customer" 
                    ? "bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-lg" 
                    : "bg-gradient-to-br from-blue-400 to-blue-600 text-white shadow-md group-hover:shadow-lg"
                }`}
              >
                <Search className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h2 className="text-base font-medium text-gray-900 mb-1">
                  I need a service
                </h2>
                <p className="text-xs text-gray-600 mb-1 leading-relaxed">
                  Find and book trusted local professionals for any task
                </p>
                <div className="flex items-center space-x-2">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    selected === "customer"
                      ? "bg-orange-200 text-orange-800"
                      : "bg-blue-100 text-blue-800"
                  }`}>
                    Customer
                  </span>
                  <div className="flex space-x-1">
                    <Users className="h-3 w-3 text-gray-400" />
                    <span className="text-[10px] text-gray-500">Most popular</span>
                  </div>
                </div>
              </div>
            </div>
            {/* Selection indicator */}
            {selected === "customer" && (
              <div className="absolute top-2 right-2">
                <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
                  <Check className="h-3 w-3 text-orange-500" />
                </div>
              </div>
            )}
          </button>

          {/* Provider Card */}
          <button
            onClick={() => setSelected("provider")}
            className={`w-full text-left p-3 rounded-xl transition-all duration-300 relative ${
              selected === "provider"
                ? "border-2 border-orange-600 bg-white text-gray-900 shadow-lg"
                : "bg-white text-gray-900 shadow-sm hover:border-yellow-500 hover:shadow-md border border-gray-200"
            }`}
          >
            <div className="flex items-center space-x-3">
              <div
                className={`rounded-lg p-2 transition-all duration-300 ${
                  selected === "provider" 
                    ? "bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-lg" 
                    : "bg-gradient-to-br from-green-400 to-green-600 text-white shadow-md group-hover:shadow-lg"
                }`}
              >
                <Wrench className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h2 className="text-base font-medium text-gray-900 mb-1">
                  I offer a service
                </h2>
                <p className="text-xs text-gray-600 mb-1 leading-relaxed">
                  List your skills, showcase your work, and get hired locally
                </p>
                <div className="flex items-center space-x-2">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    selected === "provider"
                      ? "bg-orange-200 text-orange-800"
                      : "bg-green-100 text-green-800"
                  }`}>
                    Provider
                  </span>
                  <div className="flex space-x-1">
                    <Hammer className="h-3 w-3 text-gray-400" />
                    <span className="text-[10px] text-gray-500">Earn money</span>
                  </div>
                </div>
              </div>
            </div>
            {/* Selection indicator */}
            {selected === "provider" && (
              <div className="absolute top-2 right-2">
                <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
                  <Check className="h-3 w-3 text-orange-500" />
                </div>
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Continue Button */}
      <div className="px-4 pb-8">
        <button
          onClick={handleContinue}
          disabled={!selected}
          className={`w-full max-w-md mx-auto block py-3 px-6 rounded-xl font-medium text-base transition-all duration-200 ${
            selected
              ? "bg-gradient-to-r from-orange-400 to-orange-600 text-white shadow-xl hover:shadow-2xl transform hover:scale-[1.02] active:scale-95"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          {selected ? `Continue as ${selected === "customer" ? "Customer" : "Provider"}` : "Choose an account type"}
        </button>
        
        {/* Helper text */}
        <p className="text-center mt-3 text-xs text-gray-500">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </main>
  );
}

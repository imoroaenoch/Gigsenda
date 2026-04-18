"use client";

import { useState } from "react";
import { 
  Settings, 
  CreditCard, 
  Percent, 
  Mail, 
  Palette, 
  Cog, 
  User,
  Moon,
  ChevronRight 
} from "lucide-react";

export interface TabItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const TABS: TabItem[] = [
  {
    id: "general",
    label: "General Settings",
    icon: Settings,
    description: "App name, description, support info"
  },
  {
    id: "payment",
    label: "Payment Settings",
    icon: CreditCard,
    description: "Paystack keys and payment configuration"
  },
  {
    id: "commission",
    label: "Commission Settings",
    icon: Percent,
    description: "Platform commission percentage"
  },
  {
    id: "email",
    label: "Email Settings",
    icon: Mail,
    description: "Email service and templates"
  },
  {
    id: "branding",
    label: "Brand & Logo",
    icon: Palette,
    description: "Logo, colors and visual identity"
  },
  {
    id: "configuration",
    label: "App Configuration",
    icon: Cog,
    description: "Categories, booking rules, provider settings"
  },
  {
    id: "admin",
    label: "Admin Account",
    icon: User,
    description: "Password, email, security settings"
  },
  {
    id: "theme",
    label: "Theme",
    icon: Moon,
    description: "Light or dark mode"
  },
];

interface SettingsTabsProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export default function SettingsTabs({ activeTab, onTabChange, className = "" }: SettingsTabsProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className={`bg-white border border-gray-200 rounded-xl shadow-sm ${className}`}>
      {/* Mobile Toggle */}
      <div className="lg:hidden p-4 border-b border-gray-200">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-between text-left"
        >
          <span className="font-medium text-gray-900">Settings Menu</span>
          <ChevronRight 
            className={`h-5 w-5 text-gray-400 transition-transform ${
              isCollapsed ? "rotate-90" : ""
            }`} 
          />
        </button>
      </div>

      {/* Tabs */}
      <div className={`${isCollapsed ? "hidden" : ""} lg:block`}>
        <div className="p-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => {
                  onTabChange(tab.id);
                  // Auto-collapse on mobile after selection
                  if (window.innerWidth < 1024) {
                    setIsCollapsed(true);
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                  isActive
                    ? "bg-orange-50 text-orange-600 border border-orange-200"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${
                  isActive ? "bg-orange-100" : "bg-gray-100"
                }`}>
                  <Icon className={`h-4 w-4 ${
                    isActive ? "text-orange-600" : "text-gray-500"
                  }`} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className={`font-medium text-sm ${
                    isActive ? "text-orange-600" : "text-gray-900"
                  }`}>
                    {tab.label}
                  </div>
                  <div className={`text-xs ${
                    isActive ? "text-orange-500" : "text-gray-500"
                  }`}>
                    {tab.description}
                  </div>
                </div>
                
                {isActive && (
                  <ChevronRight className="h-4 w-4 text-orange-400" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Export tabs for use in other components
export { TABS };

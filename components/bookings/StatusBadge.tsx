"use client";

import {
  getCustomerStatusLabel,
  getProviderStatusLabel,
  getStatusColor,
  getStatusIcon,
} from "@/lib/booking-status";

interface StatusBadgeProps {
  status: string;
  viewerType?: "customer" | "provider";
  size?: "sm" | "md";
}

export default function StatusBadge({ status, viewerType = "customer", size = "sm" }: StatusBadgeProps) {
  const label =
    viewerType === "provider"
      ? getProviderStatusLabel(status)
      : getCustomerStatusLabel(status);
  const color = getStatusColor(status);
  const icon  = getStatusIcon(status);

  const sizeClass = size === "md"
    ? "px-3 py-1.5 text-[11px] gap-1.5"
    : "px-2.5 py-1 text-[10px] gap-1";

  return (
    <span className={`inline-flex items-center font-black rounded-full ${sizeClass} ${color}`}>
      <span>{icon}</span>
      {label}
    </span>
  );
}

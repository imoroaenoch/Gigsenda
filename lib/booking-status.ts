// Single source of truth for all booking status labels, colors, and icons
// Rule: accepted = "Awaiting Payment" | paid = "Payment Confirmed / Ready to Start"
// Never use: "Confirmed", "Approved", "Done"

// Legacy status aliases
export const LEGACY_STATUS_MAP: Record<string, string> = {
  upcoming:        "paid",
  confirmed:       "paid",
  pending_payment: "accepted",
};

export function normaliseStatus(raw: string): string {
  if (!raw) return "pending";
  return LEGACY_STATUS_MAP[raw] ?? raw;
}

export const CUSTOMER_STATUS_LABELS: Record<string, string> = {
  pending:     "⏳ Waiting for Provider",
  accepted:    "🟡 Awaiting Payment",
  paid:        "🟢 Payment Confirmed",
  in_progress: "🔵 In Progress",
  completed:   "✅ Completed",
  rejected:    "❌ Declined",
  cancelled:   "⚫ Cancelled",
  disputed:    "⚠️ Under Review",
  refunded:    "↩️ Refunded",
};

export const PROVIDER_STATUS_LABELS: Record<string, string> = {
  pending:     "New Request",
  accepted:    "Awaiting Payment",
  paid:        "Ready to Start",
  in_progress: "In Progress",
  completed:   "Completed",
  rejected:    "Declined",
  cancelled:   "Cancelled",
  disputed:    "Under Review",
  refunded:    "Refunded",
};

// Status banner messages — shown on the booking detail page
export const CUSTOMER_STATUS_MESSAGES: Record<string, string> = {
  pending:     "Waiting for provider to review your request",
  accepted:    "Provider accepted. Complete payment to proceed",
  paid:        "Payment confirmed. Provider will begin shortly",
  in_progress: "Service is currently in progress",
  completed:   "This booking has been completed",
  rejected:    "Provider declined this request",
  cancelled:   "This booking was cancelled",
  disputed:    "A dispute has been raised. Admin is reviewing",
  refunded:    "Payment has been refunded",
};

export const PROVIDER_STATUS_MESSAGES: Record<string, string> = {
  pending:     "New booking request",
  accepted:    "Waiting for customer payment",
  paid:        "Payment received. Ready to start",
  in_progress: "You are currently working on this job",
  completed:   "Job completed",
  rejected:    "You declined this request",
  cancelled:   "Booking cancelled",
  disputed:    "A dispute has been raised. Admin is reviewing",
  refunded:    "Payment has been refunded",
};

export const STATUS_COLORS: Record<string, string> = {
  pending:     "bg-yellow-50 text-yellow-700 border border-yellow-100",
  accepted:    "bg-blue-50 text-blue-700 border border-blue-100",
  paid:        "bg-green-50 text-green-700 border border-green-100",
  in_progress: "bg-orange-50 text-orange-700 border border-orange-100",
  completed:   "bg-green-500 text-white border border-green-500",
  cancelled:   "bg-gray-100 text-gray-600 border border-gray-200",
  rejected:    "bg-red-50 text-red-600 border border-red-100",
  disputed:    "bg-purple-50 text-purple-700 border border-purple-100",
  refunded:    "bg-gray-50 text-gray-600 border border-gray-100",
};

export const STATUS_ICONS: Record<string, string> = {
  pending:     "⏳",
  accepted:    "�",
  paid:        "🟢",
  in_progress: "�",
  completed:   "✅",
  cancelled:   "⚫",
  rejected:    "❌",
  disputed:    "⚠️",
  refunded:    "↩️",
};

export const getCustomerStatusLabel = (status: string): string =>
  CUSTOMER_STATUS_LABELS[normaliseStatus(status)] ?? status;

export const getProviderStatusLabel = (status: string): string =>
  PROVIDER_STATUS_LABELS[normaliseStatus(status)] ?? status;

export const getCustomerStatusMessage = (status: string): string =>
  CUSTOMER_STATUS_MESSAGES[normaliseStatus(status)] ?? "";

export const getProviderStatusMessage = (status: string): string =>
  PROVIDER_STATUS_MESSAGES[normaliseStatus(status)] ?? "";

export const getStatusColor = (status: string): string =>
  STATUS_COLORS[normaliseStatus(status)] ?? "bg-gray-50 text-gray-600 border border-gray-100";

export const getStatusIcon = (status: string): string =>
  STATUS_ICONS[normaliseStatus(status)] ?? "📋";

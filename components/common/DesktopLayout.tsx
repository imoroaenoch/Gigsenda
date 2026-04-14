"use client";

import DesktopSidebar from "./DesktopSidebar";

interface Props {
  children: React.ReactNode;
}

/**
 * Wraps page content with a desktop sidebar on lg+ screens.
 * On mobile, renders children only (sidebar is hidden via `hidden lg:flex`).
 */
export default function DesktopLayout({ children }: Props) {
  return (
    <div className="lg:flex lg:min-h-screen">
      <DesktopSidebar />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

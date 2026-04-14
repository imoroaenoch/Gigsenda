import DesktopSidebar from "@/components/common/DesktopSidebar";

export default function ProviderLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="lg:flex lg:min-h-screen">
      <DesktopSidebar />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

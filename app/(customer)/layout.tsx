import DesktopSidebar from "@/components/layout/DesktopSidebar";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DesktopSidebar />
      {/* On desktop, push content right by exact sidebar width. No extra margin/centering. */}
      <div className="lg:ml-[260px]">{children}</div>
    </>
  );
}

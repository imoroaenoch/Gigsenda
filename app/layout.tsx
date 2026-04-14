import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "Gigsenda - Local Services Marketplace",
  description: "Connect with trusted local service providers in Nigeria.",
  themeColor: "#ffffff",
  viewport: {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans bg-white text-text">
        {children}
        <Toaster position="bottom-center" />
      </body>
    </html>
  );
}

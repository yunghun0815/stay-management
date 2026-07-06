import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/lib/providers/query-provider";
import { DialogProvider } from "@/components/providers/dialog-provider";
import { Toaster } from "@/components/ui/sonner";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Stay Management",
  description: "개인용 숙소/예약/가계부 관리 플랫폼",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Stay Management",
  },
};

export const viewport: Viewport = {
  themeColor: "#3182f6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${geistMono.variable} antialiased`}>
      <body className="min-h-dvh flex flex-col">
        <QueryProvider>
          <DialogProvider>
            {children}
            <Toaster />
          </DialogProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

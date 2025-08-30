import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/src/components/layout/sidebar";
import { Toaster } from "@/src/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Családi Költségvetés",
  description: "Egyszerű családi költségvetés kezelő alkalmazás",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="hu">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="min-h-screen flex flex-col lg:flex-row">
          <Sidebar />
          <main className="flex-1 w-full pt-16 lg:pt-0 lg:ml-0 overflow-x-hidden">{children}</main>
        </div>
        <Toaster />
      </body>
    </html>
  );
}

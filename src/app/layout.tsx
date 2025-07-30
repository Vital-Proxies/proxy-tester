import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/styles/globals.css";
import Header from "@/components/navigation/header";
import { Toaster } from "@/components/ui/sonner";
import ServerHealthIndicator from "@/components/server-health-indicator";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vital Proxy Tester",
  description: "A simple proxy tester by Vital Proxies",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="bg-gradient-to-b from-accent/40 to-background min-h-screen text-text-primary">
          <div className="mx-auto min-h-screen max-w-7xl pt-8 px-8 pb-20">
            <div className="w-full flex flex-row items-center justify-between mx-auto">
              <Header />
            </div>

            <Toaster position="bottom-center" richColors duration={4000} />
            <ServerHealthIndicator />
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}

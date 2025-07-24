import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/styles/globals.css";
import Header from "@/components/header";
import UpdateChecker from "@/components/update-checker";

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

            <div className="mt-6 flex w-full flex-col ">
              <div className="w-full flex justify-end">
                <UpdateChecker />
              </div>
              {children}
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}

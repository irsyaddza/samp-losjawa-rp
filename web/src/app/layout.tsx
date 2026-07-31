import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Los Jawa Roleplay - Portal UCP & Server Info",
  description: "Portal resmi User Control Panel (UCP) dan Website Utama Los Jawa Roleplay SA-MP Server.",
  keywords: "samp, gta sa, roleplay, los jawa rp, indonesian roleplay, sa-mp server, ucp samp",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-[#09090b] text-[#fafafa] antialiased flex flex-col font-sans selection:bg-amber-500 selection:text-black`}
      >
        {children}
      </body>
    </html>
  );
}

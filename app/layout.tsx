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
  metadataBase: new URL("https://fleetora.site"),
  title: {
    default: "Fleetora — Transport operations, under control",
    template: "%s · Fleetora",
  },
  description:
    "A premium transport management system for fleet, trip, finance, fuel, maintenance, and compliance operations.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "Fleetora — Transport operations, under control",
    description:
      "Run dispatch, fleet health, cash flow, and compliance from one calm command center.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fleetora — Transport operations, under control",
    description:
      "Run dispatch, fleet health, cash flow, and compliance from one calm command center.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

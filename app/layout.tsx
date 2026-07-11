import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
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
      <body className="antialiased">{children}</body>
    </html>
  );
}

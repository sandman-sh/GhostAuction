import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import Navbar from "@/components/layout/Navbar";
import DevnetBanner from "@/components/layout/DevnetBanner";

export const metadata: Metadata = {
  title: "GhostAuction — Private NFT Auctions on Solana",
  description: "Sealed-bid NFT auctions with invisible bids and fair outcomes. Built on Solana Devnet.",
  keywords: ["Solana", "NFT", "Auction", "Privacy", "Sealed Bid", "Devnet"],
  openGraph: {
    title: "GhostAuction",
    description: "Private NFT Auctions on Solana. Invisible bids. Fair outcomes.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light" className="" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] antialiased" suppressHydrationWarning>
        <Providers>
          <DevnetBanner />
          <Navbar />
          <main className="min-h-[calc(100vh-64px)]">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}

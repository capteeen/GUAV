import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DM_Sans, IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import { GroveProvider } from "@/components/grove-provider";
import { Providers } from "@/components/providers";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const sans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });
const display = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display" });

export const metadata: Metadata = {
  title: "Guava — Ripe launches. Fresh pairs.",
  description: "Guava is a Solana devnet launchpad. Ripe launches. Fresh pairs.",
  openGraph: {
    title: "Guava",
    description: "Ripe launches. Fresh pairs.",
    siteName: "Guava",
    url: "https://gua.fun",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${mono.variable} ${display.variable} font-sans antialiased`}>
        <Providers>
          <GroveProvider>
            <SiteHeader />
            <main>{children}</main>
            <SiteFooter />
          </GroveProvider>
        </Providers>
      </body>
    </html>
  );
}

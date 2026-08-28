import type { Metadata } from "next";
import { Geist_Mono, Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "Chopra Capital - We Don't Predict Gold, We Arbitrage It",
    template: "%s - Chopra Capital",
  },
  description:
    "Automated gold trading with human oversight, clear investor reporting, and simple account access. Capital at risk.",
  openGraph: {
    title: "Chopra Capital - We Don't Predict Gold, We Arbitrage It",
    description: "Automated gold trading with human oversight.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Chopra Capital - We Don't Predict Gold, We Arbitrage It" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Chopra Capital - We Don't Predict Gold, We Arbitrage It",
    description: "Automated gold trading with human oversight.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${montserrat.variable} ${geistMono.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
    >
      <body className="min-h-full flex flex-col bg-vault-950 text-ink">{children}</body>
    </html>
  );
}

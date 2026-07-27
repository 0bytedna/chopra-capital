import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "Chopra Capital — Managed Gold Trading · Dubai",
    template: "%s · Chopra Capital",
  },
  description:
    "A Dubai-based managed gold trading operation using automated execution, human oversight and investor-level accounting. Capital at risk.",
  openGraph: {
    title: "Chopra Capital — Intelligent execution. Human accountability.",
    description: "Managed gold trading · Dubai",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Chopra Capital — Intelligent execution. Human accountability." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Chopra Capital — Intelligent execution. Human accountability.",
    description: "Managed gold trading · Dubai",
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
      className={`${fraunces.variable} ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
    >
      <body className="min-h-full flex flex-col bg-vault-950 text-ink">{children}</body>
    </html>
  );
}

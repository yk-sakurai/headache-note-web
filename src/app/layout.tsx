import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import AnalyticsInit from "@/components/AnalyticsInit";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "頭痛ノート",
  description: "あなたの頭痛をより深く理解する",
  openGraph: {
    title: "頭痛ノート",
    description: "あなたの頭痛をより深く理解する",
    type: "website",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
    title: "頭痛ノート",
    description: "あなたの頭痛をより深く理解する",
  },
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
        <Header />
        <AnalyticsInit />
        {children}
      </body>
    </html>
  );
}

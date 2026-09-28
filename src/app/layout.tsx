import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import AnalyticsInit from "@/components/AnalyticsInit";
import SuggestionNavigationProvider from "@/components/SuggestionNavigationProvider";

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
  description: "頭痛の強さ、薬、メモをまとめて記録し、必要なときに落ち着いて振り返れる頭痛記録アプリです。",
  openGraph: {
    title: "頭痛ノート",
    description: "頭痛の強さ、薬、メモをまとめて記録し、必要なときに落ち着いて振り返れる頭痛記録アプリです。",
    type: "website",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
    title: "頭痛ノート",
    description: "頭痛の強さ、薬、メモをまとめて記録し、必要なときに落ち着いて振り返れる頭痛記録アプリです。",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SuggestionNavigationProvider>
          <Header />
          <AnalyticsInit />
          {children}
        </SuggestionNavigationProvider>
      </body>
    </html>
  );
}

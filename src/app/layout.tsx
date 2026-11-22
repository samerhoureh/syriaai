import type { Metadata, Viewport } from "next";
import { Cairo, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/syria/providers";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "SYRIA AI — منصة النماذج الذكية السورية المستقلة",
    template: "%s | SYRIA AI",
  },
  description:
    "منصة تطوير وتدريب وإدارة نماذج الذكاء الاصطناعي السورية المستقلة — نماذج أساس مفتوحة المصدر تُدرّب من الصفر، مع محرك بيانات وتدريب واستدلال خاص بالمشروع.",
  keywords: [
    "SYRIA AI",
    "الذكاء الاصطناعي السوري",
    "foundation model",
    "open source AI",
    "Arabic AI",
    "السورية للذكاء الاصطناعي",
  ],
  authors: [{ name: "Syrian Artificial Intelligence — السورية للذكاء الاصطناعي" }],
  metadataBase: new URL("https://www.syriaai.org"),
  icons: { icon: "/syria-logo.svg" },
  openGraph: {
    title: "SYRIA AI — Syrian Artificial Intelligence",
    description:
      "Independent, open-source Syrian foundation models. Trained from scratch on our own data engine, training and inference stack.",
    url: "https://www.syriaai.org",
    siteName: "SYRIA AI",
    type: "website",
    locale: "ar_SY",
    alternateLocale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "SYRIA AI — Syrian Artificial Intelligence",
    description: "Independent open-source Syrian foundation models.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#04100a" },
    { media: "(prefers-color-scheme: light)", color: "#f2f6f3" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body
        className={`${cairo.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}

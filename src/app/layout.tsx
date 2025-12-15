import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const siteConfig = {
  name: "Bloxr",
  description: "Den moderna projektportalen för byggprojekt. Samla dokument, ritningar och avvikelser på ett ställe med AI-assistans.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://bloxr.se",
  ogImage: "/opengraph-image.png",
  twitterHandle: "@bloxr_se",
  locale: "sv_SE",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} - Bygg smartare`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    "byggprojekt",
    "projektportal",
    "dokumenthantering",
    "ritningar",
    "avvikelser",
    "checklistor",
    "byggbransch",
    "AI",
    "digitalisering",
    "byggdokumentation",
    "egenkontroll",
    "protokoll",
    "byggprojektledning",
    "BIM",
    "byggritningar",
    "kvalitetskontroll",
  ],
  authors: [{ name: "Bloxr", url: siteConfig.url }],
  creator: "Bloxr",
  publisher: "Bloxr",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: `${siteConfig.name} - Bygg smartare`,
    description: siteConfig.description,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: "Bloxr - Den moderna projektportalen för byggprojekt",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} - Bygg smartare`,
    description: siteConfig.description,
    images: ["/twitter-image.png"],
    creator: siteConfig.twitterHandle,
    site: siteConfig.twitterHandle,
  },
  alternates: {
    canonical: siteConfig.url,
    languages: {
      "sv-SE": siteConfig.url,
    },
  },
  category: "technology",
  classification: "Business Software",
  applicationName: "Bloxr",
  referrer: "origin-when-cross-origin",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sv" className={inter.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
      </head>
      <body className={`${inter.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}

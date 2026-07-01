import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import ConnectionStatus from "../components/ConnectionStatus";
import GoogleAnalytics from "../components/GoogleAnalytics";

const geistSans = {
  variable: "font-sans",
};

const geistMono = {
  variable: "font-mono",
};

const APP_URL = "https://www.nexochat.in";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "Nexo Chat — Real-Time Team Messaging & Video Calls | NexoZone",
    template: "%s | Nexo Chat",
  },
  description:
    "Nexo Chat is a professional real-time messaging and WebRTC video calling platform for teams at NexoZone. Chat in channels, share files, and collaborate with crystal-clear video — all in one place.",
  keywords: [
    "Nexo Chat",
    "NexoZone",
    "team messaging",
    "real-time chat",
    "WebRTC video call",
    "group channels",
    "direct messages",
    "file sharing",
    "team collaboration",
    "workplace chat app",
    "Slack alternative",
    "Google Chat alternative",
  ],
  authors: [{ name: "NexoZone", url: APP_URL }],
  creator: "NexoZone",
  publisher: "NexoZone",
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
  openGraph: {
    type: "website",
    locale: "en_US",
    url: APP_URL,
    siteName: "Nexo Chat",
    title: "Nexo Chat — Real-Time Team Messaging & Video Calls",
    description:
      "Connect, collaborate, and create on Nexo Chat. Instant messaging channels, WebRTC video calls, and seamless file sharing for modern teams.",
    images: [
      {
        url: `${APP_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "Nexo Chat — Real-Time Team Messaging & Video Calls",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@nexozone",
    creator: "@nexozone",
    title: "Nexo Chat — Real-Time Team Messaging & Video Calls",
    description:
      "Connect, collaborate, and create on Nexo Chat. Instant messaging channels, WebRTC video calls, and seamless file sharing for modern teams.",
    images: [`${APP_URL}/og-image.png`],
  },
  alternates: {
    canonical: APP_URL,
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "NexoChat",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/logo-icon.png",
    apple: "/logo-touch-icon.png",
  },
};

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Google Analytics GA4 — only loads when NEXT_PUBLIC_GA_ID is set */}
        {GA_ID && GA_ID !== "G-XXXXXXXXXX" && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}', {
                  page_path: window.location.pathname,
                });
              `}
            </Script>
          </>
        )}
      </head>
      <body className="min-h-full flex flex-col">
        <ConnectionStatus />
        <GoogleAnalytics />
        {children}
      </body>
    </html>
  );
}

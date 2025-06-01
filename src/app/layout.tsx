import { AuthProvider } from '@/contexts/AuthContext';
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: "TinyToken - LLM Token Compression API",
    template: "%s | TinyToken"
  },
  description: "Reduce LLM API costs by 40-50% with intelligent text compression. Compress conversation histories and prompts while preserving context quality. Built for developers shipping AI products.",
  keywords: [
    "LLM",
    "token compression",
    "AI API",
    "prompt compression",
    "OpenAI",
    "ChatGPT",
    "cost reduction",
    "API optimization",
    "text compression",
    "conversation history"
  ],
  authors: [{ name: "TinyToken" }],
  creator: "TinyToken",
  publisher: "TinyToken",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NODE_ENV === 'production' ? 'https://api.tinytoken.org' : 'http://localhost:3000'),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "TinyToken - LLM Token Compression API",
    description: "Reduce LLM API costs by 40-50% with intelligent text compression. Compress conversation histories and prompts while preserving context quality.",
    siteName: "TinyToken",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "TinyToken - LLM Token Compression API",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TinyToken - LLM Token Compression API",
    description: "Reduce LLM API costs by 40-50% with intelligent text compression. Built for developers shipping AI products.",
    images: ["/og-image.png"],
    creator: "@tinytoken",
  },
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
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      { url: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ],
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

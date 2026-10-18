import type { Metadata } from "next";
import {
  greatVibes,
  notoSerifDevanagari,
  playfairDisplay,
  seaweedScript,
} from "./fonts";
import "./globals.css";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.URL ??
  "https://shubham-harshi-wedding-invitation.netlify.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Shubham & Harshi — Wedding Invitation",
  description:
    "With love and joy, we invite you to celebrate the wedding of Shubham & Harshi on 21 November 2026.",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.png",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Shubham & Harshi Wedding Invitation",
    title: "Shubham & Harshi — Wedding Invitation",
    description:
      "With love and joy, we invite you to celebrate the wedding of Shubham & Harshi on 21 November 2026.",
    images: [
      {
        url: "/og-image.webp",
        width: 1200,
        height: 630,
        alt: "Shubham and Harshi's wedding invitation for 21 November 2026",
        type: "image/webp",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Shubham & Harshi — Wedding Invitation",
    description:
      "With love and joy, we invite you to celebrate the wedding of Shubham & Harshi on 21 November 2026.",
    images: [
      {
        url: "/og-image.webp",
        alt: "Shubham and Harshi's wedding invitation for 21 November 2026",
      },
    ],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${greatVibes.variable} ${notoSerifDevanagari.variable} ${playfairDisplay.variable} ${seaweedScript.variable} h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+Devanagari:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <link
          rel="preload"
          href="/assets/audio/shankh-sound.mp3"
          as="audio"
          type="audio/mpeg"
        />
        <link
          rel="preload"
          href="/assets/audio/navkar-mantra.mp3"
          as="audio"
          type="audio/mpeg"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

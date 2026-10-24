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

/** Bump when replacing public/og-image.png (then run scripts/optimize-og-image.py). */
const OG_IMAGE_VERSION = "20261022";
const OG_IMAGE_WIDTH = 1200;
const OG_IMAGE_HEIGHT = 540;
const OG_IMAGE_PATH = `/og-image.webp?v=${OG_IMAGE_VERSION}`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Shubham & Harshi · Wedding Invitation",
  description:
    "You're warmly invited to celebrate with us — 21 November 2026. #shushi",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Shubham & Harshi",
    title: "Shubham & Harshi · Wedding Invitation",
    description:
      "You're warmly invited to celebrate with us — 21 November 2026. #shushi",
    images: [
      {
        url: OG_IMAGE_PATH,
        width: OG_IMAGE_WIDTH,
        height: OG_IMAGE_HEIGHT,
        alt: "Shubham and Harshi's wedding invitation for 21 November 2026",
        type: "image/webp",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Shubham & Harshi · Wedding Invitation",
    description:
      "You're warmly invited to celebrate with us — 21 November 2026. #shushi",
    images: [
      {
        url: OG_IMAGE_PATH,
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

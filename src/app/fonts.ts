import localFont from "next/font/local";

export const greatVibes = localFont({
  src: "../fonts/GreatVibes-Regular.ttf",
  variable: "--font-great-vibes",
  weight: "400",
  display: "swap",
});

export const seaweedScript = localFont({
  src: "../fonts/SeaweedScript-Regular.ttf",
  variable: "--font-seaweed-script",
  weight: "400",
  display: "swap",
});

export const playfairDisplay = localFont({
  src: [
    {
      path: "../fonts/PlayfairDisplay-Variable.ttf",
      weight: "400 700",
      style: "normal",
    },
    {
      path: "../fonts/PlayfairDisplay-Italic-Variable.ttf",
      weight: "400 700",
      style: "italic",
    },
  ],
  variable: "--font-playfair-display",
  display: "swap",
});

export const notoSerifDevanagari = localFont({
  src: "../fonts/NotoSerifDevanagari-Variable.ttf",
  variable: "--font-noto-serif-devanagari",
  weight: "400 600",
  display: "swap",
});

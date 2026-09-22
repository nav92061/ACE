import type { Metadata, Viewport } from "next";
import { Press_Start_2P, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const pixel = Press_Start_2P({
  variable: "--font-ace-pixel",
  subsets: ["latin"],
  weight: ["400"],
});

const sans = Source_Sans_3({
  variable: "--font-ace-sans",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "ACE — Subject Speed Practice",
  description: "Timed classroom practice with weekly leaderboards.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${pixel.variable} ${sans.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

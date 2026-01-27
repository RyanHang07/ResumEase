import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemedClerkProvider } from "@/components/providers/ThemedClerkProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ResumEase - Simple Latex-Based Resume Editor",
  description: "Build professional resumes with LaTeX quality, zero LaTeX knowledge required",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ThemedClerkProvider>
      <html lang="en" className="dark">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          {children}
        </body>
      </html>
    </ThemedClerkProvider>
  );
}

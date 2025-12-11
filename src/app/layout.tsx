import type { Metadata } from "next";
import {JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jetBrainMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"]
})

export const metadata: Metadata = {
  title: "PrivateChat — Encrypted & Self-Destructing Chat Rooms",
  description:
    "Create secure, anonymous, and self-destructing chat rooms instantly. No sign-up required. PrivateChat generates a unique anonymous identity and ensures messages auto-delete for maximum privacy.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${jetBrainMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

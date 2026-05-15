import type { Metadata } from "next";
import { DM_Sans, Syne } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
});

export const metadata: Metadata = {
  title: "Connex CRM - Gestão de Marketing Digital",
  description: "CRM completo para agências de marketing digital",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/escuro.jpeg",
        type: "image/jpeg",
      },
    ],
    apple: "/escuro.jpeg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark bg-background">
      <body
        className={`${dmSans.variable} ${syne.variable} font-sans antialiased`}
      >
        {children}
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  );
}

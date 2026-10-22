import type { Metadata, Viewport } from "next";

import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";

import { Toaster } from "sonner";

import Footer from "./_components/footer";

import AuthProvider from "./_provider/auth";

import PushNotifications from "./_components/push-notifications";

const geistSans = Geist({
  variable: "--font-sans",
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "SpaçoVip Barbearia",
  description: "Agende seu horário na SpaçoVip Barbearia",

  manifest: "/manifest.json",

  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },

  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SpaçoVip",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="flex min-h-full justify-center">
        <PushNotifications />
        <main className="w-full max-w-5xl">
          <AuthProvider>
            {children}
            <Toaster />
            <Footer />
          </AuthProvider>
        </main>
      </body>
    </html>
  );
}

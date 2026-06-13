import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "AquaFlow — Water Delivery Management",
  description: "Manage your water delivery business — inventory, orders, POS and deliveries.",
  manifest: "/manifest.json",
  icons: {
    icon:     [
      { url: "/icons/icon-96x96.png",   sizes: "96x96",   type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/icons/icon-192x192.png",
    apple:    "/icons/icon-192x192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AquaFlow",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f4c81",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { borderRadius: "10px", fontSize: "14px" },
          }}
        />
      </body>
    </html>
  );
}

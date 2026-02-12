import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import NavigationWrapper from "@/components/NavigationWrapper";
import { UserProvider } from "@/contexts/UserContext";
import "./globals.css";

const defaultUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
  (typeof process.env.WEBSITE_HOSTNAME !== "undefined"
    ? `https://${process.env.WEBSITE_HOSTNAME}`
    : null) ||
  "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "EMC Sales Cockpit",
  description: "EMC Sales Cockpit",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased`}>
        <UserProvider>
          <div className="app-container">
            <NavigationWrapper />
            <main className="main-content">
              {children}
            </main>
          </div>
        </UserProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AssetProvider } from "@/context/AssetContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Microstock Auto-Pilot",
  description: "Automate your microstock vector workflow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} flex min-h-screen antialiased selection:bg-primary/30`} suppressHydrationWarning>
        <ThemeProvider attribute="data-theme" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <AssetProvider>
            <Sidebar />
            <main className="flex-1 flex flex-col h-screen overflow-hidden bg-background">
              <div className="flex-1 overflow-y-auto p-8">
                {children}
              </div>
            </main>
          </AssetProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

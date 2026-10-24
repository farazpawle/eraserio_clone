import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "./_context/ThemeContext";
import { KeyboardShortcutsProvider } from "./_context/KeyboardShortcutsContext";
import ExportProvider from "./_context/ExportContext";
import { BRAND_NAME } from "@/lib/brand";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: BRAND_NAME,
  description: "Diagrams and docs that redraw themselves as you type.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} ${inter.className}`}>
        <ThemeProvider>
          <KeyboardShortcutsProvider>
            <ExportProvider>
              {children}
              <Toaster />
            </ExportProvider>
          </KeyboardShortcutsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

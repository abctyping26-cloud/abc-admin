import type { Metadata } from "next";
import AuthToast from "./components/AuthToast";
import AOSInit from "./components/AosInit";
import ServerWarmer from "./components/ServerWarmer";
import "aos/dist/aos.css";
import "./globals.css";

import { ThemeProvider } from "./context/ThemeContext";

export const metadata: Metadata = {
  title: "ABC Typing Admin",
  description: "Admin Portal for ABC Typing Services",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-white text-[#0f172a] antialiased">
        <ThemeProvider>
          <ServerWarmer />
          <AOSInit />
          <AuthToast />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}


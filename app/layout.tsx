import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body className="min-h-screen bg-white text-[#0f172a] antialiased">
        {children}
      </body>
    </html>
  );
}


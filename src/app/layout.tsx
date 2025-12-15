import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bloxr - Bygg smartare",
  description: "Den moderna projektportalen för byggprojekt. Enkel, användarvänlig och prisvärd.",
  icons: {
    icon: '/bloxr-icon.png',
    apple: '/bloxr-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sv">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

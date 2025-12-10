import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dalux2 - Projektportal",
  description: "En modern projektportal för byggprojekt",
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

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Earnings Call Player",
  description:
    "Play earnings call recordings alongside investor presentations, powered by Notion.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
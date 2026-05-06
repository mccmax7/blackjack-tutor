import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Blackjack Tutor",
  description:
    "Practice blackjack for free with on-demand basic-strategy advice.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}

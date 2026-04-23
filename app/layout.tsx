import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VO Studio",
  description: "Personal VO generator for YouTube scripts",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

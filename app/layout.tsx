import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "My QR Manager",
  description: "Create and manage dynamic QR codes from one dashboard."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

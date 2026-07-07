import type { Metadata } from "next";
import { Playfair_Display, Manrope } from "next/font/google";
import { CartProvider } from "@/components/cart/CartProvider";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Outfit Lounge — Menswear, Redefined",
  description:
    "Rent or own the finest tuxedos, suits and accessories — curated for every occasion.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-ink text-text-dark">
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}

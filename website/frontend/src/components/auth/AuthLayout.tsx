import Link from "next/link";
import { ReactNode } from "react";

function ImagePanel({ quote }: { quote: string }) {
  return (
    <div
      className="relative flex items-center justify-center overflow-hidden bg-ink"
      style={{ minHeight: "50vh" }}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "repeating-linear-gradient(100deg, #14110d 0px, #14110d 60px, #181410 60px, #181410 120px)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 700px 700px at 50% 40%, rgba(217,176,84,0.18), transparent 65%)",
        }}
      />
      <div className="relative px-10 py-14 text-center">
        <Link href="/" className="font-serif text-3xl tracking-wide text-cream-soft">
          OUTFIT <span className="text-gold">LOUNGE</span>
        </Link>
        <div className="mt-7 max-w-95 font-serif text-2xl text-cream-dim italic">{quote}</div>
      </div>
    </div>
  );
}

export function AuthLayout({
  quote,
  imageFirst = true,
  children,
}: {
  quote: string;
  imageFirst?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-2">
      {imageFirst && <ImagePanel quote={quote} />}
      <div className="flex items-center justify-center bg-white px-6 py-14 sm:px-10">
        <div className="w-full max-w-100">{children}</div>
      </div>
      {!imageFirst && <ImagePanel quote={quote} />}
    </div>
  );
}

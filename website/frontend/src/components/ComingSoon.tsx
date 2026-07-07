import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";

export function ComingSoon({ title, blurb }: { title: string; blurb: string }) {
  return (
    <div className="flex min-h-screen flex-col bg-ink">
      <SiteNav />
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-32 text-center">
        <div className="text-[13px] tracking-[5px] text-gold">COMING SOON</div>
        <div className="mt-4 font-serif text-4xl text-cream sm:text-5xl">{title}</div>
        <div className="mt-4 max-w-md text-[15px] text-cream-dim">{blurb}</div>
      </div>
      <SiteFooter />
    </div>
  );
}

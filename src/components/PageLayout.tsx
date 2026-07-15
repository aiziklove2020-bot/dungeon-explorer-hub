import type { ReactNode } from "react";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { RssTicker } from "./RssTicker";
import { BannerStrip } from "./BannerStrip";
import { SitePopup } from "./SitePopup";

export function PageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Stops iOS/mobile rubber-band overscroll past the page's real bottom.
          This rule kept disappearing when placed in the global index.css
          (Tailwind's build was dropping it for reasons never fully pinned
          down), so it's inlined here where it's guaranteed to ship. */}
      <style>{`html, body { overscroll-behavior-y: none; }`}</style>
      <SiteHeader />
      <RssTicker />
      <main className="flex-1">{children}</main>
      <BannerStrip />
      <SiteFooter />
      <SitePopup />
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <section className="border-b border-border bg-secondary/30 py-16 text-center">
      <div className="mx-auto max-w-3xl px-4">
        <div className="mb-3 flex items-center justify-center gap-4">
          <span className="h-px w-12 bg-gold/60" />
          <h1 className="section-title text-4xl md:text-5xl">{title}</h1>
          <span className="h-px w-12 bg-gold/60" />
        </div>
        {subtitle && (
          <p className="text-lg text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </section>
  );
}

import type { ReactNode } from "react";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { RssTicker } from "./RssTicker";
import { BannerStrip } from "./BannerStrip";
import { SitePopup } from "./SitePopup";

export function PageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
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

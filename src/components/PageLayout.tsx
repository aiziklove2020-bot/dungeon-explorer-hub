import type { ReactNode } from "react";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";

export function PageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
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

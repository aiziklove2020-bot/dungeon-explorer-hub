import { useEffect, type ReactNode } from "react";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { RssTicker } from "./RssTicker";
import { BannerStrip } from "./BannerStrip";
import { SitePopup } from "./SitePopup";

/**
 * Belt-and-suspenders rubber-band blocker. `overscroll-behavior` (set below)
 * doesn't stop the bounce on older Safari/iOS versions (only supported since
 * iOS 16) — this actively cancels the touch scroll the instant it would pull
 * the page past its real top or bottom edge, so it works everywhere.
 */
function useBlockOverscroll() {
  useEffect(() => {
    let startY = 0;

    const onTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      // Don't interfere with scrolling inside nested scrollable areas (modals,
      // the mobile menu drawer, chat message lists, etc.) — only guard the
      // outer page scroll itself.
      let el = e.target as HTMLElement | null;
      while (el && el !== document.body) {
        const style = getComputedStyle(el);
        const scrollable = style.overflowY === "auto" || style.overflowY === "scroll";
        if (scrollable && el.scrollHeight > el.clientHeight) return;
        el = el.parentElement;
      }

      const doc = document.documentElement;
      const atTop = doc.scrollTop <= 0;
      const atBottom = doc.scrollTop + window.innerHeight >= doc.scrollHeight;
      const movingDown = e.touches[0].clientY > startY; // finger moving down = page scrolling up
      if ((atTop && movingDown) || (atBottom && !movingDown)) {
        e.preventDefault();
      }
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
    };
  }, []);
}

export function PageLayout({ children }: { children: ReactNode }) {
  useBlockOverscroll();
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

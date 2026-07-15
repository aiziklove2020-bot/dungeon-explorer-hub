import { useEffect, useState } from "react";
import { getSiteConfig } from "@/firebase/siteConfig";

type Banner = { id: string; imageUrl: string; linkUrl?: string; enabled?: boolean };

export function BannerStrip() {
  const [banners, setBanners] = useState<Banner[]>([]);

  useEffect(() => {
    let cancelled = false;
    getSiteConfig()
      .then((cfg) => {
        if (!cancelled) {
          const active = (cfg?.banners || []).filter((b: Banner) => b.enabled !== false && b.imageUrl);
          setBanners(active);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (banners.length === 0) return null;

  return (
    <div className="border-t border-border/60 bg-secondary/30 py-6">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-4 px-4">
        {banners.map((b) =>
          b.linkUrl ? (
            <a key={b.id} href={b.linkUrl} target="_blank" rel="noreferrer" className="shrink-0">
              <img src={b.imageUrl} alt="" className="h-20 w-auto rounded-lg object-cover transition-opacity hover:opacity-80" />
            </a>
          ) : (
            <img key={b.id} src={b.imageUrl} alt="" className="h-20 w-auto shrink-0 rounded-lg object-cover" />
          )
        )}
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { getRssFeeds, getRssTickerSettings } from "@/firebase/settings";

const RSS_CACHE_KEY = "libral_rss_feeds_cache";

type RssFeed = { id: string; text: string; enabled?: boolean };

export function RssTicker() {
  const [paused, setPaused] = useState(false);
  const [feeds, setFeeds] = useState<RssFeed[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(RSS_CACHE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [speed, setSpeed] = useState(60);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    getRssFeeds()
      .then((live: any[]) => {
        if (cancelled) return;
        const enabled = (live || []).filter((f) => f?.enabled !== false && f?.text);
        if (enabled.length > 0) {
          setFeeds(enabled);
          try {
            window.localStorage.setItem(RSS_CACHE_KEY, JSON.stringify(enabled));
          } catch {
            /* ignore */
          }
        }
      })
      .catch(() => {});
    getRssTickerSettings()
      .then((s: any) => {
        if (!cancelled) setSpeed(Math.max(10, Math.min(300, Number(s?.speed) || 60)));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (feeds.length === 0) return null;

  const track = [...feeds, ...feeds];

  return (
    <div className="flex items-center gap-3 border-b border-border/60 bg-secondary/60 px-3 py-2 text-sm">
      <span className="shrink-0 rounded-md bg-primary px-2 py-1 text-xs font-black tracking-wide text-primary-foreground">
        חדשות
      </span>
      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        aria-label={paused ? "המשך" : "השהה"}
        className="shrink-0 rounded-full border border-border/60 p-1 text-foreground/70 hover:text-primary"
      >
        {paused ? <Play size={12} /> : <Pause size={12} />}
      </button>
      <div ref={containerRef} className="flex-1 overflow-hidden">
        <style>{`
          @keyframes rss-marquee-scroll {
            from { transform: translateX(0%); }
            to { transform: translateX(-50%); }
          }
        `}</style>
        <div
          className="flex w-max gap-10 whitespace-nowrap"
          style={{
            animationName: "rss-marquee-scroll",
            animationDuration: `${speed}s`,
            animationTimingFunction: "linear",
            animationIterationCount: "infinite",
            animationPlayState: paused ? "paused" : "running",
          }}
        >
          {track.map((feed, i) => (
            <span key={`${feed.id}-${i}`} className="flex items-center gap-3 text-foreground/80">
              {feed.text}
              <span aria-hidden="true" className="text-primary">•</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

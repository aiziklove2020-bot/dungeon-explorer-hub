import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { getRssFeeds } from "@/firebase/settings";

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
    return () => {
      cancelled = true;
    };
  }, []);

  if (feeds.length === 0) return null;

  const track = [...feeds, ...feeds];
  // The admin "speed" setting (in seconds) was tuned for the old horizontal
  // marquee, where the scroll distance is the full width of every item laid
  // out side by side — often thousands of pixels. This vertical box only
  // travels one item's height (36px) per item, a much shorter distance, so
  // reusing that setting made the movement all but imperceptible (it looked
  // "stuck" rather than just slow). A fixed, item-count-scaled pace reads as
  // a normal ticker regardless of what that old setting is configured to.
  const SECONDS_PER_ITEM = 4;
  const speed = feeds.length * SECONDS_PER_ITEM;

  return (
    <div className="flex items-center gap-3 border-b border-border/60 bg-secondary/60 px-3 py-2 text-sm">
      <span className="flex shrink-0 items-center justify-center rounded-md bg-primary px-3 py-2 text-xs font-black tracking-wide text-primary-foreground">
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
      <div ref={containerRef} className="h-9 flex-1 overflow-hidden">
        <style>{`
          @keyframes rss-vertical-scroll {
            from { transform: translateY(0%); }
            to { transform: translateY(-50%); }
          }
        `}</style>
        <div
          style={{
            animationName: "rss-vertical-scroll",
            animationDuration: `${speed}s`,
            animationTimingFunction: "linear",
            animationIterationCount: "infinite",
            animationPlayState: paused ? "paused" : "running",
          }}
        >
          {track.map((feed, i) => (
            <div key={`${feed.id}-${i}`} className="flex h-9 items-center text-foreground/80">
              {feed.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

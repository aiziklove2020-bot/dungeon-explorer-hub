import { useEffect, useState } from "react";
import { Download, Share, Plus } from "lucide-react";

type Platform = "android" | "ios" | "other";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent || "";
  if (/Android/i.test(ua)) return "android";
  // iPhone/iPod, plus iPadOS which masquerades as a Mac but has touch.
  const isIOS =
    /iPad|iPhone|iPod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIOS) return "ios";
  return "other";
}

export function AppDownload() {
  // Default to the Android download on the server / first paint, then refine
  // once we can read the real platform on the client.
  const [platform, setPlatform] = useState<Platform>("other");
  const [showIosSteps, setShowIosSteps] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);

  if (platform === "ios") {
    return (
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={() => setShowIosSteps((v) => !v)}
          className="btn-glow flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition-transform hover:scale-105"
        >
          <Plus size={18} />
          התקנת האפליקציה לאייפון
        </button>
        {showIosSteps && (
          <div className="mt-1 max-w-xs rounded-2xl border border-border bg-card p-4 text-right text-sm text-muted-foreground">
            <p className="mb-2 font-bold text-foreground">להתקנה על אייפון:</p>
            <ol className="space-y-1.5">
              <li className="flex items-center justify-end gap-2">
                <span>פתחו את האתר ב-Safari</span>
              </li>
              <li className="flex items-center justify-end gap-2">
                <span>לחצו על כפתור השיתוף</span>
                <Share size={16} className="shrink-0 text-primary" />
              </li>
              <li className="flex items-center justify-end gap-2">
                <span>בחרו "הוסף למסך הבית"</span>
                <Plus size={16} className="shrink-0 text-primary" />
              </li>
            </ol>
          </div>
        )}
      </div>
    );
  }

  // Android + desktop: offer the direct APK download.
  return (
    <div className="flex flex-col items-center gap-2">
      <a
        href="/libral-party.apk"
        download="LibralParty.apk"
        className="btn-glow flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition-transform hover:scale-105"
      >
        <Download size={18} />
        הורדת האפליקציה לאנדרואיד
      </a>
      <span className="text-xs text-muted-foreground">
        {platform === "android"
          ? "להתקנה ישירה במכשירכם"
          : "להתקנה במכשירי Android · באייפון: פתחו מהטלפון"}
      </span>
    </div>
  );
}

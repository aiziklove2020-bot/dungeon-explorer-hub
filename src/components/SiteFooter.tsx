import { Link } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { navLinks, SITE_NAME } from "./SiteHeader";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background py-12">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 text-center">
        <span className="text-xl font-black text-primary">{SITE_NAME}</span>

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
            להתקנה ישירה במכשירי Android
          </span>
        </div>

        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} {SITE_NAME} · קהילת המסיבות הליברליות
          המובילה בישראל · הכניסה מגיל 18 ומעלה
        </p>
      </div>
    </footer>
  );
}

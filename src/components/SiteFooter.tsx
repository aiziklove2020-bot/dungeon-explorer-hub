import { Link } from "@tanstack/react-router";
import { navLinks, SITE_NAME } from "./SiteHeader";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background py-12">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 text-center">
        <span className="text-xl font-black text-primary">{SITE_NAME}</span>
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

import { Link } from "@tanstack/react-router";
import logoMark from "@/assets/logo-mark.png";

export const SITE_NAME = "מסיבות ליברליות בישראל";

export const navLinks = [
  { label: "דף הבית", to: "/" },
  { label: "אודות", to: "/about" },
  { label: "בלוג", to: "/blog" },
  { label: "פורום", to: "/forum" },
  { label: "צ'אט", to: "/chat" },
  { label: "כרטיסים", to: "/tickets" },
  { label: "חנות", to: "/shop" },
  { label: "צור קשר", to: "/contact" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
        <Link to="/" className="flex shrink-0 items-center gap-3">
          <img
            src={logoMark}
            alt="לוגו מסיבות ליברליות בישראל"
            width={44}
            height={44}
            className="h-11 w-11 drop-shadow-[0_0_12px_rgba(212,175,55,0.25)]"
          />
          <span className="text-lg font-black leading-tight text-primary md:text-xl">
            מסיבות ליברליות
            <span className="block text-xs font-semibold tracking-widest text-muted-foreground">
              בישראל
            </span>
          </span>
        </Link>
        <nav className="hidden items-center gap-5 lg:flex">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-sm text-foreground/80 transition-colors hover:text-primary"
              activeProps={{ className: "text-primary font-bold" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <Link
          to="/login"
          className="shrink-0 rounded-full border border-primary px-5 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
        >
          היכנס
        </Link>
      </div>
    </header>
  );
}

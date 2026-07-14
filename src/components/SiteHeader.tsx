import { Link } from "@tanstack/react-router";
import logoHeart from "@/assets/logo-heart.png";

export const SITE_NAME = "מסיבות ליברליות בישראל";

export const navLinks = [
  { label: "דף הבית", to: "/" },
  { label: "אודות", to: "/about" },
  { label: "בלוג", to: "/blog" },
  { label: "פורום", to: "/forum" },
  { label: "צ'אט", to: "/chat" },
  { label: "כרטיסים", to: "/tickets" },
  { label: "הרשמה", to: "/register" },
  { label: "חנות", to: "/shop" },
  { label: "צור קשר", to: "/contact" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <img
            src={logoHeart}
            alt="מסיבות ליברליות בישראל"
            className="h-9 w-auto object-contain md:h-11"
          />
          <span className="text-base font-black leading-tight text-foreground md:text-xl">
            מסיבות ליברליות
            <span className="block text-[0.7em] font-bold tracking-wide text-foreground/70">
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

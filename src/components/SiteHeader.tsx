import { Link } from "@tanstack/react-router";
import logoText from "@/assets/logo-text.png";

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
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="flex shrink-0 items-center">
          <img
            src={logoText}
            alt="מסיבות ליברליות בישראל"
            width={240}
            height={48}
            className="h-10 w-auto object-contain drop-shadow-[0_0_10px_rgba(212,175,55,0.2)] md:h-12"
          />
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

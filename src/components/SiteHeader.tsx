import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import logoHeart from "@/assets/logo-heart.png";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";

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
  const [open, setOpen] = useState(false);

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
        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="hidden shrink-0 rounded-full border border-primary px-5 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground lg:inline-block"
          >
            היכנס
          </Link>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="פתח תפריט"
                className="flex items-center justify-center rounded-full border border-border/60 p-2 text-foreground lg:hidden"
              >
                <Menu className="h-6 w-6" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="flex w-72 flex-col gap-6">
              <SheetHeader>
                <SheetTitle className="text-right">{SITE_NAME}</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1">
                {navLinks.map((l) => (
                  <SheetClose asChild key={l.to}>
                    <Link
                      to={l.to}
                      onClick={() => setOpen(false)}
                      className="rounded-lg px-3 py-3 text-base text-foreground/90 transition-colors hover:bg-secondary hover:text-primary"
                      activeProps={{ className: "text-primary font-bold bg-secondary" }}
                    >
                      {l.label}
                    </Link>
                  </SheetClose>
                ))}
                <SheetClose asChild>
                  <Link
                    to="/login"
                    onClick={() => setOpen(false)}
                    className="mt-2 rounded-full border border-primary px-3 py-3 text-center text-base font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                  >
                    היכנס
                  </Link>
                </SheetClose>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

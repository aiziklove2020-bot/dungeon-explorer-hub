import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Menu, LogOut } from "lucide-react";
import logoHeart from "@/assets/logo-heart.png";
import { useForumAuth } from "@/context/ForumAuthContext";
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
  { label: "הרשמה", to: "/register" },
  { label: "חנות", to: "/shop" },
  { label: "צור קשר", to: "/contact" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { forumUser, forumLogout } = useForumAuth();
  const navigate = useNavigate();

  function handleLogout() {
    forumLogout();
    setOpen(false);
    navigate({ to: "/" });
  }

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
          {forumUser ? (
            <div className="flex items-center gap-2">
              <span className="max-w-[6rem] truncate text-xs font-bold text-foreground sm:max-w-none sm:text-sm">
                {forumUser.nickname}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                aria-label="התנתק"
                className="flex shrink-0 items-center gap-1 rounded-full border border-border px-3 py-2 text-xs font-bold text-foreground/80 transition-colors hover:border-primary hover:text-primary sm:px-4 sm:text-sm"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">התנתק</span>
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="shrink-0 rounded-full border border-primary px-3 py-2 text-xs font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground sm:px-5 sm:text-sm"
            >
              היכנס
            </Link>
          )}
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
                {forumUser ? (
                  <div className="mt-2 space-y-2">
                    <p className="px-3 text-sm font-bold text-foreground">
                      מחובר/ת בתור {forumUser.nickname}
                    </p>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center justify-center gap-2 rounded-full border border-border px-3 py-3 text-center text-base font-bold text-foreground/80 transition-colors hover:border-primary hover:text-primary"
                    >
                      <LogOut className="h-4 w-4" /> התנתק
                    </button>
                  </div>
                ) : (
                  <SheetClose asChild>
                    <Link
                      to="/login"
                      onClick={() => setOpen(false)}
                      className="mt-2 rounded-full border border-primary px-3 py-3 text-center text-base font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                    >
                      היכנס
                    </Link>
                  </SheetClose>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

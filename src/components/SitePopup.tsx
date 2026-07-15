import { useEffect, useState } from "react";
import { getSiteConfig } from "@/firebase/siteConfig";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const DISMISS_KEY = "libral_site_popup_dismissed_at";
const DISMISS_TTL_MS = 24 * 60 * 60 * 1000; // show again once a day

export function SitePopup() {
  const [popup, setPopup] = useState<{
    enabled: boolean;
    title: string;
    text: string;
    imageUrl: string;
    linkUrl: string;
    linkText: string;
  } | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSiteConfig()
      .then((cfg) => {
        if (cancelled || !cfg?.popup?.enabled) return;
        let lastDismissed = 0;
        try {
          lastDismissed = Number(window.localStorage.getItem(DISMISS_KEY)) || 0;
        } catch {
          /* ignore */
        }
        if (Date.now() - lastDismissed < DISMISS_TTL_MS) return;
        setPopup(cfg.popup);
        setOpen(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  function handleClose(next: boolean) {
    setOpen(next);
    if (!next) {
      try {
        window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
      } catch {
        /* ignore */
      }
    }
  }

  if (!popup) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md text-center">
        <DialogHeader>
          {popup.title && <DialogTitle className="text-xl">{popup.title}</DialogTitle>}
        </DialogHeader>
        {popup.imageUrl && (
          <img src={popup.imageUrl} alt="" className="mx-auto max-h-60 w-auto rounded-lg object-contain" />
        )}
        {popup.text && <p className="text-foreground/80">{popup.text}</p>}
        {popup.linkUrl && (
          <a
            href={popup.linkUrl}
            target="_blank"
            rel="noreferrer"
            className="mx-auto mt-2 inline-block rounded-full bg-primary px-6 py-2 font-bold text-primary-foreground"
          >
            {popup.linkText || "לפרטים"}
          </a>
        )}
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageLayout } from "@/components/PageLayout";
import { registerAdvertiser } from "@/firebase/advertisers";

export const Route = createFileRoute("/advertiser/register")({
  head: () => ({
    meta: [
      { title: "הרשמת מפרסם | מסיבות ליברליות בישראל" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdvertiserRegisterPage,
});

function AdvertiserRegisterPage() {
  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("הסיסמאות אינן תואמות");
      return;
    }
    setLoading(true);
    try {
      await registerAdvertiser({ businessName, contactName, phoneNumber, password });
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || "שגיאה בשליחת ההרשמה");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <PageLayout>
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-primary">ההרשמה נשלחה בהצלחה</h1>
          <p className="mt-4 text-muted-foreground">
            הבקשה שלך ממתינה לאישור מנהל. לאחר האישור תוכל/י להתחבר בעמוד{" "}
            <Link to="/advertiser" className="font-bold text-primary hover:underline">
              כניסת מפרסמים
            </Link>{" "}
            עם מספר הטלפון והסיסמה שהזנת.
          </p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="mx-auto max-w-md px-4 py-16">
        <h1 className="mb-2 text-center text-2xl font-bold">הרשמת מפרסם</h1>
        <p className="mb-8 text-center text-sm text-muted-foreground">
          לאחר שליחת הטופס, בקשתך תיבדק ותאושר על ידי מנהל האתר.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-bold">שם העסק / המותג</label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              required
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-foreground outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold">שם איש קשר</label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              required
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-foreground outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold">טלפון</label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="05XXXXXXXX"
              required
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-foreground outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold">סיסמה</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={4}
              required
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-foreground outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold">אימות סיסמה</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={4}
              required
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-foreground outline-none focus:border-primary"
            />
          </div>
          {error && <p className="text-sm font-bold text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground transition-transform hover:scale-105 disabled:opacity-50"
          >
            {loading ? "שולח..." : "שליחת בקשת הרשמה"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          כבר מפרסם מאושר?{" "}
          <Link to="/advertiser" className="font-bold text-primary hover:underline">
            כניסה
          </Link>
        </p>
      </div>
    </PageLayout>
  );
}

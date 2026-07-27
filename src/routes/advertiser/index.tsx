import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Trash2, LogOut } from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { LanguageProvider } from "../../i18n/LanguageContext";
import { authenticateAdvertiser } from "@/firebase/advertisers";
import { getPartiesByAdvertiser } from "@/firebase/parties";
import { createParty, updateParty, deleteParty } from "@/firebase/parties";
import PartyEditor from "@/components/admin/PartyEditor";

export const Route = createFileRoute("/advertiser/")({
  head: () => ({
    meta: [
      { title: "כניסת מפרסמים | מסיבות ליברליות בישראל" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdvertiserRoute,
});

function AdvertiserRoute() {
  return (
    <PageLayout>
      <LanguageProvider>
        <AdvertiserPage />
      </LanguageProvider>
    </PageLayout>
  );
}

function AdvertiserPage() {
  const [advertiserId, setAdvertiserId] = useState<string | null>(() =>
    sessionStorage.getItem("advertiser_id")
  );

  if (!advertiserId) {
    return <AdvertiserLogin onAuthenticated={(id) => setAdvertiserId(id)} />;
  }

  return (
    <AdvertiserPanel
      advertiserId={advertiserId}
      onLogout={() => {
        sessionStorage.removeItem("advertiser_id");
        window.dispatchEvent(new Event("advertiser-auth-changed"));
        setAdvertiserId(null);
      }}
    />
  );
}

function AdvertiserLogin({ onAuthenticated }: { onAuthenticated: (id: string) => void }) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await authenticateAdvertiser(phoneNumber, password);
      if (result.authenticated) {
        sessionStorage.setItem("advertiser_id", result.advertiser.id);
        window.dispatchEvent(new Event("advertiser-auth-changed"));
        onAuthenticated(result.advertiser.id);
      } else {
        setError(result.error || "שגיאת התחברות");
      }
    } catch (err: any) {
      setError(err?.message || "שגיאת התחברות");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="mb-8 text-center text-2xl font-bold">כניסת מפרסמים</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-bold">טלפון</label>
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
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
          {loading ? "מתחבר..." : "כניסה"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        עדיין לא נרשמת?{" "}
        <Link to="/advertiser/register" className="font-bold text-primary hover:underline">
          הרשמה כמפרסם
        </Link>
      </p>
    </div>
  );
}

function AdvertiserPanel({
  advertiserId,
  onLogout,
}: {
  advertiserId: string;
  onLogout: () => void;
}) {
  const [parties, setParties] = useState<any[] | null>(null);
  const [editingParty, setEditingParty] = useState<any | null>(null);

  const loadParties = () => {
    getPartiesByAdvertiser(advertiserId)
      .then(setParties)
      .catch(() => setParties([]));
  };

  useEffect(() => {
    loadParties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advertiserId]);

  function handleAddNew() {
    setEditingParty({
      name: "",
      title: "",
      description: "",
      date: new Date().toISOString().split("T")[0],
      day: "",
      time: "",
      dj: "",
      imageURL: "",
      maleLimit: 100,
      femaleLimit: 100,
      registrationLink: "",
      partyType: "internal",
    });
  }

  async function handleSave(partyData: any) {
    try {
      if (editingParty?.id) {
        await updateParty(editingParty.id, partyData);
      } else {
        await createParty({ ...partyData, createdBy: advertiserId, createdByType: "advertiser" });
      }
      setEditingParty(null);
      loadParties();
    } catch (err: any) {
      alert(`שגיאה בשמירת המסיבה: ${err?.message || err}`);
    }
  }

  async function handleDelete(partyId: string, partyName: string) {
    if (!window.confirm(`למחוק את "${partyName}"?`)) return;
    try {
      await deleteParty(partyId);
      loadParties();
    } catch (err: any) {
      alert(`שגיאה במחיקת המסיבה: ${err?.message || err}`);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">פאנל מפרסם</h1>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-bold transition-colors hover:border-primary hover:text-primary"
        >
          <LogOut size={16} /> יציאה
        </button>
      </div>

      {!editingParty && (
        <div className="mb-6 rounded-2xl border border-primary/40 bg-primary/5 p-5 text-sm leading-relaxed">
          <p className="mb-2 font-bold text-primary">איך מעלים מסיבה — מדריך קצר</p>
          <ol className="list-decimal space-y-1 pr-5 mb-4">
            <li>לוחצים על הכפתור <strong>"הוספת מסיבה"</strong> למטה.</li>
            <li>ממלאים שם, תיאור, תאריך, שעה, DJ ותמונה של המסיבה.</li>
            <li>
              בוחרים איך נרשמים אליה — <strong>באתר עצמו</strong>, <strong>דרך וואטסאפ</strong>
              (חובה למלא את מספר הוואטסאפ בשדה הייעודי, לא רק לכתוב אותו בתיאור — אחרת המסיבה
              עלולה להופיע בטעות בהרשמה הפנימית של האתר), או <strong>דרך קישור חיצוני</strong>
              (כרטיסים, אתר אחר וכו').
            </li>
            <li>
              <strong>רוצים לצרף קישור לכרטיסים?</strong> חובה קודם לבחור בשדה
              <strong> "סוג המסיבה" את האפשרות "חיצונית"</strong> — רק אז שדה הקישור נפתח
              ואפשר להזין אותו. אם המסיבה נשארת מסומנת "פנימית", אי אפשר לצרף קישור כרטיסים
              כלל וההרשמה תתבצע דרך האתר.
            </li>
            <li>לוחצים <strong>שמור</strong> — זהו, המסיבה עלתה לאתר.</li>
          </ol>
          <p className="mb-1 font-bold text-primary">מתי היא מתפרסמת בקבוצות הטלגרם?</p>
          <p>
            פרסום המסיבות לקבוצות הטלגרם נעשה <strong>אוטומטית</strong>, לפי לוח זמנים קבוע:
            <strong> ימי ראשון, רביעי ושישי בשעה 12:00</strong> (שעון ישראל). אין צורך (ואין
            אפשרות) לפרסם את המסיבה בעצמכם — היא תעלה לבד בזמן הקרוב ביותר.
          </p>
        </div>
      )}

      {editingParty ? (
        <PartyEditor party={editingParty} onSave={handleSave} onCancel={() => setEditingParty(null)} />
      ) : (
        <>
          <div className="mb-6 flex justify-end">
            <button
              onClick={handleAddNew}
              className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground transition-transform hover:scale-105"
            >
              <Plus size={18} /> הוספת מסיבה
            </button>
          </div>

          {parties === null ? (
            <p className="text-center text-muted-foreground">טוען...</p>
          ) : parties.length === 0 ? (
            <p className="text-center text-muted-foreground">עדיין לא פרסמת מסיבות.</p>
          ) : (
            <div className="space-y-4">
              {parties.map((party) => (
                <div
                  key={party.id}
                  className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <h3 className="text-lg font-bold">{party.title || party.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {party.date instanceof Date ? party.date.toLocaleDateString("he-IL") : ""}
                      {party.dj ? ` · ${party.dj}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingParty(party)}
                      className="rounded-full border border-primary px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                    >
                      עריכה
                    </button>
                    <button
                      onClick={() => handleDelete(party.id, party.title || party.name)}
                      className="flex items-center gap-1 rounded-full border border-destructive px-4 py-2 text-sm font-bold text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <Trash2 size={14} /> מחיקה
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

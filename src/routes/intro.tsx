import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { getTelegramSettings } from "@/firebase/settings";
import { uploadPartyImage } from "@/firebase/storage";
import { relayTelegramApi } from "@/utils/telegramRelay";

export const Route = createFileRoute("/intro")({
  head: () => ({
    meta: [
      { title: "פוסט היכרות | Libral Party" },
      { name: "description", content: "פוסט היכרות לקהילה שלנו — תקנון, טופס והצטרפות." },
      { property: "og:title", content: "פוסט היכרות | Libral Party" },
      { property: "og:url", content: "/intro" },
    ],
    links: [{ rel: "canonical", href: "/intro" }],
  }),
  component: IntroPost,
});

// Chosen so the vetting group receives new intro posts as photo messages the
// admin can approve/reject before the poster gets the join link. Sent via the
// "Legacy (Matching)" bot, which is the one actually added to this group.
const TARGET_CHAT_ID = "-1002472743528";
const BOT_NAME_HINTS = ["legacy (matching)", "legacy"];
const JOIN_GROUP_URL = "https://t.me/+C2o1zdKnal82YTQ0";

const SIDE_OPTIONS = ["שולט", "נשלט", "נשלטת", "סוויץ׳", "עדיין מגלה"];
const STATUS_OPTIONS = ["פנוי/ה", "בקשר", "מורכב"];
const EXP_OPTIONS = ["מתחיל/ה", "בינוני", "מנוסה"];

function IntroPost() {
  const [step, setStep] = useState(1);
  const [agree1, setAgree1] = useState(false);
  const [agree2, setAgree2] = useState(false);

  const [tgUsername, setTgUsername] = useState("");
  const [about, setAbout] = useState("");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [side, setSide] = useState("");
  const [status, setStatus] = useState("");
  const [exp, setExp] = useState("");
  const [limits, setLimits] = useState("");
  const [goal, setGoal] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const photoInputRef = useRef<HTMLInputElement>(null);

  const goStep = (n: number) => {
    setStep(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoFile(e.target.files?.[0] || null);
  };

  const handleSubmit = async () => {
    const username = tgUsername.trim().replace(/^@+/, "");
    const nextErrors: Record<string, string> = {};
    if (!username) nextErrors.tgUsername = "שם משתמש בטלגרם הוא שדה חובה";
    if (!name.trim()) nextErrors.name = "שדה חובה";
    if (!age || parseInt(age, 10) < 18) nextErrors.age = "שדה חובה (18+)";
    if (!side) nextErrors.side = "נא לבחור צד";
    if (!about.trim()) nextErrors.about = "שדה חובה";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    if (!photoFile) {
      alert("נא לבחור תמונה");
      return;
    }

    const caption = `🔥 פוסט היכרות חדש – Libral Party

👤 טלגרם: @${username}
💬 ספר/י על עצמך: ${about.trim()}
😊 שם / כינוי: ${name.trim()}
🔞 גיל: ${age}
🎭 הצד שלי: ${side}
🔗 סטטוס: ${status || "לא צוין"}
⛓️ ניסיון: ${exp || "לא צוין"}
❌ גבולות אדומים: ${limits.trim() || "לא צוין"}
🎯 מטרת הכניסה לקבוצה: ${goal.trim() || "לא צוין"}`;

    setSubmitting(true);
    setSubmitError("");
    try {
      const uploaded = await uploadPartyImage(photoFile, `intro_${Date.now()}`);
      const photoUrl = typeof uploaded === "string" ? uploaded : uploaded.url;

      const settings = await getTelegramSettings();
      const bot = (settings?.bots || []).find((b: any) =>
        BOT_NAME_HINTS.includes(String(b?.name || b?.id || "").toLowerCase())
      );
      if (!bot?.token) throw new Error("בוט הטלגרם לא נמצא בהגדרות המערכת");

      const { data } = await relayTelegramApi("sendPhoto", bot.token, {
        chat_id: TARGET_CHAT_ID,
        photo: photoUrl,
        caption,
      });
      if (!data?.ok) throw new Error(data?.description || "שגיאת טלגרם");

      goStep(3);
    } catch (err: any) {
      setSubmitError(err?.message || "שגיאה בשליחה. נסה שנית.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="intro-app" dir="rtl">
      <style>{`
        .intro-app {
          --primary-red: #990000;
          --bright-red: #ff1a1a;
          --dark-bg: #030303;
          background-color: var(--dark-bg);
          color: #f0f0f0;
          font-family: 'Assistant', sans-serif;
          background-image:
            radial-gradient(circle at 10% 10%, #200505 0%, transparent 30%),
            radial-gradient(circle at 90% 90%, #200505 0%, transparent 30%);
          min-height: 100vh;
        }
        .intro-app * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        .intro-app .wrap { max-width: 480px; margin: 0 auto; padding: 0 16px calc(100px + env(safe-area-inset-bottom, 0px)); }
        .intro-app .header { text-align: center; padding: 36px 20px 24px; border-bottom: 1px solid rgba(255,255,255,0.05); margin-bottom: 24px; }
        .intro-app .logo { font-size: 44px; font-weight: 900; letter-spacing: -1px; text-transform: uppercase; color: #fff; font-style: italic; text-shadow: 0 0 10px rgba(255,26,26,0.5); line-height: 1; margin-bottom: 8px; }
        .intro-app .logo span { color: #e00; }
        .intro-app .logo-sub { color: #555; font-size: 11px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; }
        .intro-app .progress-bar { height: 3px; background: #222; border-radius: 2px; overflow: hidden; margin-bottom: 28px; }
        .intro-app .progress-fill { height: 100%; background: var(--bright-red); box-shadow: 0 0 10px var(--bright-red); transition: width 0.5s ease; }
        .intro-app .step { animation: introFadeUp .35s ease; }
        @keyframes introFadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .intro-app .step-title { font-size: 26px; font-weight: 800; color: #fff; margin-bottom: 4px; }
        .intro-app .step-sub { font-size: 10px; font-weight: 700; color: var(--bright-red); text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 20px; }
        .intro-app .rule-card { background: rgba(255,255,255,0.02); border-right: 3px solid var(--primary-red); padding: 14px 14px 14px 10px; border-radius: 10px; margin-bottom: 10px; }
        .intro-app .rule-card.warning { border-right-color: #ff9900; background: rgba(255,153,0,0.05); }
        .intro-app .rule-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
        .intro-app .rule-title { font-size: 11px; font-weight: 700; color: #fff; text-transform: uppercase; letter-spacing: 0.08em; }
        .intro-app .rule-body { font-size: 13px; color: #777; line-height: 1.6; }
        .intro-app .rule-body .red { color: #cc3333; font-weight: 700; }
        .intro-app .rule-body .orange { color: #e67e00; font-weight: 700; text-decoration: underline; }
        .intro-app .agree-list { margin: 22px 0 28px; display: flex; flex-direction: column; gap: 10px; }
        .intro-app .agree-row { display: flex; align-items: flex-start; gap: 14px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; padding: 14px 16px; cursor: pointer; user-select: none; }
        .intro-app .check-box { width: 24px; height: 24px; border: 2px solid #333; border-radius: 6px; background: #000; flex-shrink: 0; display: flex; align-items: center; justify-content: center; transition: all .2s; margin-top: 1px; }
        .intro-app .check-box.checked { background: #990000; border-color: #ff1a1a; }
        .intro-app .check-mark { color: #fff; font-size: 15px; font-weight: 900; line-height: 1; }
        .intro-app .agree-text { font-size: 13.5px; color: #ccc; line-height: 1.5; }
        .intro-app .field-label { display: block; font-size: 10px; font-weight: 800; color: var(--bright-red); text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 8px; }
        .intro-app textarea, .intro-app .text-input { width: 100%; background: #000; border: 1px solid #222; border-radius: 14px; color: #fff; font-family: 'Assistant', sans-serif; font-size: 15px; line-height: 1.6; padding: 16px; resize: none; outline: none; transition: border-color .2s, box-shadow .2s; }
        .intro-app textarea:focus, .intro-app .text-input:focus { border-color: var(--bright-red); box-shadow: 0 0 0 3px rgba(255,26,26,0.12); }
        .intro-app textarea::placeholder, .intro-app .text-input::placeholder { color: #444; }
        .intro-app .tg-input-wrap { position: relative; }
        .intro-app .tg-at { position: absolute; right: 16px; top: 50%; transform: translateY(-50%); color: #555; font-size: 16px; font-weight: 700; pointer-events: none; }
        .intro-app .tg-input-wrap .text-input { padding: 16px 36px 16px 16px; direction: ltr; text-align: right; }
        .intro-app .text-input.error { border-color: #ff4444; box-shadow: 0 0 0 3px rgba(255,68,68,0.12); }
        .intro-app .field-error { font-size: 11px; color: #ff4444; margin-top: 6px; }
        .intro-app .select-group { display: flex; flex-wrap: wrap; gap: 8px; }
        .intro-app .sel-btn { background: #000; border: 1px solid #333; border-radius: 10px; color: #777; font-family: 'Assistant', sans-serif; font-size: 13px; font-weight: 700; padding: 10px 16px; cursor: pointer; transition: all .2s; user-select: none; }
        .intro-app .sel-btn.active { background: rgba(153,0,0,0.2); border-color: var(--bright-red); color: #fff; }
        .intro-app .file-pick { background: #000; border: 1px solid #222; border-radius: 14px; padding: 16px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; }
        .intro-app .file-name { font-size: 13px; color: #555; }
        .intro-app .file-name.selected { color: #fff; }
        .intro-app .file-icon { width: 36px; height: 36px; background: rgba(153,0,0,0.15); border-radius: 10px; display: flex; align-items: center; justify-content: center; }
        .intro-app .file-icon svg { width: 18px; height: 18px; stroke: var(--bright-red); }
        .intro-app .field-group { margin-bottom: 20px; }
        .intro-app .step2-title { display: flex; align-items: center; gap: 10px; font-size: 22px; font-weight: 800; color: #fff; margin-bottom: 4px; }
        .intro-app .step-num { width: 30px; height: 30px; border-radius: 50%; background: rgba(153,0,0,0.2); border: 1px solid rgba(153,0,0,0.5); display: flex; align-items: center; justify-content: center; font-size: 13px; color: #fff; font-weight: 700; flex-shrink: 0; }
        .intro-app .bottom-bar { position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: 480px; background: linear-gradient(to top, #030303 55%, transparent); padding: 16px 16px calc(16px + env(safe-area-inset-bottom, 0px)); z-index: 99; }
        .intro-app .btn-primary { width: 100%; background: linear-gradient(135deg, #990000 0%, #440000 100%); border: 1px solid rgba(255,26,26,0.3); border-radius: 14px; color: #fff; font-family: 'Assistant', sans-serif; font-size: 17px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; padding: 18px; cursor: pointer; transition: all .2s; outline: none; display: block; }
        .intro-app .btn-primary:active:not(:disabled) { transform: scale(0.98); }
        .intro-app .btn-primary:disabled { opacity: 0.2; filter: grayscale(1); }
        .intro-app .btn-back { background: none; border: none; color: #555; font-family: 'Assistant', sans-serif; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; cursor: pointer; padding: 10px 0 0; width: 100%; text-align: center; }
        .intro-app .success-wrap { text-align: center; padding: 20px 0 40px; }
        .intro-app .success-icon { width: 80px; height: 80px; border-radius: 50%; border: 1px solid var(--bright-red); display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; box-shadow: 0 0 24px rgba(153,0,0,0.4); font-size: 38px; color: var(--bright-red); font-weight: 900; }
        .intro-app .success-title { font-size: 30px; font-weight: 800; color: #fff; margin-bottom: 16px; }
        .intro-app .success-box { background: rgba(153,0,0,0.06); border: 1px solid rgba(153,0,0,0.2); border-radius: 18px; padding: 20px; font-size: 14px; color: #aaa; line-height: 1.8; margin-bottom: 32px; text-align: right; }
        .intro-app .success-box strong { color: #e04444; }
        .intro-app .tg-btn { display: flex; align-items: center; justify-content: center; gap: 12px; background: linear-gradient(135deg, #ff1a1a 0%, #990000 100%); color: #fff; border-radius: 18px; width: 100%; padding: 22px 28px; font-family: 'Assistant', sans-serif; font-size: 18px; font-weight: 800; text-decoration: none; text-transform: uppercase; letter-spacing: 0.1em; transition: all .2s; border: 1px solid rgba(255,100,100,0.4); box-shadow: 0 0 30px rgba(255,26,26,0.4), 0 0 60px rgba(153,0,0,0.2); animation: introPulse 2s ease-in-out infinite; }
        @keyframes introPulse { 0%, 100% { box-shadow: 0 0 30px rgba(255,26,26,0.4), 0 0 60px rgba(153,0,0,0.2); } 50% { box-shadow: 0 0 45px rgba(255,26,26,0.7), 0 0 80px rgba(153,0,0,0.4); } }
        .intro-app .tg-btn:active { transform: scale(0.97); }
        .intro-app .tg-btn svg { width: 24px; height: 24px; fill: currentColor; flex-shrink: 0; }
        .intro-app .submit-error { font-size: 13px; color: #ff4444; text-align: center; margin-top: 10px; }
      `}</style>

      <div className="wrap">
        <div className="header">
          <div className="logo">Libral<span>Party</span></div>
          <div className="logo-sub">פוסט היכרות לקהילה שלנו</div>
        </div>

        <div className="progress-bar">
          <div className="progress-fill" style={{ width: step === 1 ? "33%" : step === 2 ? "66%" : "100%" }} />
        </div>

        {step === 1 && (
          <div className="step">
            <div className="step-title">תקנון הקהילה</div>
            <div className="step-sub">חובה לקרוא ולאשר לפני המשך</div>
            <div className="rule-card">
              <div className="rule-head"><span>🆔</span><span className="rule-title">זהות ופרטיות</span></div>
              <p className="rule-body">חל איסור מוחלט על חשיפת אדם בשמו המלא. התייחסות לחברים תהיה אך ורק בכינוי שלהם בקבוצה. <span className="red">אין להוציא אף חבר מהארון בשום צורה.</span></p>
            </div>
            <div className="rule-card">
              <div className="rule-head"><span>📩</span><span className="rule-title">פניות בפרטי</span></div>
              <p className="rule-body">אין לפנות לחבר/ה בפרטי (DM) ללא קבלת אישור מפורש ומוסכם בשיח הראשי בתוך הצ'אט של הקהילה.</p>
            </div>
            <div className="rule-card warning">
              <div className="rule-head"><span>🔞</span><span className="rule-title">מדיניות עירום</span></div>
              <p className="rule-body">עירום מלא מותר, אך <span className="orange">חובה להשתמש באפשרות הטשטוש של טלגרם (Hidden Media)</span>. פוסטים חשופים ללא הגנה יימחקו מיידית.</p>
            </div>
            <div className="rule-card">
              <div className="rule-head"><span>🤐</span><span className="rule-title">דיסקרטיות מוחלטת</span></div>
              <p className="rule-body">מה שקורה בקהילה נשאר בקהילה. צילום מסך או הקלטה יגררו הרחקה לצמיתות ללא אזהרה.</p>
            </div>
            <div className="agree-list">
              <div className="agree-row" onClick={() => setAgree1((v) => !v)}>
                <div className={`check-box ${agree1 ? "checked" : ""}`}>
                  {agree1 && <span className="check-mark">✓</span>}
                </div>
                <span className="agree-text">אני מתחייב/ת לשמור על אנונימיות החברים ולא לפנות בפרטי ללא אישור</span>
              </div>
              <div className="agree-row" onClick={() => setAgree2((v) => !v)}>
                <div className={`check-box ${agree2 ? "checked" : ""}`}>
                  {agree2 && <span className="check-mark">✓</span>}
                </div>
                <span className="agree-text">אני מצהיר/ה שמלאו לי 18 שנים</span>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="step">
            <div className="step2-title"><span className="step-num">2</span>הפוסט שלך</div>
            <div className="step-sub" style={{ marginRight: 40 }}>ספר/י על העדפות, גבולות ומי את/ה.</div>

            <div className="field-group">
              <label className="field-label">👤 שם משתמש בטלגרם *</label>
              <div className="tg-input-wrap">
                <span className="tg-at">@</span>
                <input
                  type="text"
                  className={`text-input ${errors.tgUsername ? "error" : ""}`}
                  value={tgUsername}
                  onChange={(e) => setTgUsername(e.target.value.replace(/^@+/, "").replace(/\s/g, ""))}
                  placeholder="username"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                />
              </div>
              {errors.tgUsername && <div className="field-error">{errors.tgUsername}</div>}
            </div>

            <div className="field-group">
              <label className="field-label">💬 ספר/י על עצמך *</label>
              <textarea rows={4} value={about} onChange={(e) => setAbout(e.target.value)} placeholder="קצת עליך, מה מחפש/ת..." />
              {errors.about && <div className="field-error">{errors.about}</div>}
            </div>

            <div className="field-group">
              <label className="field-label">📷 העלאת תמונה</label>
              <input ref={photoInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoChange} />
              <div className="file-pick" onClick={() => photoInputRef.current?.click()}>
                <span className={`file-name ${photoFile ? "selected" : ""}`}>{photoFile ? photoFile.name : "לחץ/י לבחירת קובץ"}</span>
                <div className="file-icon">
                  <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="field-group">
              <label className="field-label">😊 שם / כינוי *</label>
              <input type="text" className="text-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="איך לקרוא לך?" />
              {errors.name && <div className="field-error">{errors.name}</div>}
            </div>

            <div className="field-group">
              <label className="field-label">🔞 גיל *</label>
              <input type="number" className="text-input" value={age} onChange={(e) => setAge(e.target.value)} placeholder="גיל" min={18} max={99} />
              {errors.age && <div className="field-error">{errors.age}</div>}
            </div>

            <div className="field-group">
              <label className="field-label">🎭 הצד שלי *</label>
              <div className="select-group">
                {SIDE_OPTIONS.map((opt) => (
                  <div key={opt} className={`sel-btn ${side === opt ? "active" : ""}`} onClick={() => setSide(opt)}>{opt}</div>
                ))}
              </div>
              {errors.side && <div className="field-error">{errors.side}</div>}
            </div>

            <div className="field-group">
              <label className="field-label">🔗 סטטוס</label>
              <div className="select-group">
                {STATUS_OPTIONS.map((opt) => (
                  <div key={opt} className={`sel-btn ${status === opt ? "active" : ""}`} onClick={() => setStatus(opt)}>{opt}</div>
                ))}
              </div>
            </div>

            <div className="field-group">
              <label className="field-label">⛓️ ניסיון</label>
              <div className="select-group">
                {EXP_OPTIONS.map((opt) => (
                  <div key={opt} className={`sel-btn ${exp === opt ? "active" : ""}`} onClick={() => setExp(opt)}>{opt}</div>
                ))}
              </div>
            </div>

            <div className="field-group">
              <label className="field-label">❌ גבולות אדומים</label>
              <input type="text" className="text-input" value={limits} onChange={(e) => setLimits(e.target.value)} placeholder="מה הם הגבולות שלך?" />
            </div>

            <div className="field-group">
              <label className="field-label">🎯 מטרת הכניסה לקבוצה</label>
              <input type="text" className="text-input" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="חברויות, קשר, סקרנות..." />
            </div>

            {submitError && <div className="submit-error">{submitError}</div>}
          </div>
        )}

        {step === 3 && (
          <div className="step">
            <div className="success-wrap">
              <div className="success-icon">✓</div>
              <div className="success-title">נשלח לאישור</div>
              <div className="success-box">
                הפוסט התקבל במערכת.<br />
                <strong>לאחר שתלחץ על הכפתור למטה ותיכנס לקבוצה, עליך להמתין לאישור מנהל.</strong><br />
                המנהלים יבחנו את הפוסט ויפרסמו אותו במידה והוא עומד בתקנון.
              </div>
              <a href={JOIN_GROUP_URL} target="_blank" rel="noopener noreferrer" className="tg-btn">
                <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.11.02-1.93 1.23-5.46 3.62-.51.35-.98.53-1.39.52-.46-.01-1.33-.26-1.98-.48-.8-.27-1.43-.42-1.37-.89.03-.25.38-.51 1.03-.78 4.04-1.75 6.73-2.91 8.07-3.48 3.84-1.6 4.63-1.88 5.15-1.89.11 0 .37.03.54.17.14.12.18.28.2.45-.02.07-.02.13-.03.2z" /></svg>
                לחץ כאן לכניסה לקבוצה ←
              </a>
            </div>
          </div>
        )}
      </div>

      {step !== 3 && (
        <div className="bottom-bar">
          <button
            type="button"
            className="btn-primary"
            disabled={(step === 1 && !(agree1 && agree2)) || submitting}
            onClick={() => (step === 1 ? goStep(2) : handleSubmit())}
          >
            {step === 1 ? "המשך לכתיבת הפוסט" : submitting ? "שולח..." : "שלח לאישור"}
          </button>
          {step === 2 && (
            <button type="button" className="btn-back" onClick={() => goStep(1)}>חזרה</button>
          )}
        </div>
      )}
    </div>
  );
}

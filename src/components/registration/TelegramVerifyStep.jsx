import { useEffect, useRef, useState } from 'react';
import { checkTelegramStarted } from './useSubmitRegistration';

const BOT_URL = 'https://t.me/talkingbdsm_bot';
const POLL_INTERVAL_MS = 4000;

/**
 * Blocks a single registrant from reaching the success screen until we can
 * actually confirm they pressed Start on the bot — without this, their
 * balance match (or even just the "waiting for balance" DM) can never
 * reach them, and the admin only discovers that after the fact (see the
 * רועי צור/דניאל דרורי incident this was built in response to). Polls the
 * same verification-gated endpoint used at submit time, so no separate
 * public "does this username exist" lookup is introduced.
 */
export default function TelegramVerifyStep({ formData, onVerified }) {
  const [checking, setChecking] = useState(false);
  const stoppedRef = useRef(false);

  useEffect(() => {
    stoppedRef.current = false;
    let timer;

    async function poll() {
      if (stoppedRef.current) return;
      setChecking(true);
      const verified = await checkTelegramStarted({ formData, telegramUsername: formData.telegram }).catch(() => false);
      setChecking(false);
      if (verified) {
        onVerified();
        return;
      }
      timer = setTimeout(poll, POLL_INTERVAL_MS);
    }

    poll();
    return () => {
      stoppedRef.current = true;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleManualCheck() {
    setChecking(true);
    const verified = await checkTelegramStarted({ formData, telegramUsername: formData.telegram }).catch(() => false);
    setChecking(false);
    if (verified) onVerified();
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12 text-center">
      <h2 className="mb-3 text-xl font-bold">כמעט סיימנו — נשאר רק לאשר את הטלגרם</h2>
      <p className="mb-4 leading-relaxed text-muted-foreground">
        פתחנו לכם חלון עם הבוט שלנו <strong>@talkingbdsm_bot</strong>. עדיין לא זיהינו
        שלחצתם שם <strong>Start</strong> — בלי זה לא נוכל לשלוח לכם הודעות על איזון, אז
        ההרשמה עוד לא הושלמה.
      </p>
      <ol className="mb-6 list-decimal space-y-1 pr-5 text-right leading-relaxed">
        <li>עברו לחלון/לאפליקציית טלגרם שנפתחה.</li>
        <li>
          לחצו <strong>Start</strong> בשיחה עם הבוט. אם החלון לא נפתח,
          {' '}
          <a href={BOT_URL} target="_blank" rel="noreferrer" className="font-bold text-primary hover:underline">
            לחצו כאן לפתיחתו
          </a>
          .
        </li>
        <li>חזרו לכאן — אנחנו בודקים אוטומטית ברקע.</li>
      </ol>
      <button
        type="button"
        onClick={handleManualCheck}
        disabled={checking}
        className="w-full rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground transition-transform hover:scale-105 disabled:opacity-60"
      >
        {checking ? 'בודק...' : 'בדקתי, נסה שוב'}
      </button>
    </div>
  );
}

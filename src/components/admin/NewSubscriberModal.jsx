import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { PAYMENT_METHODS } from '../../firebase/crm';
import { getForumUserByPhone } from '../../firebase/forumUsers';
import { dateToLocalInputStr } from '../../utils/dateFormat';

const todayPlusYear = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return dateToLocalInputStr(d);
};

const todayPlusDay = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return dateToLocalInputStr(d);
};

const NewSubscriberModal = ({ onClose, onSubmit, initialValues }) => {
  const [form, setForm] = useState({
    firstName: initialValues?.firstName || '',
    lastName: initialValues?.lastName || '',
    phoneNumber: initialValues?.phoneNumber || '',
    paymentMethod: PAYMENT_METHODS[0],
    expiryDate: todayPlusYear(),
    tier: 'year',
  });
  // Optional site-login account (nickname + password), created and linked to
  // the new subscriber in the same step — this used to only be possible
  // afterwards, from a separate button on the subscriber's card, which the
  // admin couldn't find while still on the "new subscriber" form.
  const [createLogin, setCreateLogin] = useState(false);
  const [loginNickname, setLoginNickname] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // If the visitor already self-registered a login account with their own
  // chosen password (the public "בקשה להצטרפות" form) before an admin got to
  // approving them, we should approve/link *that* account instead of
  // offering to create a second one and overwrite their password.
  const [existingLoginAccount, setExistingLoginAccount] = useState(undefined); // undefined=checking, null=none
  useEffect(() => {
    let cancelled = false;
    setExistingLoginAccount(undefined);
    if (form.phoneNumber.length !== 10) { setExistingLoginAccount(null); return; }
    getForumUserByPhone(form.phoneNumber).then((fu) => {
      if (cancelled) return;
      setExistingLoginAccount(fu || null);
      if (fu) setCreateLogin(true); // default to approving/linking their self-chosen account
    }).catch(() => { if (!cancelled) setExistingLoginAccount(null); });
    return () => { cancelled = true; };
  }, [form.phoneNumber]);

  const handlePhoneChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 0 && !value.startsWith('0')) value = '0' + value;
    if (value.length > 10) value = value.substring(0, 10);
    setForm((f) => ({ ...f, phoneNumber: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    // Gold is lifetime — no expiry date to fill in, that's the whole point.
    if (!form.firstName.trim() || !form.phoneNumber || (form.tier !== 'gold' && !form.expiryDate)) {
      setError('נא למלא שם פרטי, טלפון ותאריך תפוגה');
      return;
    }
    if (createLogin && !existingLoginAccount) {
      if (!loginNickname.trim()) { setError('נא לבחור כינוי לחשבון הכניסה'); return; }
      if (loginPassword.length < 4) { setError('סיסמה חייבת להכיל לפחות 4 תווים'); return; }
    }
    setSaving(true);
    try {
      const login = !createLogin ? null
        : existingLoginAccount ? { mode: 'link-existing', forumUserId: existingLoginAccount.id }
        : { mode: 'create', nickname: loginNickname.trim(), password: loginPassword };
      await onSubmit({ ...form, login });
    } catch (err) {
      setError(err.message || 'שגיאה ביצירת המנוי');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#121218] border border-[rgba(255,255,255,0.08)] rounded-2xl w-full max-w-md p-4 md:p-6"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">מנוי חדש</h3>
          <button onClick={onClose} className="text-[#a9a9b2] hover:text-white">
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase font-bold text-[#94A3B8]">שם פרטי *</label>
              <input
                type="text"
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                className="w-full bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-3 rounded-xl focus:border-[#ff5708] outline-none text-white text-right"
                required
              />
            </div>
            <div>
              <label className="text-xs uppercase font-bold text-[#94A3B8]">שם משפחה</label>
              <input
                type="text"
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                className="w-full bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-3 rounded-xl focus:border-[#ff5708] outline-none text-white text-right"
              />
            </div>
          </div>

          <div>
            <label className="text-xs uppercase font-bold text-[#94A3B8]">מספר טלפון *</label>
            <input
              type="tel"
              value={form.phoneNumber}
              onChange={handlePhoneChange}
              placeholder="05XXXXXXXX"
              maxLength="10"
              className="w-full bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-3 rounded-xl focus:border-[#ff5708] outline-none text-white text-right"
              required
            />
          </div>

          <div>
            <label className="text-xs uppercase font-bold text-[#94A3B8]">אופן תשלום</label>
            <select
              value={form.paymentMethod}
              onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}
              className="w-full bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-3 rounded-xl focus:border-[#ff5708] outline-none text-white text-right"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs uppercase font-bold text-[#94A3B8]">תאריך תפוגה {form.tier !== 'gold' && '*'}</label>
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, expiryDate: todayPlusDay(), tier: 'day' }))}
                className={`flex-1 border py-2 rounded-lg font-bold text-xs ${form.tier === 'day' ? 'bg-[#ff5708] border-[#ff5708] text-white' : 'bg-[#1f1f23] hover:bg-[#2a292e] border-[rgba(255,255,255,0.08)] text-white'}`}
              >
                מנוי יומי
              </button>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, expiryDate: todayPlusYear(), tier: 'year' }))}
                className={`flex-1 border py-2 rounded-lg font-bold text-xs ${form.tier === 'year' ? 'bg-[#ff5708] border-[#ff5708] text-white' : 'bg-[#1f1f23] hover:bg-[#2a292e] border-[rgba(255,255,255,0.08)] text-white'}`}
              >
                מנוי שנתי
              </button>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, expiryDate: '', tier: 'gold' }))}
                className={`flex-1 border py-2 rounded-lg font-bold text-xs ${form.tier === 'gold' ? 'bg-yellow-500 border-yellow-500 text-black' : 'bg-[#1f1f23] hover:bg-[#2a292e] border-[rgba(255,255,255,0.08)] text-yellow-400'}`}
              >
                ⭐ זהב (לכל החיים)
              </button>
            </div>
            {form.tier === 'gold' ? (
              <p className="text-xs text-yellow-400/80 p-3 bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] rounded-xl">
                מנוי זהב — ללא הגבלת זמן, לעולם לא פג תוקף. אין צורך בתאריך תפוגה.
              </p>
            ) : (
              <input
                type="date"
                value={form.expiryDate}
                onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))}
                className="w-full bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-3 rounded-xl focus:border-[#ff5708] outline-none text-white text-right"
                required
              />
            )}
          </div>

          <div className="border-t border-[rgba(255,255,255,0.08)] pt-3">
            {existingLoginAccount ? (
              <label className="flex items-center gap-2 text-sm font-bold text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={createLogin}
                  onChange={(e) => setCreateLogin(e.target.checked)}
                  className="w-4 h-4"
                />
                🔑 למספר הזה כבר יש חשבון כניסה עצמאי (כינוי: {existingLoginAccount.nickname}) — לאשר אותו ולקשר למנוי
              </label>
            ) : (
              <>
                <label className="flex items-center gap-2 text-sm font-bold text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createLogin}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setCreateLogin(checked);
                      if (checked && !loginNickname) {
                        setLoginNickname((form.firstName || '').replace(/\s+/g, '_').slice(0, 30));
                      }
                    }}
                    className="w-4 h-4"
                  />
                  🔑 גם ליצור לו חשבון כניסה לאתר (כינוי + סיסמה)
                </label>
                {createLogin && (
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="text-xs uppercase font-bold text-[#94A3B8]">כינוי *</label>
                      <input
                        type="text"
                        value={loginNickname}
                        onChange={(e) => setLoginNickname(e.target.value)}
                        className="w-full bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-3 rounded-xl focus:border-[#ff5708] outline-none text-white text-right"
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase font-bold text-[#94A3B8]">סיסמה זמנית *</label>
                      <input
                        type="text"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="לפחות 4 תווים"
                        className="w-full bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-3 rounded-xl focus:border-[#ff5708] outline-none text-white text-right"
                      />
                    </div>
                    <p className="col-span-2 text-xs text-[#94A3B8]">המנוי יחויב לבחור סיסמה משלו בהתחברות הראשונה.</p>
                  </div>
                )}
              </>
            )}
          </div>

          {error && <p className="text-[#ffb4ab] text-sm">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-[#ff5708] hover:bg-[#ff7a29] disabled:opacity-50 text-white px-6 py-2 rounded-xl font-bold"
            >
              {saving ? 'יוצר...' : 'צור מנוי'}
            </button>
            <button type="button" onClick={onClose} className="bg-[#1f1f23] hover:bg-[#2a292e] text-white px-6 py-2 rounded-xl font-bold">
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default NewSubscriberModal;

import { useState, useEffect } from 'react';
import { X, Trash2, Plus } from 'lucide-react';
import { getUserCrm, setUserSource, addPaymentRecord, deletePaymentRecord, CRM_SOURCES, PAYMENT_METHODS } from '../../firebase/crm';
import AdminLoader from './AdminLoader';
import PhoneLink from '../PhoneLink';
import SubscriptionBadge from './SubscriptionBadge';
import SubscriptionEditor from './SubscriptionEditor';

const todayStr = () => new Date().toISOString().split('T')[0];

const UserCrmModal = ({ user, onClose, onSubscriptionAction }) => {
  const [loading, setLoading] = useState(true);
  const [crm, setCrm] = useState({ source: '', sourceNote: '', payments: [] });
  const [savingSource, setSavingSource] = useState(false);
  const [newPayment, setNewPayment] = useState({ date: todayStr(), amount: '', method: PAYMENT_METHODS[0], note: '' });
  const [addingPayment, setAddingPayment] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getUserCrm(user.id).then((data) => {
      if (!cancelled) {
        setCrm(data);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [user.id]);

  const handleSourceChange = async (source) => {
    setCrm((c) => ({ ...c, source }));
    setSavingSource(true);
    try {
      await setUserSource(user.id, source, crm.sourceNote);
    } finally {
      setSavingSource(false);
    }
  };

  const handleSourceNoteBlur = async () => {
    setSavingSource(true);
    try {
      await setUserSource(user.id, crm.source, crm.sourceNote);
    } finally {
      setSavingSource(false);
    }
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    setAddingPayment(true);
    try {
      await addPaymentRecord(user.id, newPayment);
      const fresh = await getUserCrm(user.id);
      setCrm(fresh);
      setNewPayment({ date: todayStr(), amount: '', method: PAYMENT_METHODS[0], note: '' });
    } catch (err) {
      alert(err.message || 'שגיאה בהוספת תשלום');
    } finally {
      setAddingPayment(false);
    }
  };

  const handleDeletePayment = async (recordId) => {
    if (!confirm('למחוק את רשומת התשלום הזו?')) return;
    await deletePaymentRecord(user.id, recordId);
    const fresh = await getUserCrm(user.id);
    setCrm(fresh);
  };

  const sortedPayments = [...crm.payments].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#121218] border border-[rgba(255,255,255,0.08)] rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-4 md:p-6"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">כרטיס לקוח — {user.name}</h3>
          <button onClick={onClose} className="text-[#a9a9b2] hover:text-white">
            <X size={22} />
          </button>
        </div>

        {loading ? (
          <AdminLoader />
        ) : (
          <div className="space-y-6">
            {/* Basic profile */}
            <div className="bg-black/20 border border-[rgba(255,255,255,0.08)] rounded-xl p-3 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs font-bold ${user.level === 'admin' ? 'bg-[#e11d48]' : user.level === 'gold' ? 'bg-yellow-600' : user.level === 'registered' ? 'bg-green-600' : user.level === 'blocked' ? 'bg-[#93000a]' : 'bg-[#353439]'}`}>
                  {user.level}
                </span>
                <span className={`px-2 py-1 rounded text-xs font-bold ${user.gender === 'male' ? 'bg-blue-600' : user.gender === 'female' ? 'bg-pink-600' : 'bg-[#353439]'}`}>
                  {user.gender === 'male' ? 'זכר' : user.gender === 'female' ? 'נקבה' : 'לא מוגדר'}
                </span>
              </div>
              <p className="text-sm text-[#e4e1e7]">
                טלפון: <PhoneLink phone={user.phoneNumber}>{user.phoneNumber}</PhoneLink>
              </p>
              {user.telegramUsername && (
                <p className="text-sm text-[#e4e1e7]">Telegram: @{user.telegramUsername}</p>
              )}
              <div className="flex flex-col gap-1.5 pt-1">
                <SubscriptionBadge user={user} kind="parties" />
                <SubscriptionBadge user={user} kind="exchangeParties" />
              </div>
              {onSubscriptionAction && (
                <div className="pt-1">
                  <SubscriptionEditor onAction={onSubscriptionAction} />
                </div>
              )}
            </div>

            {/* Acquisition source */}
            <div>
              <label className="text-xs uppercase font-bold text-[#94A3B8]">מאיפה הגיע</label>
              <select
                value={crm.source}
                onChange={(e) => handleSourceChange(e.target.value)}
                className="w-full mt-1 bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-3 rounded-xl focus:border-[#e11d48] outline-none text-white text-right"
              >
                <option value="">לא צוין</option>
                {CRM_SOURCES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <input
                type="text"
                value={crm.sourceNote}
                onChange={(e) => setCrm((c) => ({ ...c, sourceNote: e.target.value }))}
                onBlur={handleSourceNoteBlur}
                placeholder="פרטים נוספים (למשל: שם החבר שהמליץ)"
                className="w-full mt-2 bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-2.5 rounded-xl focus:border-[#e11d48] outline-none text-white text-right text-sm"
              />
              {savingSource && <p className="text-xs text-[#94A3B8] mt-1">שומר...</p>}
            </div>

            {/* Payment history */}
            <div>
              <label className="text-xs uppercase font-bold text-[#94A3B8] block mb-2">היסטוריית תשלומים</label>

              {sortedPayments.length === 0 ? (
                <p className="text-[#94A3B8] text-sm mb-3">אין תשלומים רשומים.</p>
              ) : (
                <div className="space-y-2 mb-3">
                  {sortedPayments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] rounded-xl p-2.5">
                      <div className="text-sm">
                        <span className="font-bold text-white">{p.date}</span>
                        {p.amount != null && <span className="text-green-400 font-bold mx-2">₪{p.amount}</span>}
                        <span className="text-[#a9a9b2]">{p.method}</span>
                        {p.note && <span className="text-[#94A3B8] mx-2">— {p.note}</span>}
                      </div>
                      <button onClick={() => handleDeletePayment(p.id)} className="text-[#ffb4ab] hover:text-[#ffb4ab]">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleAddPayment} className="grid grid-cols-2 gap-2 bg-black/20 border border-[rgba(255,255,255,0.08)] rounded-xl p-3">
                <input
                  type="date"
                  value={newPayment.date}
                  onChange={(e) => setNewPayment((p) => ({ ...p, date: e.target.value }))}
                  className="bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-2 rounded-lg text-white text-sm"
                  required
                />
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={newPayment.amount}
                  onChange={(e) => setNewPayment((p) => ({ ...p, amount: e.target.value }))}
                  placeholder="סכום (₪)"
                  className="bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-2 rounded-lg text-white text-sm text-right"
                />
                <select
                  value={newPayment.method}
                  onChange={(e) => setNewPayment((p) => ({ ...p, method: e.target.value }))}
                  className="col-span-2 bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-2 rounded-lg text-white text-sm text-right"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={newPayment.note}
                  onChange={(e) => setNewPayment((p) => ({ ...p, note: e.target.value }))}
                  placeholder="הערה (אופציונלי)"
                  className="col-span-2 bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-2 rounded-lg text-white text-sm text-right"
                />
                <button
                  type="submit"
                  disabled={addingPayment}
                  className="col-span-2 bg-[#e11d48] hover:bg-[#be0037] disabled:opacity-50 text-white py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1.5"
                >
                  <Plus size={16} /> הוסף תשלום
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserCrmModal;

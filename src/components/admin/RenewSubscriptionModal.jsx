import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { PAYMENT_METHODS } from '../../firebase/crm';
import { dateToLocalInputStr } from '../../utils/dateFormat';

const todayPlusYear = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return dateToLocalInputStr(d);
};

const RenewSubscriptionModal = ({ user, onClose, onSubmit }) => {
  const [expiryDate, setExpiryDate] = useState(todayPlusYear());
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await onSubmit({ expiryDate, paymentMethod });
    } catch (err) {
      setError(err.message || 'שגיאה בחידוש המנוי');
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
          <h3 className="text-xl font-bold">חידוש מנוי — {user.name}</h3>
          <button onClick={onClose} className="text-[#a9a9b2] hover:text-white">
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs uppercase font-bold text-[#94A3B8]">תאריך תפוגה חדש *</label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-3 rounded-xl focus:border-[#ff5708] outline-none text-white text-right"
              required
            />
          </div>

          <div>
            <label className="text-xs uppercase font-bold text-[#94A3B8]">אופן תשלום</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-3 rounded-xl focus:border-[#ff5708] outline-none text-white text-right"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {error && <p className="text-[#ffb4ab] text-sm">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white px-6 py-2 rounded-xl font-bold"
            >
              {saving ? 'מחדש...' : 'חדש מנוי'}
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

export default RenewSubscriptionModal;

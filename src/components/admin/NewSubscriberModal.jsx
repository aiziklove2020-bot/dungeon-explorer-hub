import { useState } from 'react';
import { X } from 'lucide-react';
import { PAYMENT_METHODS } from '../../firebase/crm';

const todayPlusYear = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split('T')[0];
};

const NewSubscriberModal = ({ onClose, onSubmit }) => {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    paymentMethod: PAYMENT_METHODS[0],
    expiryDate: todayPlusYear(),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handlePhoneChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 0 && !value.startsWith('0')) value = '0' + value;
    if (value.length > 10) value = value.substring(0, 10);
    setForm((f) => ({ ...f, phoneNumber: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.firstName.trim() || !form.phoneNumber || !form.expiryDate) {
      setError('נא למלא שם פרטי, טלפון ותאריך תפוגה');
      return;
    }
    setSaving(true);
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err.message || 'שגיאה ביצירת המנוי');
    } finally {
      setSaving(false);
    }
  };

  return (
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
            <label className="text-xs uppercase font-bold text-[#94A3B8]">תאריך תפוגה *</label>
            <input
              type="date"
              value={form.expiryDate}
              onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))}
              className="w-full bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-3 rounded-xl focus:border-[#ff5708] outline-none text-white text-right"
              required
            />
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
    </div>
  );
};

export default NewSubscriberModal;

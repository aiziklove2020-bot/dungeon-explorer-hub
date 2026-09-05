import { RotateCcw, Check, X, RotateCw, Trash2, KeyRound } from 'lucide-react';
import AdminLoader from './AdminLoader';
import PhoneLink from '../PhoneLink';
import useAdminSection from '../../hooks/useAdminSection';
import { getAllAdvertisers, setAdvertiserStatus, deleteAdvertiser, resetAdvertiserPassword } from '../../firebase/advertisers';

const STATUS_LABEL = {
  pending: 'ממתין לאישור',
  approved: 'מאושר',
  rejected: 'נדחה',
};

const STATUS_BADGE_CLASS = {
  pending: 'bg-amber-600',
  approved: 'bg-green-600',
  rejected: 'bg-red-900',
};

const AdvertisersSection = ({ showSaved }) => {
  const { data, loading, reload } = useAdminSection(getAllAdvertisers);
  const advertisers = data || [];

  const handleSetStatus = async (id, status) => {
    try {
      await setAdvertiserStatus(id, status);
      await reload();
      showSaved();
    } catch (error) {
      alert(error.message || 'שגיאה בעדכון סטטוס');
    }
  };

  const handleResetPassword = async (id, businessName) => {
    const suggested = Math.random().toString(36).slice(-8);
    const newPassword = prompt(
      `סיסמה חדשה למפרסם "${businessName || 'ללא שם עסק'}" (אפשר לשנות, מינימום 4 תווים):`,
      suggested
    );
    if (!newPassword) return;
    try {
      await resetAdvertiserPassword(id, newPassword);
      alert(`הסיסמה עודכנה. הסיסמה החדשה: ${newPassword}`);
      showSaved();
    } catch (error) {
      alert(error.message || 'שגיאה באיפוס סיסמה');
    }
  };

  const handleDelete = async (id, businessName) => {
    if (!confirm(`למחוק לצמיתות את המפרסם "${businessName || 'ללא שם עסק'}"?`)) return;
    try {
      await deleteAdvertiser(id);
      await reload();
      showSaved();
    } catch (error) {
      alert(error.message || 'שגיאה במחיקת מפרסם');
    }
  };

  return (
    <div className="bg-[#121218] backdrop-blur-2xl border border-white/5 p-4 md:p-6 rounded-xl md:rounded-2xl space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <h2 className="text-xl md:text-2xl font-bold">ניהול מפרסמים</h2>
        <button
          onClick={reload}
          className="bg-blue-600 hover:bg-blue-500 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-xl font-bold flex items-center gap-2 text-xs md:text-sm"
        >
          <RotateCcw size={14} className="md:w-4 md:h-4" /> רענון
        </button>
      </div>

      {loading ? (
        <AdminLoader />
      ) : advertisers.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">
          <p>אין בקשות הרשמה של מפרסמים</p>
        </div>
      ) : (
        <div className="space-y-4">
          {advertisers.map((adv) => (
            <div key={adv.id} className="bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-3 md:p-4 rounded-xl">
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <strong className="text-lg">{adv.businessName || 'ללא שם עסק'}</strong>
                    <span className="px-2 py-1 rounded text-xs font-bold bg-indigo-600">מפרסם</span>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${STATUS_BADGE_CLASS[adv.status] || 'bg-zinc-700'}`}>
                      {STATUS_LABEL[adv.status] || adv.status}
                    </span>
                  </div>
                  {adv.contactName && <p className="text-zinc-400 text-sm">איש קשר: {adv.contactName}</p>}
                  {adv.phoneNumber && (
                    <p className="text-zinc-400 text-sm">
                      טלפון: <PhoneLink phone={adv.phoneNumber}>{adv.phoneNumber}</PhoneLink>
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {adv.status !== 'approved' && (
                    <button
                      onClick={() => handleSetStatus(adv.id, 'approved')}
                      className="bg-green-600 hover:bg-green-500 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-xl font-bold text-xs md:text-sm flex items-center gap-2"
                    >
                      <Check size={14} /> אישור
                    </button>
                  )}
                  {adv.status !== 'rejected' && (
                    <button
                      onClick={() => handleSetStatus(adv.id, 'rejected')}
                      className="bg-red-900 hover:bg-red-800 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-xl font-bold text-xs md:text-sm flex items-center gap-2"
                    >
                      <X size={14} /> דחייה
                    </button>
                  )}
                  {adv.status !== 'pending' && (
                    <button
                      onClick={() => handleSetStatus(adv.id, 'pending')}
                      className="bg-zinc-700 hover:bg-zinc-600 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-xl font-bold text-xs md:text-sm flex items-center gap-2"
                    >
                      <RotateCw size={14} /> איפוס לממתין
                    </button>
                  )}
                  <button
                    onClick={() => handleResetPassword(adv.id, adv.businessName)}
                    className="bg-zinc-700 hover:bg-zinc-600 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-xl font-bold text-xs md:text-sm flex items-center gap-2"
                  >
                    <KeyRound size={14} /> אפס סיסמה
                  </button>
                  <button
                    onClick={() => handleDelete(adv.id, adv.businessName)}
                    className="bg-zinc-800 hover:bg-red-900 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-xl font-bold text-xs md:text-sm flex items-center gap-2"
                  >
                    <Trash2 size={14} /> מחיקה
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdvertisersSection;

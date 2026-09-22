import { useState } from 'react';
import { RotateCcw, Check, X, RotateCw, Trash2, KeyRound, Search } from 'lucide-react';
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
  rejected: 'bg-[#93000a]',
};

const AdvertisersSection = ({ showSaved }) => {
  const { data, loading, reload } = useAdminSection(getAllAdvertisers);
  const advertisers = data || [];
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filteredAdvertisers = advertisers.filter(adv => {
    const q = search.trim().toLowerCase();
    const matchesQuery = !q || [adv.businessName, adv.contactName, adv.phoneNumber].some(v => (v || '').toLowerCase().includes(q));
    const matchesStatus = !statusFilter || adv.status === statusFilter;
    return matchesQuery && matchesStatus;
  });
  const counts = advertisers.reduce((acc, a) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc; }, {});

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

      {!loading && advertisers.length > 0 && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
              <p className="text-[#94A3B8] text-xs font-bold">סה״כ מפרסמים</p>
              <p className="text-2xl font-bold mt-1">{advertisers.length}</p>
            </div>
            <div className="bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
              <p className="text-[#94A3B8] text-xs font-bold">ממתינים לאישור</p>
              <p className="text-2xl font-bold mt-1" style={{ color: '#f59e0b' }}>{counts.pending || 0}</p>
            </div>
            <div className="bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
              <p className="text-[#94A3B8] text-xs font-bold">מאושרים</p>
              <p className="text-2xl font-bold mt-1" style={{ color: '#10B981' }}>{counts.approved || 0}</p>
            </div>
            <div className="bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
              <p className="text-[#94A3B8] text-xs font-bold">נדחו</p>
              <p className="text-2xl font-bold mt-1" style={{ color: '#ffb4ab' }}>{counts.rejected || 0}</p>
            </div>
          </div>
          <div className="bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] rounded-xl p-3 flex flex-col md:flex-row gap-3 items-stretch md:items-center">
            <div className="relative flex-1">
              <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="חיפוש לפי שם עסק, איש קשר או טלפון..."
                className="w-full bg-[#121218] rounded-xl pr-9 pl-3 py-2 text-white placeholder:text-[#94A3B8] outline-none focus:ring-1 focus:ring-[#ff5708]"
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {[{ id: '', label: 'הכל' }, { id: 'pending', label: 'ממתין' }, { id: 'approved', label: 'מאושר' }, { id: 'rejected', label: 'נדחה' }].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStatusFilter(f.id)}
                  className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap"
                  style={statusFilter === f.id ? { background: '#ff5708', color: '#fff' } : { background: '#121218', color: '#a9a9b2' }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
      {loading ? (
        <AdminLoader />
      ) : advertisers.length === 0 ? (
        <div className="text-center py-12 text-[#94A3B8]">
          <p>אין בקשות הרשמה של מפרסמים</p>
        </div>
      ) : filteredAdvertisers.length === 0 ? (
        <div className="text-center py-12 text-[#94A3B8]">
          <p>לא נמצאו מפרסמים התואמים לסינון</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAdvertisers.map((adv) => (
            <div key={adv.id} className="bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-3 md:p-4 rounded-xl">
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <strong className="text-lg">{adv.businessName || 'ללא שם עסק'}</strong>
                    <span className="px-2 py-1 rounded text-xs font-bold bg-indigo-600">מפרסם</span>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${STATUS_BADGE_CLASS[adv.status] || 'bg-[#2a292e]'}`}>
                      {STATUS_LABEL[adv.status] || adv.status}
                    </span>
                  </div>
                  {adv.contactName && <p className="text-[#a9a9b2] text-sm">איש קשר: {adv.contactName}</p>}
                  {adv.phoneNumber && (
                    <p className="text-[#a9a9b2] text-sm">
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
                      className="bg-[#93000a] hover:bg-[#be0037] text-white px-3 md:px-4 py-1.5 md:py-2 rounded-xl font-bold text-xs md:text-sm flex items-center gap-2"
                    >
                      <X size={14} /> דחייה
                    </button>
                  )}
                  {adv.status !== 'pending' && (
                    <button
                      onClick={() => handleSetStatus(adv.id, 'pending')}
                      className="bg-[#2a292e] hover:bg-[#353439] text-white px-3 md:px-4 py-1.5 md:py-2 rounded-xl font-bold text-xs md:text-sm flex items-center gap-2"
                    >
                      <RotateCw size={14} /> איפוס לממתין
                    </button>
                  )}
                  <button
                    onClick={() => handleResetPassword(adv.id, adv.businessName)}
                    className="bg-[#2a292e] hover:bg-[#353439] text-white px-3 md:px-4 py-1.5 md:py-2 rounded-xl font-bold text-xs md:text-sm flex items-center gap-2"
                  >
                    <KeyRound size={14} /> אפס סיסמה
                  </button>
                  <button
                    onClick={() => handleDelete(adv.id, adv.businessName)}
                    className="bg-[#1f1f23] hover:bg-[#93000a] text-white px-3 md:px-4 py-1.5 md:py-2 rounded-xl font-bold text-xs md:text-sm flex items-center gap-2"
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

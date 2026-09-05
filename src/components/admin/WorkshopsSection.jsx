import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, X, ChevronDown, ChevronUp, UserPlus, UserCheck } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import AdminLoader from './AdminLoader';
import Loader from '../Loader';
import ImageUpload from '../ImageUpload';
import {
  getAllWorkshopsForAdmin,
  createWorkshop,
  updateWorkshop,
  deleteWorkshop,
  getRegistrationsByWorkshop,
  registerToWorkshop,
  unregisterFromWorkshop,
  updateWorkshopRegistration
} from '../../firebase/workshops';
import { getUserByPhone, createUser } from '../../firebase/users';
import { uploadPartyImage } from '../../firebase/storage';

const WorkshopsSection = ({ showSaved }) => {
  const { t } = useLanguage();
  const [workshops, setWorkshops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    imageUrl: '',
    description: '',
    instructor: '',
    price: '',
    date: '',
    duration: '',
    maxParticipants: '',
    active: true
  });
  const [saving, setSaving] = useState(false);
  const [regCounts, setRegCounts] = useState({});
  const [regsByWorkshop, setRegsByWorkshop] = useState({});
  const [expandedId, setExpandedId] = useState(null);
  const [addRegPhone, setAddRegPhone] = useState({});
  const [addRegName, setAddRegName] = useState({});
  const [addingRegForId, setAddingRegForId] = useState(null);
  const [removingRegId, setRemovingRegId] = useState(null);
  const [convertingRegId, setConvertingRegId] = useState(null);

  const loadWorkshops = async () => {
    try {
      setLoading(true);
      const list = await getAllWorkshopsForAdmin();
      setWorkshops(list);
      const counts = {};
      const regsMap = {};
      for (const w of list) {
        const regs = await getRegistrationsByWorkshop(w.id);
        counts[w.id] = regs.length;
        regsMap[w.id] = regs;
      }
      setRegCounts(counts);
      setRegsByWorkshop(regsMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadRegsForWorkshop = async (workshopId) => {
    const regs = await getRegistrationsByWorkshop(workshopId);
    setRegsByWorkshop(prev => ({ ...prev, [workshopId]: regs }));
    setRegCounts(prev => ({ ...prev, [workshopId]: regs.length }));
  };

  useEffect(() => {
    loadWorkshops();
  }, []);

  const openAdd = () => {
    setEditingId(null);
    setIsAdding(true);
    setFormData({ title: '', imageUrl: '', description: '', instructor: '', price: '', date: '', duration: '', maxParticipants: '', active: true });
  };

  const openEdit = (w) => {
    setIsAdding(false);
    setEditingId(w.id);
    const dateVal = w.date && (w.date.toDate ? w.date.toDate() : new Date(w.date));
    setFormData({
      title: w.title || '',
      imageUrl: w.imageUrl || '',
      description: w.description || '',
      instructor: w.instructor || '',
      price: w.price != null ? String(w.price) : '',
      date: dateVal && !isNaN(dateVal?.getTime()) ? dateVal.toISOString().slice(0, 10) : '',
      duration: w.duration || '',
      maxParticipants: w.maxParticipants != null ? String(w.maxParticipants) : '',
      active: w.active !== false
    });
  };

  const closeForm = () => {
    setEditingId(null);
    setIsAdding(false);
  };

  const handleSave = async () => {
    if (!formData.title?.trim()) {
      alert(t('workshops.titleRequired'));
      return;
    }
    setSaving(true);
    try {
      let imageUrl = formData.imageUrl;
      if (imageUrl && imageUrl.startsWith('data:image/')) {
        const base64Data = imageUrl.split(',')[1];
        const mimeType = imageUrl.match(/data:([^;]+);/)?.[1] || 'image/jpeg';
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimeType });
        const file = new File([blob], `workshop-${Date.now()}.jpg`, { type: mimeType });
        const res = await uploadPartyImage(file, `workshop_${Date.now()}`);
        imageUrl = typeof res === 'string' ? res : res?.url || imageUrl;
      }
      const payload = {
        title: formData.title.trim(),
        imageUrl: imageUrl || '',
        description: formData.description?.trim() || '',
        instructor: formData.instructor.trim(),
        price: formData.price === '' ? null : Number(formData.price),
        date: formData.date?.trim() || null,
        duration: formData.duration?.trim() || '',
        maxParticipants: formData.maxParticipants === '' ? null : (Number(formData.maxParticipants) || null),
        active: formData.active
      };
      if (editingId) {
        await updateWorkshop(editingId, payload);
      } else {
        await createWorkshop(payload);
      }
      showSaved?.();
      closeForm();
      loadWorkshops();
    } catch (err) {
      alert(t('error') + ': ' + (err.message || ''));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(t('workshops.confirmDelete'))) return;
    try {
      await deleteWorkshop(id);
      showSaved?.();
      loadWorkshops();
      closeForm();
    } catch (err) {
      alert(t('error') + ': ' + (err.message || ''));
    }
  };

  const handleRemoveRegistrant = async (workshopId, userId) => {
    setRemovingRegId(userId);
    try {
      await unregisterFromWorkshop(workshopId, userId);
      await loadRegsForWorkshop(workshopId);
      showSaved?.();
    } catch (err) {
      alert(t('error') + ': ' + (err.message || ''));
    } finally {
      setRemovingRegId(null);
    }
  };

  const handleAddRegistrant = async (workshopId) => {
    const phone = (addRegPhone[workshopId] || '').replace(/\D/g, '');
    if (phone.length !== 10 || !phone.startsWith('05')) {
      alert(t('workshops.phoneRequired'));
      return;
    }
    setAddingRegForId(workshopId);
    try {
      let user = await getUserByPhone(phone);
      if (!user) {
        user = { id: phone, phoneNumber: phone, name: addRegName[workshopId] || '' };
      }
      await registerToWorkshop(workshopId, user);
      setAddRegPhone(prev => ({ ...prev, [workshopId]: '' }));
      setAddRegName(prev => ({ ...prev, [workshopId]: '' }));
      await loadRegsForWorkshop(workshopId);
      showSaved?.();
    } catch (err) {
      alert(t('error') + ': ' + (err.message || ''));
    } finally {
      setAddingRegForId(null);
    }
  };

  const toggleExpanded = (id) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const handleConvertToUser = async (reg, workshopId) => {
    if (!reg.isGuest || !reg.phoneNumber || !reg.userName) return;
    setConvertingRegId(reg.id);
    try {
      const newUser = await createUser(reg.phoneNumber, reg.userName, 'male');
      await updateWorkshopRegistration(reg.id, { userId: newUser.id, isGuest: false });
      await loadRegsForWorkshop(workshopId);
      showSaved?.();
    } catch (err) {
      alert(t('error') + ': ' + (err.message || ''));
    } finally {
      setConvertingRegId(null);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{t('workshops.title')}</h2>
        <button
          type="button"
          onClick={openAdd}
          className="bg-[#e11d48] hover:bg-[#be0037] text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2"
        >
          <Plus size={18} />
          {t('workshops.add')}
        </button>
      </div>

      {loading ? (
        <AdminLoader />
      ) : (
        <>
          {workshops.length === 0 && !isAdding && (
            <p className="text-[#94A3B8]">{t('workshops.none')}</p>
          )}

          {(isAdding || editingId) && (
            <div className="bg-[#121218] border border-white/5 p-6 rounded-2xl space-y-4">
              <h3 className="font-bold">{editingId ? t('workshops.edit') : t('workshops.add')}</h3>
              <div className="grid gap-4">
                <div>
                  <label className="block text-xs text-[#94A3B8] mb-1">{t('workshops.fieldTitle')}</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] rounded-lg p-2 text-white text-right"
                    placeholder="נושא הסדנא"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#94A3B8] mb-1">{t('workshops.fieldImage')}</label>
                  <ImageUpload
                    value={formData.imageUrl}
                    onChange={v => setFormData(prev => ({ ...prev, imageUrl: v }))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#94A3B8] mb-1">תיאור</label>
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] rounded-lg p-2 text-white text-right"
                    placeholder="תיאור קצר של הסדנא..."
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#94A3B8] mb-1">{t('workshops.fieldInstructor')}</label>
                  <input
                    type="text"
                    value={formData.instructor}
                    onChange={e => setFormData(prev => ({ ...prev, instructor: e.target.value }))}
                    className="w-full bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] rounded-lg p-2 text-white text-right"
                    placeholder="שם המדריך"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#94A3B8] mb-1">{t('workshops.fieldPrice')}</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.price}
                    onChange={e => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    className="w-full bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] rounded-lg p-2 text-white text-right"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#94A3B8] mb-1">{t('workshops.fieldDate')}</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] rounded-lg p-2 text-white text-right"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#94A3B8] mb-1">{t('workshops.fieldDuration')}</label>
                  <input
                    type="text"
                    value={formData.duration}
                    onChange={e => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                    className="w-full bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] rounded-lg p-2 text-white text-right"
                    placeholder="למשל: 3 שעות, 90 דקות"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#94A3B8] mb-1">{t('workshops.fieldMaxParticipants')}</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.maxParticipants}
                    onChange={e => setFormData(prev => ({ ...prev, maxParticipants: e.target.value }))}
                    className="w-full bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] rounded-lg p-2 text-white text-right"
                    placeholder="ריק = ללא הגבלה"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="workshop-active"
                    checked={formData.active}
                    onChange={e => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                    className="rounded"
                  />
                  <label htmlFor="workshop-active">{t('workshops.active')}</label>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-[#e11d48] hover:bg-[#be0037] text-white px-4 py-2 rounded-xl font-bold disabled:opacity-50"
                >
                  {saving ? t('uploading') : t('save')}
                </button>
                <button
                  type="button"
                  onClick={closeForm}
                  className="bg-[#2a292e] hover:bg-[#353439] text-white px-4 py-2 rounded-xl font-bold flex items-center gap-1"
                >
                  <X size={16} />
                  {t('cancel')}
                </button>
              </div>
            </div>
          )}

          <div className="grid gap-4">
            {workshops.map(w => {
              const count = regCounts[w.id] ?? 0;
              const max = w.maxParticipants != null ? Number(w.maxParticipants) : null;
              const regs = regsByWorkshop[w.id] || [];
              const isExpanded = expandedId === w.id;
              return (
                <div
                  key={w.id}
                  className="bg-[#121218] border border-white/5 rounded-xl overflow-hidden"
                >
                  <div className="p-4 flex flex-wrap items-center gap-4">
                    {w.imageUrl && (
                      <img src={w.imageUrl} alt="" className="w-20 h-20 object-cover rounded-lg" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-bold">{w.title}</div>
                      <div className="text-sm text-[#94A3B8]">
                        {t('workshops.fieldInstructor')}: {w.instructor || '–'} | {t('workshops.fieldPrice')}: {w.price != null ? `₪${w.price}` : '–'} | {t('workshops.registeredLabel')}: {max != null ? `${count} / ${max}` : count}
                      </div>
                    </div>
                    <div className="flex gap-2 items-center">
                      <button
                        type="button"
                        onClick={() => toggleExpanded(w.id)}
                        className="p-2 rounded-lg bg-[#2a292e] hover:bg-[#353439] text-white text-xs font-bold flex items-center gap-1"
                        title={isExpanded ? t('workshops.hideRegistrations') : t('workshops.showRegistrations')}
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        {isExpanded ? t('workshops.hideRegistrations') : t('workshops.showRegistrations')}
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(w)}
                        className="p-2 rounded-lg bg-[#2a292e] hover:bg-[#353439] text-white"
                        title={t('edit')}
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(w.id)}
                        className="p-2 rounded-lg bg-[#93000a]/60 hover:bg-[#93000a] text-white"
                        title={t('delete')}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="border-t border-white/5 p-4 bg-black/20 space-y-3">
                      <div className="flex flex-wrap items-end gap-2">
                        <div>
                          <label className="block text-xs text-[#94A3B8] mb-1">{t('workshops.addRegistrantPhone')}</label>
                          <input
                            type="tel"
                            value={addRegPhone[w.id] || ''}
                            onChange={e => setAddRegPhone(prev => ({ ...prev, [w.id]: e.target.value }))}
                            placeholder="0500000000"
                            className="w-32 bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] rounded-lg p-2 text-white text-right text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[#94A3B8] mb-1">{t('workshops.addRegistrantName')}</label>
                          <input
                            type="text"
                            value={addRegName[w.id] || ''}
                            onChange={e => setAddRegName(prev => ({ ...prev, [w.id]: e.target.value }))}
                            placeholder="שם"
                            className="w-32 bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] rounded-lg p-2 text-white text-right text-sm"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddRegistrant(w.id)}
                          disabled={addingRegForId === w.id}
                          className="bg-green-600 hover:bg-green-500 text-white px-3 py-2 rounded-lg font-bold flex items-center gap-1 text-sm disabled:opacity-50"
                        >
                          {addingRegForId === w.id ? <Loader size="small" /> : <UserPlus size={16} />}
                          {t('workshops.addRegistrant')}
                        </button>
                      </div>
                      <div className="text-sm font-bold text-[#a9a9b2]">{t('workshops.registrationsList')}</div>
                      {regs.length === 0 ? (
                        <p className="text-[#94A3B8] text-sm">{t('workshops.noRegistrations')}</p>
                      ) : (
                        <ul className="space-y-2">
                          {regs.map(reg => (
                            <li key={reg.id} className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-lg bg-[#1f1f23]/50 flex-wrap">
                              <span className="text-sm">
                                {reg.userName || '–'} | {reg.phoneNumber || '–'}
                                {reg.isGuest && (
                                  <span className="mr-2 text-xs bg-amber-900/50 text-amber-400 px-1.5 py-0.5 rounded" title={t('workshops.guestRegistrant')}>
                                    {t('workshops.guest')}
                                  </span>
                                )}
                              </span>
                              <div className="flex gap-1">
                                {reg.isGuest && (
                                  <button
                                    type="button"
                                    onClick={() => handleConvertToUser(reg, w.id)}
                                    disabled={convertingRegId === reg.id}
                                    className="p-1.5 rounded bg-green-900/50 hover:bg-green-900 text-white disabled:opacity-50"
                                    title={t('workshops.convertToUser')}
                                  >
                                    {convertingRegId === reg.id ? <Loader size="small" /> : <UserCheck size={14} />}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveRegistrant(w.id, reg.userId)}
                                  disabled={removingRegId === reg.userId}
                                  className="p-1.5 rounded bg-[#93000a]/60 hover:bg-[#93000a] text-white disabled:opacity-50"
                                  title={t('workshops.removeRegistrant')}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default WorkshopsSection;

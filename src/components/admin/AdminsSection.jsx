import { useState, useEffect } from 'react';
import { RotateCcw, UserPlus, Shield, ShieldOff, Trash2 } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import AdminLoader from './AdminLoader';
import PhoneLink from '../PhoneLink';
import useAdminSection from '../../hooks/useAdminSection';
import { 
  getAllAdmins, 
  getAllUsers,
  setAdminActive, 
  makeUserAdmin, 
  removeAdmin 
} from '../../firebase/users';

const AdminsSection = ({ showSaved }) => {
  const { t } = useLanguage();
  const { data: adminsData, loading: loadingAdmins, reload: reloadAdmins } = useAdminSection(getAllAdmins);
  const admins = adminsData || [];
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [addAdminError, setAddAdminError] = useState('');

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const allUsers = await getAllUsers();
      setUsers(allUsers.filter(u => !u.isAdmin));
    } catch (error) {
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleToggleAdminActive = async (adminId, currentStatus) => {
    try {
      await setAdminActive(adminId, !currentStatus);
      await reloadAdmins();
      showSaved();
    } catch (error) {
      alert(error.message || t('admin.admins.errorToggle'));
    }
  };

  const handleUserSelection = (userId) => {
    setSelectedUserId(userId);
    setAddAdminError('');
    
    if (userId) {
      const user = users.find(u => u.id === userId);
      setSelectedUser(user);

      if (!user || !user.telegramUsername || user.telegramUsername.trim() === '') {
        setAddAdminError(t('admin.admins.telegramRequired'));
        setSelectedUserId('');
        setSelectedUser(null);
        return;
      }
    } else {
      setSelectedUser(null);
    }
  };

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    setAddAdminError('');

    if (!selectedUserId || !selectedUser) {
      setAddAdminError(t('admin.admins.selectUser'));
      return;
    }

    if (!selectedUser.telegramUsername || selectedUser.telegramUsername.trim() === '') {
      setAddAdminError(t('admin.admins.telegramRequired'));
      return;
    }

    let telegramUsername = selectedUser.telegramUsername.trim();
    telegramUsername = telegramUsername.replace(/^@+/g, '');

    if (!adminPassword || adminPassword.length < 4) {
      setAddAdminError(t('admin.admins.passwordMinLength'));
      return;
    }

    try {
      await makeUserAdmin(selectedUserId, telegramUsername, adminPassword);
      await reloadAdmins();
      await loadUsers();
      setShowAddAdmin(false);
      setSelectedUserId('');
      setSelectedUser(null);
      setAdminPassword('');
      showSaved();
    } catch (error) {
      setAddAdminError(error.message || t('admin.admins.errorAdd'));
    }
  };

  const handleRemoveAdmin = async (adminId, adminName) => {
    if (!window.confirm(`${t('admin.admins.removeConfirm')} "${adminName}"?`)) {
      return;
    }

    try {
      await removeAdmin(adminId);
      await reloadAdmins();
      await loadUsers();
      showSaved();
    } catch (error) {
      alert(error.message || t('admin.admins.errorRemove'));
    }
  };

  return (
    <div className="bg-[#121218] backdrop-blur-2xl border border-white/5 p-4 md:p-6 rounded-xl md:rounded-2xl space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl md:text-2xl font-bold">{t('admin.admins.managementTitle')}</h2>
          <span className="px-2.5 py-1 rounded-full bg-[#1f1f23] text-[#94A3B8] text-xs font-bold">
            {admins.filter(a => a.isActive).length} פעילים מתוך {admins.length}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              reloadAdmins();
              loadUsers();
            }}
            className="bg-blue-600 hover:bg-blue-500 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-xl font-bold flex items-center gap-2 text-xs md:text-sm"
          >
            <RotateCcw size={14} className="md:w-4 md:h-4" /> {t('admin.admins.refresh')}
          </button>
          <button
            onClick={() => setShowAddAdmin(!showAddAdmin)}
            className="bg-green-600 hover:bg-green-500 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-xl font-bold flex items-center gap-2 text-xs md:text-sm"
          >
            <UserPlus size={14} className="md:w-4 md:h-4" /> {t('admin.admins.addAdmin')}
          </button>
        </div>
      </div>

      {showAddAdmin && (
        <div className="bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-4 rounded-xl mb-4">
          <h3 className="text-lg font-bold mb-4">{t('admin.admins.addAdminTitle')}</h3>
          <form onSubmit={handleAddAdmin} className="space-y-4">
            <div>
              <label className="text-xs uppercase font-bold text-[#94A3B8] block mb-2">{t('admin.admins.selectUserLabel')}</label>
              <select
                value={selectedUserId}
                onChange={(e) => handleUserSelection(e.target.value)}
                className="w-full bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-3 rounded-xl focus:border-[#ff5708] outline-none text-white text-right"
                required
              >
                <option value="">{t('admin.admins.selectUserPlaceholder')}</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.phoneNumber}) {u.telegramUsername ? `- @${u.telegramUsername.replace(/^@+/, '')}` : `- ${t('admin.admins.noTelegram')}`}
                  </option>
                ))}
              </select>
              {selectedUser && selectedUser.telegramUsername && (
                <p className="text-green-400 text-sm mt-2">
                  {t('admin.admins.telegramUsernameDisplay')} @{selectedUser.telegramUsername.replace(/^@+/, '')}
                </p>
              )}
              {selectedUser && !selectedUser.telegramUsername && (
                <p className="text-[#ffb4ab] text-sm mt-2">
                  ⚠️ {t('admin.admins.telegramNoUser')}
                </p>
              )}
            </div>
            <div>
              <label className="text-xs uppercase font-bold text-[#94A3B8] block mb-2">{t('admin.admins.passwordLabel')}</label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => {
                  setAdminPassword(e.target.value);
                  setAddAdminError('');
                }}
                className="w-full bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-3 rounded-xl focus:border-[#ff5708] outline-none text-white text-right"
                placeholder={t('admin.admins.passwordPlaceholder')}
                autoComplete="new-password"
                minLength={4}
                required
              />
              <p className="text-[#94A3B8] text-xs mt-1">
                {t('admin.admins.usernameFrom')} {selectedUser && selectedUser.telegramUsername ? `@${selectedUser.telegramUsername.replace(/^@+/, '')}` : t('admin.admins.noUserSelected')}
              </p>
            </div>
            {addAdminError && (
              <p className="text-[#ffb4ab] text-sm text-right">{addAdminError}</p>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!selectedUser || !selectedUser.telegramUsername}
                className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('admin.admins.addAdmin')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddAdmin(false);
                  setSelectedUserId('');
                  setSelectedUser(null);
                  setAdminPassword('');
                  setAddAdminError('');
                }}
                className="bg-[#1f1f23] hover:bg-[#2a292e] text-white px-6 py-2 rounded-xl font-bold"
              >
                {t('admin.admins.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {loadingAdmins ? (
        <AdminLoader />
      ) : admins.length === 0 ? (
        <div className="text-center py-12 text-[#94A3B8]">
          <p>{t('admin.admins.noAdmins')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {admins.map(admin => (
            <div key={admin.id} className="bg-[#1f1f23] border border-[rgba(255,255,255,0.08)] p-3 md:p-4 rounded-xl">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <strong className="text-lg">{admin.adminUsername || admin.name || t('admin.admins.noName')}</strong>
                    {admin.isDefaultAdmin && (
                      <span className="px-2 py-1 rounded text-xs font-bold bg-yellow-600">
                        {t('admin.admins.defaultAdminBadge')}
                      </span>
                    )}
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      admin.isActive 
                        ? 'bg-green-600' 
                        : 'bg-[#93000a]'
                    }`}>
                      {admin.isActive ? t('admin.admins.active') : t('admin.admins.inactive')}
                    </span>
                  </div>
                  {admin.name && (
                    <p className="text-[#a9a9b2] text-sm">{t('admin.admins.nameLabel')} {admin.name}</p>
                  )}
                  {admin.phoneNumber && (
                    <p className="text-[#a9a9b2] text-sm">{t('admin.admins.phoneLabel')} <PhoneLink phone={admin.phoneNumber}>{admin.phoneNumber}</PhoneLink></p>
                  )}
                  {admin.adminUsername && (
                    <p className="text-blue-400 text-sm font-bold">{t('admin.admins.telegramUsernameDisplay')} @{admin.adminUsername}</p>
                  )}
                  {admin.telegramUsername && admin.telegramUsername !== admin.adminUsername && (
                    <p className="text-[#a9a9b2] text-sm">{t('admin.admins.telegramLabel')} @{admin.telegramUsername.replace(/^@+/, '')}</p>
                  )}
                  {admin.isDefaultAdmin && (
                    <p className="text-yellow-400 text-sm mt-2">
                      ⚠️ {t('admin.admins.defaultAdminWarning')}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {!admin.isDefaultAdmin && (
                    <>
                      <button
                        onClick={() => handleToggleAdminActive(admin.id, admin.isActive)}
                        className={`px-3 md:px-4 py-1.5 md:py-2 rounded-xl font-bold text-xs md:text-sm flex items-center gap-2 ${
                          admin.isActive
                            ? 'bg-[#ff5708] hover:bg-[#ff7a29] text-white'
                            : 'bg-green-600 hover:bg-green-500 text-white'
                        }`}
                      >
                        {admin.isActive ? (
                          <>
                            <ShieldOff size={14} /> {t('admin.admins.deactivate')}
                          </>
                        ) : (
                          <>
                            <Shield size={14} /> {t('admin.admins.activate')}
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleRemoveAdmin(admin.id, admin.adminUsername || admin.name)}
                        className="bg-[#93000a] hover:bg-[#be0037] text-white px-3 md:px-4 py-1.5 md:py-2 rounded-xl font-bold text-xs md:text-sm flex items-center gap-2"
                      >
                        <Trash2 size={14} /> {t('admin.admins.removeAdmin')}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminsSection;

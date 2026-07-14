import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { getUserByPhone, getUserRegistrationInfo } from '../../firebase/users';
import PhoneLink from '../PhoneLink';

const RegistrationItem = ({ registration, partyId, onConvertToUser, onRemoveFromParty, userFromMap }) => {
  const { t } = useLanguage();
  const [isUser, setIsUser] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      if (!registration.phoneNumber) {
        setIsUser(false);
        setLoading(false);
        return;
      }
      
      // Use user from map if provided (optimization to avoid multiple DB calls)
      // If userFromMap is explicitly passed (even if null), use it to avoid DB call
      if (userFromMap !== undefined) {
        if (userFromMap && userFromMap.level !== 'blocked') {
          setIsUser(true);
          setUserInfo(userFromMap);
        } else {
          setIsUser(false);
          setUserInfo(null);
        }
        setLoading(false);
        return;
      }
      
      // Fallback to DB call only if userFromMap was not provided at all
      // This should rarely happen if PartiesSection is properly passing userFromMap
      try {
        const user = await getUserByPhone(registration.phoneNumber);
        if (user && user.level !== 'blocked') {
          setIsUser(true);
          setUserInfo(user);
        } else {
          setIsUser(false);
          setUserInfo(null);
        }
      } catch (error) {
        setIsUser(false);
        setUserInfo(null);
      } finally {
        setLoading(false);
      }
    };
    checkUser();
  }, [registration.phoneNumber, userFromMap]);

  if (loading) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 p-3 rounded-lg">
        <p className="text-zinc-400 text-sm">{t('registrationItem.loading')}</p>
      </div>
    );
  }

  const regInfo = userInfo ? getUserRegistrationInfo(userInfo) : null;
  const hasBalance = registration.balancedWith ? true : false;
  const isDiscount = registration.registrationType === 'single-female-discount' || registration.registrationType === 'female_discount';

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 p-2 md:p-3 rounded-lg">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-2">
        <div className="flex-1 w-full">
          <div className="flex flex-wrap items-center gap-1.5 md:gap-2 mb-1">
            <strong className="text-white text-sm md:text-base">{registration.fullName || registration.userName || '-'}</strong>
            {isDiscount && (
              <span className="px-1.5 md:px-2 py-0.5 rounded text-[10px] md:text-xs font-bold bg-yellow-600">
                💝 {t('registrationItem.discountRequested')}
              </span>
            )}
            <span className={`px-1.5 md:px-2 py-0.5 rounded text-[10px] md:text-xs font-bold ${registration.gender === 'male' ? 'bg-blue-600' : 'bg-pink-600'}`}>
              {registration.gender === 'male' ? t('registrationItem.male') : t('registrationItem.female')}
            </span>
            {isUser ? (
              <span className="px-1.5 md:px-2 py-0.5 rounded text-[10px] md:text-xs font-bold bg-green-600">
                ✅ {t('registrationItem.user')}
              </span>
            ) : (
              <span className="px-1.5 md:px-2 py-0.5 rounded text-[10px] md:text-xs font-bold bg-zinc-600">
                ❌ {t('registrationItem.client')}
              </span>
            )}
            {hasBalance ? (
              <span className="px-1.5 md:px-2 py-0.5 rounded text-[10px] md:text-xs font-bold bg-purple-600">
                ⚖️ {t('registrationItem.matched')}
              </span>
            ) : (
              <span className="px-1.5 md:px-2 py-0.5 rounded text-[10px] md:text-xs font-bold bg-zinc-700">
                ❌ {t('registrationItem.notMatched')}
              </span>
            )}
          </div>
          <p className="text-zinc-400 text-[10px] md:text-xs">{t('registrationItem.phone')}: <PhoneLink phone={registration.phoneNumber}>{registration.phoneNumber || '-'}</PhoneLink></p>
          {registration.telegramUsername && (
            <p className="text-zinc-400 text-[10px] md:text-xs">{t('registrationItem.telegram')}: @{registration.telegramUsername}</p>
          )}
          {regInfo && (
            <div className="mt-2 p-1.5 md:p-2 rounded bg-zinc-800/50">
              {regInfo.isGold ? (
                <p className="text-yellow-400 text-[10px] md:text-xs font-bold">⭐ {t('registrationItem.goldUserNeverExpires')}</p>
              ) : (
                <p className={`text-[10px] md:text-xs ${regInfo.isExpired ? 'text-red-400' : regInfo.isExpiringSoon ? 'text-orange-400' : 'text-green-400'}`}>
                  {regInfo.isExpired 
                    ? `⚠️ ${t('registrationItem.expiredDaysAgo')} ${Math.abs(regInfo.daysRemaining)} ${t('registration.daysAgo')}`
                    : `✅ ${t('registrationItem.daysRemaining')} ${regInfo.daysRemaining} ${t('registration.daysUntilExpiry')}`}
                </p>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {onRemoveFromParty && partyId && (
            <button
              onClick={() => onRemoveFromParty(partyId, registration)}
              className="bg-red-600 hover:bg-red-500 text-white px-2 md:px-3 py-1 rounded-lg font-bold text-[10px] md:text-xs whitespace-nowrap flex items-center gap-1"
              title={t('confirmRemoveUser')}
            >
              <Trash2 size={12} />
              {t('admin.remove') || 'הסר'}
            </button>
          )}
          {!isUser && (
            <button
              onClick={() => onConvertToUser(registration)}
              className="bg-green-600 hover:bg-green-500 text-white px-2 md:px-3 py-1 rounded-lg font-bold text-[10px] md:text-xs whitespace-nowrap"
            >
              ✅ {t('registrationItem.makeUser')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegistrationItem;


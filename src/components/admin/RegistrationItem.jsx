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
      <div className="bg-[#121218] border border-[rgba(255,255,255,0.08)] p-3 rounded-lg">
        <p className="text-[#a9a9b2] text-sm">{t('registrationItem.loading')}</p>
      </div>
    );
  }

  const regInfo = userInfo ? getUserRegistrationInfo(userInfo) : null;
  const subTier = userInfo?.subscriptions?.parties?.tier
    || (userInfo?.level === 'gold' ? 'gold' : null);
  const hasBalance = registration.balancedWith ? true : false;
  const isDiscount = registration.registrationType === 'single-female-discount' || registration.registrationType === 'female_discount';

  return (
    <div className="bg-[#121218] border border-[rgba(255,255,255,0.08)] p-2 md:p-3 rounded-lg">
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
              <>
                <span className="px-1.5 md:px-2 py-0.5 rounded text-[10px] md:text-xs font-bold bg-green-600">
                  ✅ {t('registrationItem.user')}
                </span>
                {/* Which plan they hold, so the admin can tell a one-day
                    gender-balance pass from a full-year subscription at a
                    glance instead of only seeing "registered". */}
                {subTier && (
                  <span className={`px-1.5 md:px-2 py-0.5 rounded text-[10px] md:text-xs font-bold ${subTier === 'day' ? 'bg-sky-700' : subTier === 'gold' ? 'bg-yellow-600' : 'bg-emerald-700'}`}>
                    {subTier === 'day' ? '📅 מנוי יומי' : subTier === 'gold' ? '⭐ זהב' : subTier === 'month' ? '📆 חודשי' : subTier === 'halfYear' ? '📆 חצי שנה' : '🗓 מנוי שנתי'}
                  </span>
                )}
              </>
            ) : (
              <span className="px-1.5 md:px-2 py-0.5 rounded text-[10px] md:text-xs font-bold bg-[#353439]">
                ❌ {t('registrationItem.client')}
              </span>
            )}
            {hasBalance ? (
              <span className="px-1.5 md:px-2 py-0.5 rounded text-[10px] md:text-xs font-bold bg-purple-600">
                ⚖️ {t('registrationItem.matched')}
              </span>
            ) : (
              <span className="px-1.5 md:px-2 py-0.5 rounded text-[10px] md:text-xs font-bold bg-[#2a292e]">
                ❌ {t('registrationItem.notMatched')}
              </span>
            )}
          </div>
          <p className="text-[#a9a9b2] text-[10px] md:text-xs">{t('registrationItem.phone')}: <PhoneLink phone={registration.phoneNumber}>{registration.phoneNumber || '-'}</PhoneLink></p>
          {registration.telegramUsername && (
            <p className="text-[#a9a9b2] text-[10px] md:text-xs">{t('registrationItem.telegram')}: @{registration.telegramUsername}</p>
          )}
          {regInfo && (
            <div className="mt-2 p-1.5 md:p-2 rounded bg-[#1f1f23]/50">
              {regInfo.isGold ? (
                <p className="text-yellow-400 text-[10px] md:text-xs font-bold">⭐ {t('registrationItem.goldUserNeverExpires')}</p>
              ) : (
                <p className={`text-[10px] md:text-xs ${regInfo.isExpired ? 'text-[#ffb4ab]' : regInfo.isExpiringSoon ? 'text-orange-400' : 'text-green-400'}`}>
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
              className="bg-[#e11d48] hover:bg-[#be0037] text-white px-2 md:px-3 py-1 rounded-lg font-bold text-[10px] md:text-xs whitespace-nowrap flex items-center gap-1"
              title={t('confirmRemoveUser')}
            >
              <Trash2 size={12} />
              {t('admin.remove') || 'הסר'}
            </button>
          )}
          {!isUser && (
            <>
              <button
                onClick={() => onConvertToUser(registration, 'day')}
                className="bg-sky-700 hover:bg-sky-600 text-white px-2 md:px-3 py-1 rounded-lg font-bold text-[10px] md:text-xs whitespace-nowrap"
                title="אישור איזון חד פעמי — לא הופך אותו למנוי לטווח ארוך"
              >
                ✅ אישור למסיבה זו בלבד
              </button>
              <button
                onClick={() => onConvertToUser(registration, 'year')}
                className="bg-amber-600 hover:bg-amber-500 text-white px-2 md:px-3 py-1 rounded-lg font-bold text-[10px] md:text-xs whitespace-nowrap"
                title="מעניק גישה מלאה לכל האתר לשנה שלמה"
              >
                ⭐ מנוי מלא לשנה
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegistrationItem;


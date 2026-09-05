import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { getUserRegistrationInfo } from '../../firebase/users';
import PhoneLink from '../PhoneLink';

const CoupleRegistrationItem = ({ maleReg, femaleReg, partyId, onConvertToUser, onRemoveFromParty, allUsersMap }) => {
  const { t } = useLanguage();
  const maleUser = maleReg?.phoneNumber && allUsersMap ? allUsersMap.get(maleReg.phoneNumber) : null;
  const femaleUser = femaleReg?.phoneNumber && allUsersMap ? allUsersMap.get(femaleReg.phoneNumber) : null;
  const maleIsUser = maleUser && maleUser.level !== 'blocked';
  const femaleIsUser = femaleUser && femaleUser.level !== 'blocked';
  const maleRegInfo = maleUser ? getUserRegistrationInfo(maleUser) : null;
  const femaleRegInfo = femaleUser ? getUserRegistrationInfo(femaleUser) : null;

  return (
    <div className="bg-[#121218] border border-[rgba(255,255,255,0.08)] border-l-4 border-l-purple-500 p-2 md:p-3 rounded-lg">
      <div className="flex flex-wrap items-center gap-1.5 md:gap-2 mb-2">
        <span className="px-1.5 md:px-2 py-0.5 rounded text-[10px] md:text-xs font-bold bg-purple-600">
          💑 {t('admin.couple') || 'זוג'}
        </span>
        <span className="px-1.5 md:px-2 py-0.5 rounded text-[10px] md:text-xs font-bold bg-purple-600">
          ⚖️ {t('registrationItem.matched')}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-blue-400 text-xs">👨</span>
            <strong className="text-white text-sm">{maleReg?.fullName || maleReg?.userName || '-'}</strong>
            {maleIsUser && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-600">✓</span>
            )}
          </div>
          <p className="text-zinc-400 text-[10px] md:text-xs">
            <PhoneLink phone={maleReg?.phoneNumber}>{maleReg?.phoneNumber || '-'}</PhoneLink>
            {maleReg?.telegramUsername && ` • @${maleReg.telegramUsername}`}
          </p>
          {maleRegInfo && (
            <p className={`text-[10px] ${maleRegInfo.isExpired ? 'text-red-400' : 'text-green-400'}`}>
              {maleRegInfo.isGold ? '⭐' : maleRegInfo.isExpired ? '⚠️' : '✅'}
            </p>
          )}
          <div className="flex gap-2 mt-1">
            {onRemoveFromParty && partyId && (
              <button
                onClick={() => onRemoveFromParty(partyId, maleReg)}
                className="bg-[#e11d48] hover:bg-[#be0037] text-white px-2 py-1 rounded text-[10px] font-bold"
                title={t('confirmRemoveUser')}
              >
                <Trash2 size={10} /> {t('admin.remove')}
              </button>
            )}
            {!maleIsUser && maleReg && (
              <>
                <button
                  onClick={() => onConvertToUser({ ...maleReg, gender: 'male', fullName: maleReg.fullName || maleReg.userName }, 'day')}
                  className="bg-sky-700 hover:bg-sky-600 text-white px-2 py-1 rounded text-[10px] font-bold"
                  title="אישור איזון מגדרי ליום אחד בלבד"
                >
                  ✅ ליום
                </button>
                <button
                  onClick={() => onConvertToUser({ ...maleReg, gender: 'male', fullName: maleReg.fullName || maleReg.userName }, 'year')}
                  className="bg-green-600 hover:bg-green-500 text-white px-2 py-1 rounded text-[10px] font-bold"
                  title="מנוי לשנה שלמה"
                >
                  ✅ לשנה
                </button>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-pink-400 text-xs">👩</span>
            <strong className="text-white text-sm">{femaleReg?.fullName || femaleReg?.userName || '-'}</strong>
            {femaleIsUser && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-600">✓</span>
            )}
          </div>
          <p className="text-zinc-400 text-[10px] md:text-xs">
            <PhoneLink phone={femaleReg?.phoneNumber}>{femaleReg?.phoneNumber || '-'}</PhoneLink>
            {femaleReg?.telegramUsername && ` • @${femaleReg.telegramUsername}`}
          </p>
          {femaleRegInfo && (
            <p className={`text-[10px] ${femaleRegInfo.isExpired ? 'text-red-400' : 'text-green-400'}`}>
              {femaleRegInfo.isGold ? '⭐' : femaleRegInfo.isExpired ? '⚠️' : '✅'}
            </p>
          )}
          <div className="flex gap-2 mt-1">
            {onRemoveFromParty && partyId && (
              <button
                onClick={() => onRemoveFromParty(partyId, femaleReg)}
                className="bg-[#e11d48] hover:bg-[#be0037] text-white px-2 py-1 rounded text-[10px] font-bold"
                title={t('confirmRemoveUser')}
              >
                <Trash2 size={10} /> {t('admin.remove')}
              </button>
            )}
            {!femaleIsUser && femaleReg && (
              <>
                <button
                  onClick={() => onConvertToUser({ ...femaleReg, gender: 'female', fullName: femaleReg.fullName || femaleReg.userName }, 'day')}
                  className="bg-sky-700 hover:bg-sky-600 text-white px-2 py-1 rounded text-[10px] font-bold"
                  title="אישור איזון מגדרי ליום אחד בלבד"
                >
                  ✅ ליום
                </button>
                <button
                  onClick={() => onConvertToUser({ ...femaleReg, gender: 'female', fullName: femaleReg.fullName || femaleReg.userName }, 'year')}
                  className="bg-green-600 hover:bg-green-500 text-white px-2 py-1 rounded text-[10px] font-bold"
                  title="מנוי לשנה שלמה"
                >
                  ✅ לשנה
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoupleRegistrationItem;

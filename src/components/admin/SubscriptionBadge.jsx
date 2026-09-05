import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { getSubscription, SUBSCRIPTION_KINDS, SUBSCRIPTION_TIERS } from '../../firebase/subscriptions';

const SubscriptionBadge = ({ user, kind }) => {
  const { t } = useLanguage();
  
  if (!user || !SUBSCRIPTION_KINDS[kind]) return null;

  const info = getSubscription(user, kind);
  const label = SUBSCRIPTION_KINDS[kind].label;
  const tierLabel = info.tier ? SUBSCRIPTION_TIERS[info.tier]?.label : null;

  if (!info.exists) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#1f1f23]/50 border border-[rgba(255,255,255,0.08)]/50">
        <span className="text-[#94A3B8] font-bold text-[10px] md:text-xs">{label}:</span>
        <span className="text-[#94A3B8] text-[10px] md:text-xs">ללא</span>
      </div>
    );
  }

  if (info.isGold) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-yellow-900/30 border border-yellow-700/50">
        <span className="text-yellow-500 font-bold text-[10px] md:text-xs">{label}:</span>
        <span className="text-yellow-400 font-bold text-[10px] md:text-xs">⭐ זהב</span>
      </div>
    );
  }

  if (info.isExpired) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#93000a]/30 border border-[#e11d48]/50">
        <span className="text-[#ffb4ab] font-bold text-[10px] md:text-xs">{label}:</span>
        <span className="text-[#ffb4ab] font-bold text-[10px] md:text-xs">
          {tierLabel && `${tierLabel} · `}פג תוקף ({Math.abs(info.daysRemaining)} ימים)
        </span>
      </div>
    );
  }

  if (info.isExpiringSoon) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-orange-900/30 border border-orange-700/50">
        <span className="text-orange-400 font-bold text-[10px] md:text-xs">{label}:</span>
        <span className="text-orange-400 font-bold text-[10px] md:text-xs">
          {tierLabel && `${tierLabel} · `}
          {info.expiryDate?.toLocaleDateString('he-IL', { year: 'numeric', month: '2-digit', day: '2-digit' })}
          {' '}({info.daysRemaining} ימים)
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-green-900/30 border border-green-700/50">
      <span className="text-green-500 font-bold text-[10px] md:text-xs">{label}:</span>
      <span className="text-green-400 font-bold text-[10px] md:text-xs">
        {tierLabel && `${tierLabel} · `}
        {info.expiryDate?.toLocaleDateString('he-IL', { year: 'numeric', month: '2-digit', day: '2-digit' })}
      </span>
    </div>
  );
};

export default SubscriptionBadge;

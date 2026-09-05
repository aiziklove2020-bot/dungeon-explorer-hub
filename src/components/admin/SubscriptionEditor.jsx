import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { SUBSCRIPTION_KINDS, SUBSCRIPTION_TIERS } from '../../firebase/subscriptions';

const SubscriptionEditor = ({ 
  onAction, // (kind, action, payload?) => Promise<void>
  disabled = false 
}) => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleAction = (kind, action, payload = null) => {
    setIsOpen(false);
    if (action === 'customDate') {
      const newExpiry = prompt(t('admin.enterExpiryDate') || 'הזן תאריך תפוגה (YYYY-MM-DD):');
      if (!newExpiry) return;
      payload = newExpiry;
    } else if (action === 'cancel') {
      if (!window.confirm(`האם לבטל את מנוי ${SUBSCRIPTION_KINDS[kind].label}?`)) return;
    }
    onAction(kind, action, payload);
  };

  return (
    <div className="relative inline-block text-right" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center gap-1.5 bg-[#1f1f23] hover:bg-[#2a292e] disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 md:px-4 py-1.5 md:py-2 rounded-xl font-bold text-xs md:text-sm border border-[rgba(255,255,255,0.08)] transition-colors"
      >
        <span>נהל מנויים</span>
        <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl bg-[#121218] border border-[rgba(255,255,255,0.08)] shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none z-50 divide-y divide-zinc-800">
          
          {Object.values(SUBSCRIPTION_KINDS).map(kind => (
            <div key={kind.id} className="py-1">
              <div className="px-3 py-1.5 text-xs font-bold text-[#94A3B8] uppercase tracking-wider bg-[#121218]">
                {kind.label}
              </div>
              
              <button
                onClick={() => handleAction(kind.id, 'extend', 'day')}
                className="block w-full text-right px-4 py-2 text-sm text-[#e4e1e7] hover:bg-[#1f1f23] hover:text-white transition-colors"
              >
                ➕ הוסף יום אחד
              </button>

              <button
                onClick={() => handleAction(kind.id, 'extend', 'month')}
                className="block w-full text-right px-4 py-2 text-sm text-[#e4e1e7] hover:bg-[#1f1f23] hover:text-white transition-colors"
              >
                ➕ הוסף חודש
              </button>
              
              <button
                onClick={() => handleAction(kind.id, 'extend', 'halfYear')}
                className="block w-full text-right px-4 py-2 text-sm text-[#e4e1e7] hover:bg-[#1f1f23] hover:text-white transition-colors"
              >
                ➕ הוסף חצי שנה
              </button>
              
              <button
                onClick={() => handleAction(kind.id, 'extend', 'year')}
                className="block w-full text-right px-4 py-2 text-sm text-[#e4e1e7] hover:bg-[#1f1f23] hover:text-white transition-colors"
              >
                ➕ הוסף שנה
              </button>

              <button
                onClick={() => handleAction(kind.id, 'customDate')}
                className="block w-full text-right px-4 py-2 text-sm text-[#e4e1e7] hover:bg-[#1f1f23] hover:text-white transition-colors"
              >
                📅 תאריך מותאם
              </button>

              <button
                onClick={() => handleAction(kind.id, 'extend', 'gold')}
                className="block w-full text-right px-4 py-2 text-sm text-yellow-400 hover:bg-[#1f1f23] hover:text-yellow-300 font-bold transition-colors"
              >
                ⭐ הפוך לזהב
              </button>

              <button
                onClick={() => handleAction(kind.id, 'cancel')}
                className="block w-full text-right px-4 py-2 text-sm text-[#ffb4ab] hover:bg-[#1f1f23] hover:text-[#ffdada] transition-colors"
              >
                ❌ בטל מנוי זה
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SubscriptionEditor;

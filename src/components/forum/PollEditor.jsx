import { useState } from 'react';
import { Plus, X, BarChart3 } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

const PollEditor = ({ poll, onChange, onRemove }) => {
  const { t } = useLanguage();
  const [newOption, setNewOption] = useState('');

  const question = poll?.question || '';
  const options = poll?.options || ['', ''];

  const setQuestion = (q) => onChange({ ...poll, question: q, options });
  const setOption = (i, val) => {
    const next = [...options];
    next[i] = val;
    onChange({ ...poll, question, options: next });
  };
  const addOption = () => {
    if (options.length >= 6) return;
    const val = newOption.trim();
    if (!val) return;
    onChange({ ...poll, question, options: [...options, val] });
    setNewOption('');
  };
  const removeOption = (i) => {
    if (options.length <= 2) return;
    onChange({ ...poll, question, options: options.filter((_, idx) => idx !== i) });
  };

  return (
    <div className="bg-zinc-900/60 border border-zinc-700 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 size={16} className="text-purple-400" />
          <span className="text-white font-bold text-sm">{t('poll.title') || 'סקר'}</span>
        </div>
        <button type="button" onClick={onRemove} className="text-zinc-500 hover:text-red-400 text-xs">{t('poll.removePoll') || 'הסר סקר'}</button>
      </div>

      <input
        type="text"
        value={question}
        onChange={e => setQuestion(e.target.value)}
        placeholder={t('poll.questionPlaceholder') || 'מה תרצה לשאול?'}
        maxLength={200}
        className="w-full bg-black/40 border border-zinc-700 text-white text-sm px-3 py-2 rounded-lg focus:border-purple-600 outline-none text-right"
      />

      {options.map((opt, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="text"
            value={opt}
            onChange={e => setOption(i, e.target.value)}
            placeholder={`${t('poll.option') || 'אפשרות'} ${i + 1}`}
            maxLength={100}
            className="flex-1 bg-black/40 border border-zinc-700 text-white text-sm px-3 py-1.5 rounded-lg focus:border-purple-600 outline-none text-right"
          />
          {options.length > 2 && (
            <button type="button" onClick={() => removeOption(i)} className="text-zinc-500 hover:text-red-400"><X size={14} /></button>
          )}
        </div>
      ))}

      {options.length < 6 && (
        <button type="button" onClick={addOption} className="flex items-center gap-1 text-purple-400 hover:text-purple-300 text-sm">
          <Plus size={14} /> {t('poll.addOption') || 'הוסף אפשרות'}
        </button>
      )}
    </div>
  );
};

export default PollEditor;

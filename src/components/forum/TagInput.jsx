import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

const MAX_TAGS = 3;
const MAX_TAG_LENGTH = 20;

const TagInput = ({ tags = [], onChange }) => {
  const { t } = useLanguage();
  const [input, setInput] = useState('');

  const addTag = () => {
    const tag = input.trim().replace(/[<>"'&]/g, '').slice(0, MAX_TAG_LENGTH);
    if (!tag || tags.length >= MAX_TAGS || tags.includes(tag)) return;
    onChange([...tags, tag]);
    setInput('');
  };

  const removeTag = (idx) => onChange(tags.filter((_, i) => i !== idx));

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addTag(); }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {tags.map((tag, i) => (
        <span key={i} className="flex items-center gap-1 bg-zinc-800 text-zinc-300 text-xs font-bold px-2.5 py-1 rounded-lg">
          {tag}
          <button type="button" onClick={() => removeTag(i)} className="text-zinc-500 hover:text-red-400"><X size={12} /></button>
        </span>
      ))}
      {tags.length < MAX_TAGS && (
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('forum.tagPlaceholder') || 'תגית...'}
            maxLength={MAX_TAG_LENGTH}
            className="bg-black/40 border border-zinc-700 text-white text-xs px-2 py-1 rounded-lg w-24 focus:border-red-600 outline-none text-right"
          />
          <button type="button" onClick={addTag} className="text-zinc-500 hover:text-white"><Plus size={14} /></button>
        </div>
      )}
    </div>
  );
};

export default TagInput;

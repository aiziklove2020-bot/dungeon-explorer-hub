import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const SpoilerBlock = ({ children, label, variant }) => {
  const [revealed, setRevealed] = useState(false);
  const isImage = variant === 'image';
  const hiddenMediaClass = isImage
    ? 'blur-2xl brightness-[0.2] saturate-0 scale-[1.02]'
    : 'blur-lg';

  return (
    <div
      className={`relative my-2 rounded-xl overflow-hidden border border-zinc-700 ${isImage ? 'min-h-[140px] bg-zinc-950' : ''}`}
    >
      {!revealed && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-950/92 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors shadow-lg"
            aria-expanded={false}
          >
            <Eye size={16} aria-hidden="true" />
            {label || 'לחץ לחשיפה'}
          </button>
        </div>
      )}
      <div className={revealed ? '' : `select-none pointer-events-none ${hiddenMediaClass}`} aria-hidden={!revealed}>
        {children}
      </div>
      {revealed && (
        <button
          type="button"
          onClick={() => setRevealed(false)}
          className="absolute top-2 start-2 z-10 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors"
          aria-label="הסתר"
          aria-expanded={true}
          title="הסתר"
        >
          <EyeOff size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

export default SpoilerBlock;

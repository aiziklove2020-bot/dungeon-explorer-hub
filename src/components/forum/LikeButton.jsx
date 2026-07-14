import { Heart } from 'lucide-react';

const LikeButton = ({ liked, count, onToggle, disabled, label }) => (
  <button
    type="button"
    onClick={onToggle}
    disabled={disabled}
    aria-disabled={disabled}
    aria-pressed={liked}
    aria-label={label || (liked ? 'בטל לייק' : 'אהבתי')}
    className={`flex items-center gap-1.5 text-sm font-bold transition-colors rounded-lg px-2 py-1 ${
      liked
        ? 'text-red-300 hover:text-red-200'
        : 'text-zinc-300 hover:text-red-300'
    } disabled:text-zinc-500 disabled:cursor-not-allowed`}
  >
    <Heart size={16} fill={liked ? 'currentColor' : 'none'} aria-hidden="true" />
    {count > 0 && <span>{count}</span>}
  </button>
);

export default LikeButton;

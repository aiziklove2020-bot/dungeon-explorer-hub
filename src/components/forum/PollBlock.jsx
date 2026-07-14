import { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

const PollBlock = ({ poll, userId, onVote }) => {
  const { t } = useLanguage();
  const [voting, setVoting] = useState(false);

  if (!poll || !poll.question || !poll.options?.length) return null;

  const votes = poll.votes || {};
  const userVote = userId ? Object.entries(votes).find(([, uid]) => uid === userId)?.[0] : null;
  const hasVoted = !!userVote;
  const totalVotes = Object.keys(votes).length;

  const voteCounts = {};
  poll.options.forEach((_, i) => { voteCounts[i] = 0; });
  Object.keys(votes).forEach(optIdx => {
    const i = parseInt(optIdx.split('_')[0], 10);
    voteCounts[i] = (voteCounts[i] || 0) + 1;
  });

  const handleVote = async (optionIndex) => {
    if (!userId || hasVoted || voting || !onVote) return;
    setVoting(true);
    try {
      await onVote(optionIndex);
    } finally {
      setVoting(false);
    }
  };

  return (
    <div className="bg-zinc-900/60 border border-zinc-700 rounded-xl p-4 my-3">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 size={16} className="text-purple-400" />
        <span className="text-white font-bold text-sm">{t('poll.title') || 'סקר'}</span>
      </div>
      <p className="text-white text-sm font-medium mb-3">{poll.question}</p>
      <div className="space-y-2">
        {poll.options.map((opt, i) => {
          const count = voteCounts[i] || 0;
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const isMyVote = userVote === `${i}_${userId}`;

          return (
            <button
              key={i}
              type="button"
              disabled={hasVoted || !userId || voting}
              onClick={() => handleVote(i)}
              className={`w-full text-right relative overflow-hidden rounded-lg border transition-colors ${
                isMyVote ? 'border-purple-500 bg-purple-900/30' : hasVoted ? 'border-zinc-700 bg-zinc-800/50' : 'border-zinc-700 bg-zinc-800/50 hover:border-purple-500 cursor-pointer'
              } p-2.5`}
            >
              {hasVoted && (
                <div
                  className="absolute top-0 right-0 h-full bg-purple-600/20 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              )}
              <div className="relative flex justify-between items-center">
                <span className="text-white text-sm">{opt}</span>
                {hasVoted && (
                  <span className="text-zinc-400 text-xs font-bold mr-2">{pct}% ({count})</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-zinc-500 text-xs mt-2">
        {totalVotes} {t('poll.totalVotes') || 'סה"כ הצבעות'}
        {hasVoted && <span className="mr-2 text-purple-400">✓ {t('poll.alreadyVoted') || 'כבר הצבעת'}</span>}
      </p>
    </div>
  );
};

export default PollBlock;

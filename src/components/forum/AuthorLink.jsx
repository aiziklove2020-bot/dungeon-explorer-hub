import { useNavigate } from '@tanstack/react-router';

const AuthorLink = ({ authorId, authorName, shortBio }) => {
  const navigate = useNavigate();

  if (!authorId) return <span className="font-bold text-pink-400">{authorName || '???'}</span>;

  const href = `/profile/${authorId}`;
  const go = (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1) return;
    e.stopPropagation();
    e.preventDefault();
    navigate({ to: '/profile/$userId', params: { userId: authorId } });
  };

  return (
    <span className="inline-flex flex-col leading-tight">
      <a
        href={href}
        onClick={go}
        className="font-bold text-pink-400 hover:text-pink-300 hover:underline transition-colors text-right cursor-pointer no-underline"
      >
        {authorName || '???'}
      </a>
      {shortBio && (
        <span className="text-[11px] text-zinc-400 truncate max-w-[180px]">{shortBio}</span>
      )}
    </span>
  );
};

export default AuthorLink;

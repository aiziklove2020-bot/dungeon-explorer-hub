import SpoilerBlock from './SpoilerBlock';
import { useLanguage } from '../../i18n/LanguageContext';
import { normalizeForumImage } from '../../utils/forumImages';
import { looksLikeRichHtml, sanitizeRichHtml } from '../../utils/richTextDisplay';
import { injectKatexIntoHtmlString, splitPlainTextMathDelimiters, katexChunkToHtml } from '../../utils/katexDelimiters';

const MENTION_RE = /@([\w\u0590-\u05FF]{2,30})/g;

const RenderText = ({ text }) => {
  if (!text) return null;
  const parts = [];
  let last = 0;
  let match;
  const re = new RegExp(MENTION_RE.source, 'g');
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const nick = match[1];
    parts.push(
      <span key={match.index} className="text-pink-400 font-bold">
        @{nick}
      </span>
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
};

/** Plain text + @mentions + [math] delimiters */
const PlainWithMath = ({ text }) => {
  const chunks = splitPlainTextMathDelimiters(text || '');
  return (
    <>
      {chunks.map((c, i) => {
        if (c.type === 'text') {
          return <RenderText key={`pt-${i}`} text={c.value} />;
        }
        return (
          <span
            key={`pk-${i}`}
            className={c.display ? 'block my-2 overflow-x-auto max-w-full' : 'inline-block mx-0.5 align-middle'}
            dangerouslySetInnerHTML={{ __html: katexChunkToHtml(c.value, c.display) }}
          />
        );
      })}
    </>
  );
};

const parseSpoilers = (text) => {
  if (!text) return [{ type: 'text', value: '' }];
  const parts = [];
  const regex = /\[spoiler\]([\s\S]*?)\[\/spoiler\]/gi;
  let last = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push({ type: 'text', value: text.slice(last, match.index) });
    parts.push({ type: 'spoiler', value: match[1] });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ type: 'text', value: text.slice(last) });
  if (parts.length === 0) parts.push({ type: 'text', value: text });
  return parts;
};

const richHtmlWithMath = (value) => injectKatexIntoHtmlString(sanitizeRichHtml(value));

const HtmlOrPlainSegment = ({ value }) => {
  if (!value) return null;
  if (looksLikeRichHtml(value)) {
    return (
      <div
        className="forum-html-content text-zinc-200 text-[15px] sm:text-sm leading-relaxed break-words [&_a]:text-red-300 [&_a]:underline [&_.katex]:text-zinc-100"
        dir="rtl"
        dangerouslySetInnerHTML={{ __html: richHtmlWithMath(value) }}
      />
    );
  }
  return (
    <span className="whitespace-pre-wrap" dir="rtl">
      <PlainWithMath text={value} />
    </span>
  );
};

const ForumPostContent = ({ content, images, uncensored, rootClassName = 'space-y-2' }) => {
  const { t } = useLanguage();
  const parts = parseSpoilers(content || '');

  return (
    <div className={rootClassName}>
      <div className="text-[15px] sm:text-sm leading-relaxed break-words">
        {parts.map((p, i) => {
          if (p.type === 'spoiler') {
            if (uncensored) {
              return (
                <span key={i} className="bg-zinc-800 px-1 rounded text-yellow-300 inline-block my-1">
                  {looksLikeRichHtml(p.value) ? (
                    <span dangerouslySetInnerHTML={{ __html: richHtmlWithMath(p.value) }} />
                  ) : (
                    <PlainWithMath text={p.value} />
                  )}
                </span>
              );
            }
            return (
              <SpoilerBlock key={i}>
                <div className="block p-3 text-zinc-200">
                  {looksLikeRichHtml(p.value) ? (
                    <div
                      className="forum-html-content [&_a]:text-red-400 [&_.katex]:text-zinc-100"
                      dir="rtl"
                      dangerouslySetInnerHTML={{ __html: richHtmlWithMath(p.value) }}
                    />
                  ) : (
                    <span className="whitespace-pre-wrap">
                      <PlainWithMath text={p.value} />
                    </span>
                  )}
                </div>
              </SpoilerBlock>
            );
          }
          return <HtmlOrPlainSegment key={i} value={p.value} />;
        })}
      </div>

      {images && images.length > 0 && (
        <div className="flex flex-wrap gap-3 mt-2">
          {images.map((raw, idx) => {
            const img = normalizeForumImage(raw);
            if (!img?.url) return null;
            const altText = (img.caption || img.alt || '').trim() || (t('a11y.imagePost') || 'תמונה מהפוסט');
            if (img.isSpoiler && !uncensored) {
              return (
                <SpoilerBlock
                  key={idx}
                  variant="image"
                  label={t('forum.tapToRevealImage') || 'לחץ לצפייה בתמונה'}
                >
                  <img
                    src={img.url}
                    alt={altText}
                    className="max-w-full sm:max-w-xs max-h-64 rounded-lg object-contain mx-auto block"
                    loading="lazy"
                    decoding="async"
                  />
                </SpoilerBlock>
              );
            }
            return (
              <img
                key={idx}
                src={img.url}
                alt={altText}
                className="max-w-full sm:max-w-xs max-h-64 rounded-lg object-contain border border-zinc-700"
                loading="lazy"
                decoding="async"
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ForumPostContent;

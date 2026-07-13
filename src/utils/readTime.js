const WORDS_PER_MINUTE = 265;

export const getReadTime = (content, imageCount = 0) => {
  if (!content) return 1;
  const plainText = String(content)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\[spoiler\][\s\S]*?\[\/spoiler\]/gi, '')
    .replace(/\[mathblock\][\s\S]*?\[\/mathblock\]|\[math\][\s\S]*?\[\/math\]/gi, '')
    .trim();
  const wordCount = plainText.split(/\s+/).filter(Boolean).length;
  let minutes = wordCount / WORDS_PER_MINUTE;
  for (let i = 0; i < imageCount; i++) {
    minutes += Math.max(3, 12 - i) / 60;
  }
  return Math.max(1, Math.round(minutes));
};

const MENTION_REGEX = /@([\w\u0590-\u05FF]{2,30})/g;

export const extractMentions = (content) => {
  if (!content) return [];
  const matches = [...content.matchAll(MENTION_REGEX)];
  return [...new Set(matches.map(m => m[1]))];
};

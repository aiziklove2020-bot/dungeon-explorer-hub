// Aggregator for Hebrew translations. Each domain lives in its own file
// under ./locales/he/ — flat key maps spread together below. When a second
// language ships, add a sibling ./locales/en/ folder with the same layout
// and expose it as translations.en.
//
// The aggregator is intentionally synchronous. Translations are part of the
// initial render (Home, navigation, SEO fallbacks) so we cannot defer them
// without a suspense boundary, which the t(key) API does not provide.
// Route-level React.lazy + Rollup manualChunks already let each lazy route
// import only the locale files it actually references.

import common from './locales/he/common';
import home from './locales/he/home';
import pages from './locales/he/pages';
import auth from './locales/he/auth';
import registration from './locales/he/registration';
import admin from './locales/he/admin';
import adminTelegram from './locales/he/adminTelegram';
import telegram from './locales/he/telegram';
import supportChat from './locales/he/supportChat';
import editor from './locales/he/editor';
import blog from './locales/he/blog';
import profile from './locales/he/profile';
import messaging from './locales/he/messaging';
import pwa from './locales/he/pwa';
import time from './locales/he/time';
import webhookLogs from './locales/he/webhookLogs';

export const translations = {
  he: {
    ...common,
    ...home,
    ...pages,
    ...auth,
    ...registration,
    ...admin,
    ...adminTelegram,
    ...telegram,
    ...supportChat,
    ...editor,
    ...blog,
    ...profile,
    ...messaging,
    ...pwa,
    ...time,
    ...webhookLogs,
  },
};

export const getTranslation = (key, language = 'he') => {
  if (key == null || typeof key !== 'string') return '';
  if (language !== 'he') language = 'he';
  let value = translations.he?.[key];
  if (value) return value;
  const keys = key.split('.');
  value = translations.he;
  for (const k of keys) {
    value = value?.[k];
  }
  return value || key;
};

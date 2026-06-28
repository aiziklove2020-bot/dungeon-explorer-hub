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
import workshops from './locales/he/workshops';
import admin from './locales/he/admin';
import adminStore from './locales/he/adminStore';
import adminTelegram from './locales/he/adminTelegram';
import telegram from './locales/he/telegram';
import supportChat from './locales/he/supportChat';
import store from './locales/he/store';
import editor from './locales/he/editor';
import forum from './locales/he/forum';
import blog from './locales/he/blog';
import profile from './locales/he/profile';
import messaging from './locales/he/messaging';
import pwa from './locales/he/pwa';
import time from './locales/he/time';
import webhookLogs from './locales/he/webhookLogs';
import liveChat from './locales/he/liveChat';

export const translations = {
  he: {
    ...common,
    ...home,
    ...pages,
    ...auth,
    ...registration,
    ...workshops,
    ...admin,
    ...adminStore,
    ...adminTelegram,
    ...telegram,
    ...supportChat,
    ...store,
    ...editor,
    ...forum,
    ...blog,
    ...profile,
    ...messaging,
    ...pwa,
    ...time,
    ...webhookLogs,
    ...liveChat,
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

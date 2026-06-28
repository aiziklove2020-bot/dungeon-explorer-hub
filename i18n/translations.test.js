import { describe, it, expect } from 'vitest';
import { translations, getTranslation } from './translations';
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

const locales = {
  common,
  home,
  pages,
  auth,
  registration,
  workshops,
  admin,
  adminStore,
  adminTelegram,
  telegram,
  supportChat,
  store,
  editor,
  forum,
  blog,
  profile,
  messaging,
  pwa,
  time,
  webhookLogs,
  liveChat,
};

describe('i18n locale aggregation (he)', () => {
  it('has no duplicate keys across locale files', () => {
    const seen = new Map();
    const duplicates = [];
    for (const [name, dict] of Object.entries(locales)) {
      for (const key of Object.keys(dict)) {
        if (seen.has(key)) {
          duplicates.push(`${key} — defined in both ${seen.get(key)} and ${name}`);
        } else {
          seen.set(key, name);
        }
      }
    }
    expect(duplicates).toEqual([]);
  });

  it('aggregates every locale entry into translations.he', () => {
    const expected = Object.values(locales).reduce(
      (acc, dict) => acc + Object.keys(dict).length,
      0
    );
    expect(Object.keys(translations.he).length).toBe(expected);
  });
});

describe('getTranslation', () => {
  it('returns empty string for null / non-string input', () => {
    expect(getTranslation(null)).toBe('');
    expect(getTranslation(undefined)).toBe('');
    expect(getTranslation(42)).toBe('');
  });

  it('falls back to the key when it is unknown', () => {
    expect(getTranslation('this.key.does.not.exist')).toBe('this.key.does.not.exist');
  });

  // One sanity check per domain — ensures the locale file was wired into
  // translations.js and that getTranslation finds real content.
  const samples = [
    ['save', 'common'],
    ['home.registerButton', 'home'],
    ['about.title', 'pages'],
    ['auth.login', 'auth'],
    ['registration.successTitle', 'registration'],
    ['workshops.title', 'workshops'],
    ['admin.editParty', 'admin'],
    ['admin.gitHistory.missingViteSecret', 'admin'],
    ['admin.store.products', 'adminStore'],
    ['admin.telegram.bots', 'adminTelegram'],
    ['telegram.newRegistration', 'telegram'],
    ['supportChat.title', 'supportChat'],
    ['store.title', 'store'],
    ['editor.spoiler', 'editor'],
    ['forum.title', 'forum'],
    ['blog.title', 'blog'],
    ['profile.title', 'profile'],
    ['pm.title', 'messaging'],
    ['pwa.installTitle', 'pwa'],
    ['time.now', 'time'],
    ['webhookLogs.title', 'webhookLogs'],
    ['chat.title', 'liveChat'],
    ['chat.privateRoomLimitHint', 'liveChat'],
    ['chat.channelSettings', 'liveChat'],
  ];
  for (const [key, domain] of samples) {
    it(`resolves ${key} (${domain}) to a non-placeholder value`, () => {
      const value = getTranslation(key);
      expect(value).toBeTruthy();
      expect(value).not.toBe(key);
    });
  }
});

/**
 * Local/dev variant: write content + parties to local content/content.json and public/content/content.json.
 * Does not push to GitHub. Used when NODE_ENV === 'development'.
 *
 * Auth: Requires `Authorization: Bearer ${ADMIN_API_SECRET}` (same as prod publish-content).
 *       For dev convenience, set ADMIN_API_SECRET in `.env.local` and VITE_ADMIN_API_SECRET to the same value.
 */
import { writeFile, mkdir, readFile } from 'fs/promises';
import { join } from 'path';
import { requireAdminApiSecret } from '../lib/apiAuth.js';
import {
  DEFAULT_PARTY_RETENTION_HOURS,
  computePartyExpirationIso,
  isPartyExpiredByDate,
  normalizeRetentionHours,
} from '../shared/partyExpiry.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!requireAdminApiSecret(req, res)) return;

  let admin;
  try {
    admin = (await import('firebase-admin')).default;
    if (!admin.apps?.length) {
      if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
        return res.status(503).json({
          error: 'Firebase not configured',
          message: 'For local publish set GOOGLE_APPLICATION_CREDENTIALS_JSON (or use production API).'
        });
      }
      const cred = admin.credential.cert(JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON));
      admin.initializeApp({
        credential: cred,
        projectId: process.env.GCLOUD_PROJECT || 'tbdsm-5acca'
      });
    }
  } catch (e) {
    return res.status(503).json({
      error: 'Firebase not configured',
      message: e?.message || 'For local publish set GOOGLE_APPLICATION_CREDENTIALS_JSON (or use production API).'
    });
  }

  const db = admin.firestore();

  try {
    const [contentDoc, registrationDoc, socialLinksDoc, whatsappDoc, partiesSnap, storeSettingsDoc, workshopsSnap, rssFeedsSnap, partySettingsDoc] = await Promise.all([
      db.collection('settings').doc('content').get(),
      db.collection('settings').doc('registrationSettings').get(),
      db.collection('settings').doc('socialLinks').get(),
      db.collection('settings').doc('whatsappGroups').get(),
      db.collection('parties').where('status', '==', 'active').get(),
      db.collection('settings').doc('store').get(),
      db.collection('workshops').get(),
      db.collection('rssFeeds').get(),
      db.collection('settings').doc('partySettings').get()
    ]);

    const contentData = contentDoc.exists ? contentDoc.data() : {};
    const registration = registrationDoc.exists ? registrationDoc.data() : {};
    const socialLinksData = socialLinksDoc.exists ? socialLinksDoc.data() : {};
    const whatsappGroups = whatsappDoc.exists ? whatsappDoc.data() : { men: '', women: '' };
    const storeEnabled = storeSettingsDoc.exists ? (storeSettingsDoc.data()?.enabled === true) : false;
    const partyRetentionHours = normalizeRetentionHours(
      partySettingsDoc.exists ? partySettingsDoc.data()?.retentionHours : DEFAULT_PARTY_RETENTION_HOURS
    );
    const activeWorkshopsCount = workshopsSnap.docs.filter(d => d.data().active !== false).length;
    const rssFeeds = rssFeedsSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(f => f.enabled !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    const socialLinksArray = [
      { type: 'instagram', label: 'אינסטגרם', url: socialLinksData.instagram || '#' },
      { type: 'channel', label: 'ערוץ טלגרם', url: socialLinksData.telegramChannel || '#' },
      { type: 'discussion', label: 'קבוצת טלגרם', url: socialLinksData.telegramGroup || '#' },
      { type: 'whatsapp', label: 'מדברים בדסמ', url: socialLinksData.whatsapp || '#' },
      { type: 'facebook', label: 'פייסבוק', url: socialLinksData.facebook || '#' }
    ];

    // Same Israel-TZ-aware retention rule as production (see shared/partyExpiry.js):
    // a party is expired once `partyRetentionHours` have passed since 00:00 IL
    // of the labeled day. Window is admin-configurable (Parties tab).
    const nowMs = Date.now();
    const allParties = partiesSnap.docs.map(doc => {
      const d = doc.data();
      const date = d.date?.toDate ? d.date.toDate() : (d.date ? new Date(d.date) : null);
      return { id: doc.id, _ref: doc.ref, ...d, date };
    }).sort((a, b) => (a.date && b.date) ? a.date - b.date : 0);

    const expiredParties = allParties.filter(p => p.date && isPartyExpiredByDate(p.date, partyRetentionHours, nowMs));
    if (expiredParties.length > 0) {
      console.log(`[Publish] Deleting ${expiredParties.length} expired parties:`, expiredParties.map(p => p.title || p.name));
      await Promise.all(expiredParties.map(p => p._ref.delete()));
    }
    const expiredIds = new Set(expiredParties.map(p => p.id));
    const validParties = allParties.filter(p => !expiredIds.has(p.id));

    const internalParties = validParties.filter(p => (p.partyType || 'internal') === 'internal');
    const externalParties = validParties.filter(p => p.partyType === 'external');

    const formatPartyDate = (date) => date ? date.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', timeZone: 'Asia/Jerusalem' }).replace(/\./g, '.') : '';
    // See publish-content.js: prefer the persisted `expiration` timestamp,
    // fall back to recomputing from the party date so legacy docs still
    // produce a valid value in content.json.
    const resolveExpirationIso = (party) => {
      if (party.expiration?.toDate) {
        const t = party.expiration.toDate().getTime();
        if (Number.isFinite(t)) return new Date(t).toISOString();
      }
      return party.date ? computePartyExpirationIso(party.date, partyRetentionHours) : null;
    };
    const events = internalParties.map(party => ({
      id: party.id,
      day: party.day || '',
      date: formatPartyDate(party.date),
      title: party.title || party.name || '',
      time: party.time || '',
      dj: party.dj || '',
      img: party.imageURL || '',
      description: party.description || '',
      registrationLink: party.registrationLink || '',
      partyType: party.partyType || 'internal',
      expiration: resolveExpirationIso(party)
    }));

    const externalEvents = externalParties.map(party => ({
      day: party.day || '',
      date: formatPartyDate(party.date),
      title: party.title || party.name || '',
      time: party.time || '',
      dj: party.dj || '',
      img: party.imageURL || '',
      description: party.description || '',
      registrationLink: party.registrationLink || '',
      partyType: 'external',
      expiration: resolveExpirationIso(party)
    }));

    const payload = {
      hero: contentData.hero || {},
      about: contentData.about || {},
      contact: contentData.contact || {},
      registration,
      socialLinks: socialLinksArray,
      whatsappGroups,
      events,
      externalEvents,
      labels: contentData.labels || {},
      store: contentData.store || {},
      storeEnabled,
      activeWorkshopsCount,
      rssFeeds,
      partyRetentionHours
    };

    const payloadBase = { ...payload, events: [], externalEvents: [] };
    const partiesOnly = { events, externalEvents };

    const root = process.cwd();
    const contentPath = join(root, 'content', 'content.json');
    const publicPath = join(root, 'public', 'content', 'content.json');
    const contentBasePath = join(root, 'content', 'content-base.json');
    const contentBasePublicPath = join(root, 'public', 'content', 'content-base.json');
    const partiesPath = join(root, 'content', 'parties.json');
    const partiesPublicPath = join(root, 'public', 'content', 'parties.json');

    // Parties with needsPublish=true will get Telegram notification and be marked as published
    const partiesToNotify = validParties.filter(p => p.needsPublish === true);
    console.log(`[Publish] partiesToNotify: ${partiesToNotify.length}`, partiesToNotify.map(p => p.title || p.name));

    const jsonContent = JSON.stringify(payload, null, 2);
    const jsonContentBase = JSON.stringify(payloadBase, null, 2);
    const jsonParties = JSON.stringify(partiesOnly, null, 2);
    await mkdir(join(root, 'content'), { recursive: true });
    await mkdir(join(root, 'public', 'content'), { recursive: true });
    await writeFile(contentPath, jsonContent, 'utf-8');
    await writeFile(publicPath, jsonContent, 'utf-8');
    await writeFile(contentBasePath, jsonContentBase, 'utf-8');
    await writeFile(contentBasePublicPath, jsonContentBase, 'utf-8');
    await writeFile(partiesPath, jsonParties, 'utf-8');
    await writeFile(partiesPublicPath, jsonParties, 'utf-8');

    // Mark valid parties as published (needsPublish: false)
    await Promise.all(validParties.map(p => p._ref.update({ needsPublish: false })));

    // Return notifiedParties to the client so it can send Telegram notifications via the browser (same path as main branch)
    const notifiedParties = partiesToNotify.map(p => ({
      id: p.id,
      name: p.name || p.title || '',
      title: p.title || p.name || '',
      day: p.day || '',
      date: p.date ? p.date.toISOString() : null,
      time: p.time || '',
      dj: p.dj || '',
      description: p.description || '',
      imageURL: p.imageURL || '',
      maleLimit: p.maleLimit ?? null,
      femaleLimit: p.femaleLimit ?? null,
      partyType: p.partyType || 'internal'
    }));

    return res.status(200).json({
      success: true,
      message: 'Content written to content/content.json, content-base.json, parties.json and public/content/',
      files: [contentPath, publicPath, contentBasePath, contentBasePublicPath, partiesPath, partiesPublicPath],
      notifiedParties
    });
  } catch (error) {
    console.error('Publish local error:', error);
    return res.status(500).json({
      error: 'Local publish failed',
      message: error.message
    });
  }
}

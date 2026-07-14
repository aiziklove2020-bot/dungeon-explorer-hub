/**
 * Import content from Git (branch PublishMode) into Firestore.
 * POST: optional body { content?: object, includeParties?: boolean }.
 * If content is provided (e.g. from local file in dev), use it; otherwise fetch from GitHub.
 *
 * Auth: Requires `Authorization: Bearer ${ADMIN_API_SECRET}` header.
 *
 * Env: ADMIN_API_SECRET, GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH (default PublishMode), GITHUB_FILE_PATH (default content/content.json), GOOGLE_APPLICATION_CREDENTIALS_JSON.
 */
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

  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'PublishMode';
  const GITHUB_FILE_PATH = process.env.GITHUB_FILE_PATH || 'content/content.json';
  const includeParties = req.body && req.body.includeParties === true;

  let payload = req.body && req.body.content;
  if (!payload || typeof payload !== 'object') {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_OWNER = process.env.GITHUB_OWNER;
    const GITHUB_REPO = process.env.GITHUB_REPO;
    if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
      return res.status(400).json({
        error: 'Missing content or GitHub config',
        message: 'Provide body.content (e.g. from local file) or set GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO to fetch from Git.'
      });
    }
    try {
      const authHeader = GITHUB_TOKEN.startsWith('ghp_') ? `token ${GITHUB_TOKEN}` : `Bearer ${GITHUB_TOKEN}`;
      const resGit = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}?ref=${encodeURIComponent(GITHUB_BRANCH)}`,
        {
          headers: {
            Authorization: authHeader,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'TBDSM-Import'
          }
        }
      );
      if (!resGit.ok) {
        const text = await resGit.text();
        return res.status(resGit.status).json({
          error: 'Failed to fetch from GitHub',
          message: text || `HTTP ${resGit.status}`,
          branch: GITHUB_BRANCH
        });
      }
      const data = await resGit.json();
      const contentBase64 = data.content;
      if (!contentBase64) {
        return res.status(500).json({ error: 'Empty file from GitHub' });
      }
      payload = JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8'));
    } catch (e) {
      console.error('Import from Git fetch error:', e);
      return res.status(500).json({
        error: 'Failed to load content from Git',
        message: e?.message || String(e)
      });
    }
  }

  let admin;
  try {
    admin = (await import('firebase-admin')).default;
    if (!admin.apps?.length) {
      if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
        return res.status(503).json({
          error: 'Firebase not configured',
          message: 'Set GOOGLE_APPLICATION_CREDENTIALS_JSON to write to Firestore.'
        });
      }
      const cred = admin.credential.cert(JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON));
      admin.initializeApp({
        credential: cred,
        projectId: process.env.GCLOUD_PROJECT || 'tbdsm-5acca'
      });
    }
  } catch (e) {
    console.error('Firebase init:', e);
    return res.status(503).json({
      error: 'Firebase configuration error',
      message: e?.message || 'Set GOOGLE_APPLICATION_CREDENTIALS_JSON.'
    });
  }

  const db = admin.firestore();

  try {
    const contentDoc = {
      hero: payload.hero || {},
      about: payload.about || {},
      contact: payload.contact || {},
      labels: payload.labels || {},
      store: payload.store || {}
    };
    // Use set() WITHOUT merge so the entire document is replaced — merge:true does a deep
    // recursive merge on nested maps, which would leave stale edited sub-keys in place.
    await db.collection('settings').doc('content').set(contentDoc);

    if (payload.registration && typeof payload.registration === 'object') {
      await db.collection('settings').doc('registrationSettings').set(payload.registration, { merge: true });
    }

    const socialLinksArray = Array.isArray(payload.socialLinks) ? payload.socialLinks : [];
    const socialLinksDoc = {
      instagram: socialLinksArray.find(s => s.type === 'instagram')?.url || '',
      telegramChannel: socialLinksArray.find(s => s.type === 'channel')?.url || '',
      telegramGroup: socialLinksArray.find(s => s.type === 'discussion')?.url || '',
      whatsapp: socialLinksArray.find(s => s.type === 'whatsapp')?.url || '',
      facebook: socialLinksArray.find(s => s.type === 'facebook')?.url || ''
    };
    await db.collection('settings').doc('socialLinks').set(socialLinksDoc, { merge: true });

    const whatsappGroups = payload.whatsappGroups && typeof payload.whatsappGroups === 'object'
      ? { men: payload.whatsappGroups.men || '', women: payload.whatsappGroups.women || '' }
      : { men: '', women: '' };
    await db.collection('settings').doc('whatsappGroups').set(whatsappGroups, { merge: true });

    let partiesCreated = 0;
    const events = Array.isArray(payload.events) ? payload.events : [];
    const hasExternalInPayload = Object.prototype.hasOwnProperty.call(payload, 'externalEvents');
    const externalEvents = Array.isArray(payload.externalEvents) ? payload.externalEvents : [];

    if (includeParties) {
      const { Timestamp } = await import('firebase-admin/firestore');

      // Prefer the retention window the publishing admin baked into the JSON;
      // fall back to whatever's currently in Firestore so a re-import still
      // honours the live admin setting if the JSON predates the field.
      let importRetentionHours = normalizeRetentionHours(
        payload?.partyRetentionHours ?? DEFAULT_PARTY_RETENTION_HOURS
      );
      if (payload?.partyRetentionHours == null) {
        try {
          const partySettingsDoc = await db.collection('settings').doc('partySettings').get();
          if (partySettingsDoc.exists) {
            importRetentionHours = normalizeRetentionHours(partySettingsDoc.data()?.retentionHours);
          }
        } catch {
          // fall through with the default
        }
      }

      const parseDate = (d) => {
        if (!d) return null;
        if (d instanceof Date) return d;
        if (d && typeof d.toDate === 'function') return d.toDate();
        const s = String(d).trim();
        if (!s) return null;
        // Check DD.MM or DD.MM.YYYY first — before new Date(s) which misparses "12.03" in Node.js
        const match = s.match(/^(\d{1,2})\.(\d{1,2})(?:\.(\d{4}))?$/);
        if (match) {
          const [, day, month, year] = match;
          const parsed = new Date(parseInt(year || new Date().getFullYear(), 10), parseInt(month, 10) - 1, parseInt(day, 10));
          if (!isNaN(parsed.getTime())) return parsed;
        }
        const parsed = new Date(s);
        if (!isNaN(parsed.getTime())) return parsed;
        return null;
      };

      // Same Israel-TZ-aware retention rule used by the homepage and publish
      // jobs (see shared/partyExpiry.js). Avoids re-creating parties from Git
      // that should have already disappeared from the public site.
      const addParty = async (ev, partyType) => {
        const date = parseDate(ev.date) || new Date();
        if (isPartyExpiredByDate(date, importRetentionHours)) return;
        // Carry the explicit `expiration` from the JSON when present;
        // otherwise compute a fresh one from `date + importRetentionHours`
        // so every imported doc lands in Firestore with the same shape that
        // `createParty` would have written.
        let expirationTs = null;
        if (ev.expiration) {
          const t = Date.parse(ev.expiration);
          if (Number.isFinite(t)) expirationTs = Timestamp.fromMillis(t);
        }
        if (!expirationTs) {
          const iso = computePartyExpirationIso(date, importRetentionHours);
          if (iso) {
            const t = Date.parse(iso);
            if (Number.isFinite(t)) expirationTs = Timestamp.fromMillis(t);
          }
        }
        await db.collection('parties').add({
          day: ev.day || '',
          date: Timestamp.fromDate(date),
          title: ev.title || ev.name || '',
          time: ev.time || '',
          dj: ev.dj || '',
          imageURL: ev.img || ev.imageURL || '',
          description: ev.description || '',
          registrationLink: ev.registrationLink || '',
          partyType,
          status: 'active',
          needsPublish: false,
          registrations: [],
          createdAt: Timestamp.now(),
          ...(expirationTs ? { expiration: expirationTs } : {})
        });
      };

      // Delete ALL existing parties (all statuses), then recreate from Git — full reset.
      const allPartiesSnap = await db.collection('parties').get();
      const deletePromises = allPartiesSnap.docs.map(d => d.ref.delete());
      await Promise.all(deletePromises);

      // Create internal parties from Git
      for (const ev of events) {
        try {
          await addParty(ev, 'internal');
          partiesCreated++;
        } catch (e) {
          console.error('Import internal party error:', e?.message, ev);
        }
      }

      // Create external parties from Git (only if the key exists in the file)
      if (hasExternalInPayload) {
        for (const ev of externalEvents) {
          try {
            await addParty(ev, 'external');
            partiesCreated++;
          } catch (e) {
            console.error('Import external party error:', e?.message, ev);
          }
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Content imported from Git to DB',
      branch: GITHUB_BRANCH,
      partiesCreated: includeParties ? partiesCreated : undefined
    });
  } catch (error) {
    console.error('Import content error:', error);
    return res.status(500).json({
      error: 'Import failed',
      message: error?.message || String(error)
    });
  }
}

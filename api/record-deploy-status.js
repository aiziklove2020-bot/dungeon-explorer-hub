/**
 * Vercel Serverless: Record that a production deploy succeeded.
 * Called by the GitHub Action (vercel-deploy-tag) after creating the deploy/prod-* tag.
 * Writes to Firestore settings/deployStatus so the website can show "Build: passed" in the footer.
 *
 * Env: DEPLOY_STATUS_SECRET (must match the secret sent by the Action), GOOGLE_APPLICATION_CREDENTIALS_JSON
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const expectedSecret = process.env.DEPLOY_STATUS_SECRET;
  if (!expectedSecret) {
    return res.status(500).json({
      error: 'Server configuration error',
      message: 'DEPLOY_STATUS_SECRET is not set in environment variables'
    });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  } catch (_) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const { secret, commitSha, tag, timestamp } = body;
  if (secret !== expectedSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Must use same Firebase project as the website (tbdsm-5acca) so the footer can read settings/deployStatus
  const projectId = process.env.GCLOUD_PROJECT || 'tbdsm-5acca';
  let admin;
  try {
    admin = (await import('firebase-admin')).default;
    if (!admin.apps?.length) {
      const cred = admin.credential.cert(JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON));
      admin.initializeApp({
        credential: cred,
        projectId
      });
    }
  } catch (e) {
    console.error('Firebase init:', e.message, 'projectId:', projectId);
    return res.status(503).json({
      error: 'Firebase configuration error',
      message: e.message
    });
  }

  const db = admin.firestore();
  const { Timestamp } = await import('firebase-admin/firestore');

  const lastSuccessAt = timestamp
    ? (timestamp instanceof Date ? timestamp : new Date(timestamp))
    : new Date();

  try {
    await db.collection('settings').doc('deployStatus').set({
      lastSuccessAt: lastSuccessAt instanceof Date ? Timestamp.fromDate(lastSuccessAt) : lastSuccessAt,
      commitSha: commitSha || null,
      tag: tag || null
    });
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Firestore write:', e.message);
    return res.status(500).json({
      error: 'Failed to record deploy status',
      message: e.message
    });
  }
}

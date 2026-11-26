const { onValueCreated } = require('firebase-functions/v2/database');
const { initializeApp } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');
const { getMessaging } = require('firebase-admin/messaging');

initializeApp({ databaseURL: 'https://gootff-dcc2a-default-rtdb.firebaseio.com/' });

// تفعيل الإرسال بعد كتابة broadcast مصرح به من حساب المطوّر فقط وفق database.rules.json.
exports.sendAdminBroadcast = onValueCreated({
  ref: '/admin_broadcasts/{broadcastId}',
  region: 'us-central1',
  timeoutSeconds: 540,
  memory: '512MiB',
  maxInstances: 2,
  retry: false
}, async (event) => {
  const db = getDatabase();
  const ref = db.ref(`/admin_broadcasts/${event.params.broadcastId}`);
  try {
    const item = event.data.val() || {};
    const title = String(item.title || '').trim().slice(0, 60);
    const body = String(item.body || '').trim().slice(0, 220);
    if (!title || !body) {
      await ref.update({ status: 'failed', error: 'empty_message', completedAt: Date.now() });
      return;
    }

    const tokenSnap = await db.ref('fcm_tokens').get();
    // قد يُسجّل المتصفح نفسه تحت UID مختلف بعد تسجيل الخروج؛ نمنع إرسال أكثر من نسخة للرمز نفسه.
    const tokenOwners = new Map();
    tokenSnap.forEach(child => {
      const value = child.val() || {};
      if (typeof value.token !== 'string' || value.token.length <= 20) return;
      if (!tokenOwners.has(value.token)) tokenOwners.set(value.token, []);
      tokenOwners.get(value.token).push(child.key);
    });
    const records = Array.from(tokenOwners.entries()).map(([token, uids]) => ({ token, uids }));
    if (!records.length) {
      await ref.update({ status: 'sent', sentCount: 0, failedCount: 0, note: 'no_registered_tokens', completedAt: Date.now() });
      return;
    }

    let sentCount = 0;
    let failedCount = 0;
    const invalidUids = new Set();
    for (let i = 0; i < records.length; i += 500) {
      const batch = records.slice(i, i + 500);
      const response = await getMessaging().sendEachForMulticast({
        tokens: batch.map(x => x.token),
        data: {
          title,
          body,
          kind: 'admin_broadcast',
          broadcastId: String(event.params.broadcastId)
        },
        webpush: { headers: { Urgency: 'high', TTL: '86400' } }
      });
      sentCount += response.successCount;
      failedCount += response.failureCount;
      response.responses.forEach((result, index) => {
        const code = result.error && result.error.code || '';
        if (!result.success && /registration-token-not-registered|invalid-registration-token/.test(code)) {
          batch[index].uids.forEach(uid => invalidUids.add(uid));
        }
      });
    }

    await Promise.all(Array.from(invalidUids).map(uid => db.ref(`fcm_tokens/${uid}`).remove()));
    await ref.update({
      status: failedCount === 0 ? 'sent' : sentCount > 0 ? 'partial' : 'failed',
      sentCount,
      failedCount,
      removedInvalidTokens: invalidUids.size,
      completedAt: Date.now()
    });
  } catch (error) {
    console.error('Admin broadcast failed:', error);
    try {
      await ref.update({
        status: 'failed',
        error: String(error && error.code || 'send_failed').slice(0, 80),
        completedAt: Date.now()
      });
    } catch (updateError) {
      console.error('Could not update broadcast status:', updateError);
    }
  }
});

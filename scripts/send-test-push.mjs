#!/usr/bin/env node
/**
 * Envia uma notificação Web Push de teste para uma inscrição salva no Supabase.
 * Uso: node scripts/send-test-push.mjs
 * Env: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, e uma das opções:
 *   - SUBSCRIPTION_JSON: JSON da linha push_subscriptions (endpoint, p256dh, auth)
 *   - Ou passar endpoint, p256dh, auth via env (ENDPOINT, P256DH, AUTH).
 */
import webPush from 'web-push';

const vapidPublic = process.env.VAPID_PUBLIC_KEY;
const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
const subJson = process.env.SUBSCRIPTION_JSON;

if (!vapidPublic || !vapidPrivate) {
  console.error('Defina VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY');
  process.exit(1);
}

let subscription;
if (subJson) {
  try {
    const o = JSON.parse(subJson);
    subscription = {
      endpoint: o.endpoint,
      keys: { p256dh: o.p256dh, auth: o.auth },
    };
  } catch (e) {
    console.error('SUBSCRIPTION_JSON inválido:', e.message);
    process.exit(1);
  }
} else if (process.env.ENDPOINT && process.env.P256DH && process.env.AUTH) {
  subscription = {
    endpoint: process.env.ENDPOINT,
    keys: { p256dh: process.env.P256DH, auth: process.env.AUTH },
  };
} else {
  console.error('Defina SUBSCRIPTION_JSON (ou ENDPOINT, P256DH, AUTH).');
  console.error('Ex.: copie uma linha de push_subscriptions do Supabase.');
  process.exit(1);
}

webPush.setVapidDetails('mailto:nailcare@local', vapidPublic, vapidPrivate);

const payload = JSON.stringify({ title: 'NailCare', body: 'Teste manual de notificação.' });

try {
  await webPush.sendNotification(subscription, payload, { TTL: 60 });
  console.log('Push enviado. Verifique o dispositivo onde o PWA está ativo.');
} catch (e) {
  console.error('Erro ao enviar push:', e.message);
  if (e.statusCode) console.error('statusCode:', e.statusCode);
  process.exit(1);
}

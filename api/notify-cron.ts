import type { VercelRequest, VercelResponse } from '@vercel/node';
import webPush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!;
const CRON_SECRET = process.env.CRON_SECRET!;
const TZ = 'America/Sao_Paulo';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails('mailto:nailcare@local', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

interface AppointmentRow {
  id: string;
  date: string;
  client_name: string | null;
  notified_1day_at: string | null;
  notified_1h_at: string | null;
  services: { name: string } | null;
}

function getTomorrowRangeBRT(): { start: Date; end: Date } {
  const now = new Date();
  const inBR = new Date(now.toLocaleString('en-US', { timeZone: TZ }));
  inBR.setDate(inBR.getDate() + 1);
  const y = inBR.getFullYear();
  const m = inBR.getMonth();
  const d = inBR.getDate();
  const start = new Date(Date.UTC(y, m, d, 3, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, d + 1, 3, 0, 0, 0));
  return { start, end };
}

function getOneHourWindow(): { start: Date; end: Date } {
  const now = Date.now();
  return {
    start: new Date(now + 50 * 60 * 1000),
    end: new Date(now + 70 * 60 * 1000),
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = req.headers.authorization;
  if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const now = new Date();
  const { start: tomorrowStart, end: tomorrowEnd } = getTomorrowRangeBRT();
  const { start: oneHourStart, end: oneHourEnd } = getOneHourWindow();

  const { data: subs, error: subsError } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth');

  if (subsError || !subs?.length) {
    if (subsError) console.error('NailCare notify-cron push_subscriptions:', subsError);
    return res.status(200).json({ sent: 0, message: 'No subscriptions or error' });
  }

  const { data: appointments, error: appError } = await supabase
    .from('appointments')
    .select('id, date, client_name, notified_1day_at, notified_1h_at, services(name)')
    .neq('status', 'Cancelado');

  if (appError || !appointments?.length) {
    if (appError) console.error('NailCare notify-cron appointments:', appError);
    return res.status(200).json({ sent: 0 });
  }

  const rows = appointments as AppointmentRow[];
  const clientName = (name: string | null) => name || 'Cliente';
  const serviceName = (row: AppointmentRow) => row.services?.name ?? 'Serviço';
  const timeStr = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
  let sent = 0;

  const payload = (title: string, body: string) =>
    JSON.stringify({ title: title || 'NailCare', body });

  const sendToAll = async (body: string) => {
    const invalidIds: string[] = [];
    for (const sub of subs as { id: string; endpoint: string; p256dh: string; auth: string }[]) {
      try {
        await webPush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload('NailCare', body),
          { TTL: 86400 }
        );
        sent++;
      } catch (e: unknown) {
        const status = (e as { statusCode?: number })?.statusCode;
        if (status === 410 || status === 404) invalidIds.push(sub.id);
        else console.error('NailCare web-push error:', e);
      }
    }
    if (invalidIds.length) {
      await supabase.from('push_subscriptions').delete().in('id', invalidIds);
    }
  };

  for (const row of rows) {
    const appDate = new Date(row.date);

    if (!row.notified_1day_at && appDate >= tomorrowStart && appDate < tomorrowEnd) {
      const body = `Amanhã às ${timeStr(row.date)} – ${clientName(row.client_name)} – ${serviceName(row)}`;
      await sendToAll(body);
      await supabase.from('appointments').update({ notified_1day_at: now.toISOString() }).eq('id', row.id);
    }

    if (!row.notified_1h_at && appDate >= oneHourStart && appDate < oneHourEnd) {
      const body = `Em 1 hora – ${clientName(row.client_name)} – ${serviceName(row)}`;
      await sendToAll(body);
      await supabase.from('appointments').update({ notified_1h_at: now.toISOString() }).eq('id', row.id);
    }
  }

  return res.status(200).json({ sent });
}

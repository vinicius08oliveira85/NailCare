import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const config = {
  api: { bodyParser: true },
};

interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

interface PushSubscriptionBody {
  endpoint: string;
  keys: PushSubscriptionKeys;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body as PushSubscriptionBody | undefined;
  if (!body?.endpoint || !body?.keys?.p256dh || !body?.keys?.auth) {
    return res.status(400).json({ error: 'endpoint and keys.p256dh, keys.auth required' });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        endpoint: body.endpoint,
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
      },
      { onConflict: 'endpoint' }
    );

  if (error) {
    console.error('NailCare subscribe error:', error);
    return res.status(500).json({ error: 'Failed to save subscription' });
  }
  return res.status(204).end();
}

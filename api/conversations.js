const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

async function supabase(method, path, body) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': method === 'POST' ? 'return=representation' : ''
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!r.ok) throw new Error(`Supabase error: ${r.status}`);
  const text = await r.text();
  return text ? JSON.parse(text) : null;
}

export default async function handler(req, res) {
  const { method } = req;
  const { action, userId, convId, title, history } = req.body || {};

  try {
    if (method === 'GET') {
      // Get all conversations for user
      const uid = req.query.userId;
      const data = await supabase('GET', `/conversations?user_id=eq.${uid}&order=updated_at.desc&limit=50`);
      return res.status(200).json({ conversations: data || [] });
    }

    if (method === 'POST') {
      if (action === 'save') {
        // Upsert conversation
        const data = await supabase('POST', '/conversations?on_conflict=id', {
          id: convId,
          user_id: userId,
          title: title || 'Percakapan Baru',
          history: history || [],
          updated_at: Date.now()
        });
        return res.status(200).json({ success: true, data });
      }

      if (action === 'rename') {
        await supabase('PATCH', `/conversations?id=eq.${convId}&user_id=eq.${userId}`, {
          title,
          updated_at: Date.now()
        });
        return res.status(200).json({ success: true });
      }

      if (action === 'delete') {
        await supabase('DELETE', `/conversations?id=eq.${convId}&user_id=eq.${userId}`);
        return res.status(200).json({ success: true });
      }
    }

    return res.status(400).json({ error: 'Invalid request' });
  } catch (err) {
    console.error('Conversations error:', err);
    return res.status(500).json({ error: err.message });
  }
}

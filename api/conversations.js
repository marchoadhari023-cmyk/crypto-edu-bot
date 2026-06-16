const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

async function supabase(method, path, body) {
  const url = SUPABASE_URL.replace('/rest/v1/', '') + '/rest/v1' + path;
  const r = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': method === 'POST' ? 'resolution=merge-duplicates,return=minimal' : 'return=minimal'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await r.text();
  return text ? JSON.parse(text) : null;
}

export default async function handler(req, res) {
  const { method } = req;

  try {
    if (method === 'GET') {
      const uid = req.query.userId;
      if (!uid) return res.status(400).json({ error: 'userId required' });
      
      const baseUrl = SUPABASE_URL.replace('/rest/v1/', '');
      const r = await fetch(
        `${baseUrl}/rest/v1/conversations?user_id=eq.${uid}&order=updated_at.desc&limit=100`,
        {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        }
      );
      const data = await r.json();
      return res.status(200).json({ conversations: Array.isArray(data) ? data : [] });
    }

    if (method === 'POST') {
      const { action, userId, convId, title, history } = req.body || {};

      if (action === 'save') {
        const baseUrl = SUPABASE_URL.replace('/rest/v1/', '');
        await fetch(`${baseUrl}/rest/v1/conversations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify({
            id: convId,
            user_id: userId,
            title: title || 'Percakapan Baru',
            history: history || [],
            updated_at: Date.now()
          })
        });
        return res.status(200).json({ success: true });
      }

      if (action === 'rename') {
        const baseUrl = SUPABASE_URL.replace('/rest/v1/', '');
        await fetch(`${baseUrl}/rest/v1/conversations?id=eq.${convId}&user_id=eq.${userId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          },
          body: JSON.stringify({ title, updated_at: Date.now() })
        });
        return res.status(200).json({ success: true });
      }

      if (action === 'delete') {
        const baseUrl = SUPABASE_URL.replace('/rest/v1/', '');
        await fetch(`${baseUrl}/rest/v1/conversations?id=eq.${convId}&user_id=eq.${userId}`, {
          method: 'DELETE',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        });
        return res.status(200).json({ success: true });
      }
    }

    return res.status(400).json({ error: 'Invalid request' });
  } catch (err) {
    console.error('Conversations error:', err);
    return res.status(500).json({ error: err.message });
  }
}

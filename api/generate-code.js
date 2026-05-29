import { createHash } from 'crypto';

// Daftar kode yang sudah dibuat (in-memory, reset saat redeploy)
// Untuk production sebaiknya pakai database
const usedCodes = new Set();

function generateCode(type = 'regular') {
  const prefix = type === 'earlybird' ? 'EB' : 'PR';
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
  return `${prefix}-${random}-${timestamp}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ADMIN_SECRET = process.env.ADMIN_SECRET;
  const { secret, type, count = 1 } = req.body;

  // Verifikasi admin
  if (secret !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const codes = [];
  for (let i = 0; i < Math.min(count, 10); i++) {
    const code = generateCode(type);
    codes.push(code);
  }

  return res.status(200).json({ 
    success: true, 
    codes,
    type: type || 'regular',
    price: type === 'earlybird' ? 'Rp 75.000' : 'Rp 100.000'
  });
}

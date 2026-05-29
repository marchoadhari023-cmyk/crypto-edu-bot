// Storage kode valid - pakai Vercel KV atau simpan di environment
// Untuk MVP, kita pakai sistem hash yang bisa diverifikasi tanpa database

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Code required' });
  }

  const VALID_CODES = process.env.VALID_PREMIUM_CODES || '';
  const validCodesArray = VALID_CODES.split(',').map(c => c.trim()).filter(Boolean);

  const isValid = validCodesArray.includes(code.toUpperCase().trim());
  const isEarlyBird = code.toUpperCase().startsWith('EB-');

  if (isValid) {
    return res.status(200).json({ 
      success: true, 
      type: isEarlyBird ? 'earlybird' : 'premium',
      message: isEarlyBird ? 'Early Bird aktif! Kamu bayar Rp 75.000 selamanya.' : 'Premium aktif! Unlimited pertanyaan.'
    });
  }

  return res.status(200).json({ 
    success: false, 
    message: 'Kode tidak valid atau sudah digunakan.' 
  });
}

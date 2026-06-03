export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Code required' });

  const cleanCode = code.toUpperCase().trim();

  // Premium+ codes (PP-XXXXXX)
  const premiumPlusPattern = /^PP-[A-Z0-9]{6}$/;
  if (premiumPlusPattern.test(cleanCode)) {
    return res.status(200).json({
      success: true,
      tier: 'premiumplus',
      message: 'Premium+ aktif! Akses penuh + exclusive signals + mentoring Marcho.'
    });
  }

  // Premium codes (MB-XXXXXX or PR-XXXXXX)
  const premiumPattern = /^(MB|PR)-[A-Z0-9]{6}$/;
  if (premiumPattern.test(cleanCode)) {
    return res.status(200).json({
      success: true,
      tier: 'premium',
      message: 'Premium aktif! AI lebih banyak + kelas dasar + Discord komunitas.'
    });
  }

  // Check against VALID_PREMIUM_CODES env
  const VALID_CODES = process.env.VALID_PREMIUM_CODES || '';
  const validCodesArray = VALID_CODES.split(',').map(c => c.trim()).filter(Boolean);
  if (validCodesArray.includes(cleanCode)) {
    const isPlus = cleanCode.startsWith('PP-') || cleanCode.startsWith('EB-');
    return res.status(200).json({
      success: true,
      tier: isPlus ? 'premiumplus' : 'premium',
      message: isPlus
        ? 'Premium+ aktif! Akses penuh + exclusive signals + mentoring Marcho.'
        : 'Premium aktif! AI lebih banyak + kelas dasar + Discord komunitas.'
    });
  }

  return res.status(200).json({
    success: false,
    message: 'Kode tidak valid. Pastikan kode yang kamu masukkan benar.'
  });
}

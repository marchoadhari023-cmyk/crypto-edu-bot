function generateMemberCode(userId) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'MB-';
  const seed = userId.toString();
  for (let i = 0; i < 6; i++) {
    const idx = (parseInt(seed[i % seed.length]) + i * 7) % chars.length;
    code += chars[idx];
  }
  return code;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Code required' });

  const cleanCode = code.toUpperCase().trim();

  // Validasi format kode member (MB-XXXXXX)
  const memberPattern = /^MB-[A-Z0-9]{6}$/;
  if (memberPattern.test(cleanCode)) {
    return res.status(200).json({
      success: true,
      type: 'member',
      message: 'Kode member valid! Kamu dapat 10 pertanyaan/hari.'
    });
  }

  return res.status(200).json({
    success: false,
    message: 'Kode tidak valid. Pastikan kode yang kamu masukkan benar.'
  });
}

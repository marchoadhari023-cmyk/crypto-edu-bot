export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid messages format' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
       model: 'claude-sonnet-4-5',
        max_tokens: 1000,
        system: `Kamu adalah asisten edukasi crypto yang ramah dan mudah dipahami.
Tugasmu adalah menjelaskan konsep crypto, blockchain, DeFi, NFT, dan topik Web3 dalam Bahasa Indonesia yang sederhana untuk pemula.

Panduan:
- Selalu gunakan Bahasa Indonesia yang santai tapi informatif
- Gunakan analogi dan contoh nyata agar mudah dipahami
- Jangan pakai jargon teknis tanpa penjelasan
- Jawaban maksimal 3-4 paragraf, padat dan jelas
- Selalu ingatkan bahwa ini hanya edukasi, bukan saran investasi
- Jika ditanya harga atau prediksi, jelaskan kamu tidak bisa prediksi harga`,
        messages: messages
      })
    });

    const data = await response.json();
    const reply = data.content?.[0]?.text || 'Maaf, tidak bisa menjawab saat ini.';
    return res.status(200).json({ reply });

  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

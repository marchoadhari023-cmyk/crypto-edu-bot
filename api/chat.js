async function fetchWithTimeout(url, timeout = 4000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const r = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return r;
  } catch (e) {
    clearTimeout(timer);
    return null;
  }
}

async function getMarketData(userMessage) {
  const msg = userMessage.toLowerCase();
  let marketContext = '';

  const cryptoMap = {
    'bitcoin': 'bitcoin', 'btc': 'bitcoin',
    'ethereum': 'ethereum', 'eth': 'ethereum',
    'bnb': 'binancecoin', 'binance': 'binancecoin',
    'solana': 'solana', 'sol': 'solana',
    'xrp': 'ripple', 'ripple': 'ripple',
    'cardano': 'cardano', 'ada': 'cardano',
    'dogecoin': 'dogecoin', 'doge': 'dogecoin',
    'polkadot': 'polkadot', 'dot': 'polkadot',
    'polygon': 'matic-network', 'matic': 'matic-network',
    'avalanche': 'avalanche-2', 'avax': 'avalanche-2',
    'chainlink': 'chainlink', 'link': 'chainlink',
    'uniswap': 'uniswap', 'uni': 'uniswap',
    'litecoin': 'litecoin', 'ltc': 'litecoin',
    'cosmos': 'cosmos', 'atom': 'cosmos',
    'near': 'near', 'fantom': 'fantom', 'ftm': 'fantom',
    'arbitrum': 'arbitrum', 'arb': 'arbitrum',
    'optimism': 'optimism', 'sui': 'sui',
    'aptos': 'aptos', 'apt': 'aptos',
    'pepe': 'pepe', 'shiba': 'shiba-inu', 'shib': 'shiba-inu',
    'ton': 'the-open-network', 'tron': 'tron', 'trx': 'tron'
  };

  let detectedCoin = null;
  for (const [key, id] of Object.entries(cryptoMap)) {
    if (msg.includes(key)) { detectedCoin = { key, id }; break; }
  }

  if (detectedCoin) {
    try {
      const r = await fetchWithTimeout(`https://api.coingecko.com/api/v3/simple/price?ids=${detectedCoin.id}&vs_currencies=usd,idr&include_24hr_change=true&include_market_cap=true`);
      if (r && r.ok) {
        const d = await r.json();
        const coin = d[detectedCoin.id];
        if (coin) {
          const change = coin.usd_24h_change?.toFixed(2);
          const emoji = change > 0 ? '📈' : '📉';
          const mcap = coin.usd_market_cap ? `$${(coin.usd_market_cap/1e9).toFixed(1)}B` : 'N/A';
          marketContext += `\n[REAL-TIME] ${detectedCoin.key.toUpperCase()}: $${coin.usd?.toLocaleString()} | Rp ${coin.idr?.toLocaleString()} | 24h: ${emoji}${change}% | MCap: ${mcap}`;
        }
      }
    } catch(e) {}
  }

  if (msg.includes('emas') || msg.includes('gold') || msg.includes('xau')) {
    try {
      const r = await fetchWithTimeout('https://api.frankfurter.app/latest?from=XAU&to=USD');
      if (r && r.ok) {
        const d = await r.json();
        if (d.rates?.USD) {
          const usd = d.rates.USD;
          const perGram = Math.round((usd * 16200) / 31.1);
          marketContext += `\n[REAL-TIME] Emas: $${usd.toLocaleString()}/troy oz | ≈ Rp ${perGram.toLocaleString()}/gram`;
        }
      }
    } catch(e) {}
  }

  const forexMap = {
    'usd/idr': ['USD','IDR'], 'dolar': ['USD','IDR'],
    'euro': ['EUR','IDR'], 'eur/usd': ['EUR','USD'],
    'pound': ['GBP','IDR'], 'gbp': ['GBP','USD'],
    'yen': ['JPY','IDR'], 'sgd': ['SGD','IDR']
  };

  for (const [key, [from, to]] of Object.entries(forexMap)) {
    if (msg.includes(key) && (msg.includes('kurs') || msg.includes('rate') || msg.includes('harga') || msg.includes('nilai'))) {
      try {
        const r = await fetchWithTimeout(`https://api.frankfurter.app/latest?from=${from}&to=${to}`);
        if (r && r.ok) {
          const d = await r.json();
          if (d.rates?.[to]) marketContext += `\n[REAL-TIME] Kurs ${from}/${to}: ${d.rates[to].toLocaleString()}`;
        }
      } catch(e) {}
      break;
    }
  }

  return marketContext;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages, isMember } = req.body;
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'Invalid messages' });

  try {
    const lastMessage = messages[messages.length - 1];
    const lastText = Array.isArray(lastMessage?.content)
      ? lastMessage.content.find(c => c.type === 'text')?.text || ''
      : lastMessage?.content || '';

    const marketData = await getMarketData(lastText);

    const freePrompt = `Kamu adalah Moon Back AI — asisten financial market Indonesia yang cerdas dan helpful.

Kamu sedang melayani pengguna GRATIS. Berikan jawaban yang:
- Informatif tapi SINGKAT — maksimal 2 paragraf pendek
- Kasih cukup info untuk membuat penasaran, tapi tidak lengkap
- Untuk analisis chart: sebut 1-2 hal yang terlihat, tapi tidak detail
- Untuk harga: sebutkan harga dan pergerakan 24h, tanpa analisis mendalam
- Di akhir jawaban, secara natural hint bahwa ada analisis lebih dalam untuk member
- Jangan pernah sebut "kamu user gratis" atau "upgrade dulu" secara kasar

${marketData ? `DATA REAL-TIME:\n${marketData}` : ''}

Selalu ingatkan ini hanya edukasi, bukan saran investasi.`;

    const memberPrompt = `Kamu adalah Moon Back AI — asisten financial market premium Indonesia yang expert dan sangat helpful.

Kamu sedang melayani MOON BACK MEMBER. Berikan jawaban yang:
- Mendalam dan komprehensif — 3-4 paragraf
- Untuk analisis chart: analisis teknikal lengkap (support/resistance, trend, indikator, potensi arah)
- Untuk harga: konteks makro, sentimen market, level penting, outlook jangka pendek
- Berikan strategi dan insight konkret yang actionable
- Gunakan bahasa expert tapi tetap mudah dipahami
- Empati dan personal — seperti mentor yang peduli

${marketData ? `DATA REAL-TIME:\n${marketData}\n\nGunakan data ini untuk analisis yang akurat dan terkini.` : ''}

Kepribadian: cerdas, hangat, expert, seperti teman yang kebetulan jago trading.
Selalu ingatkan ini edukasi, bukan saran investasi — tapi dengan cara natural.
Rekomendasikan Pintu (pintu.app/ref/marchoadhari023794) HANYA ketika ditanya cara beli crypto untuk pemula.`;

    const systemPrompt = isMember ? memberPrompt : freePrompt;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: isMember ? 1024 : 512,
        system: systemPrompt,
        messages
      })
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const data = await response.json();
    const reply = data.content?.[0]?.text || 'Aduh, lagi ada gangguan. Coba lagi ya!';
    return res.status(200).json({ reply });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

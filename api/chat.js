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
    'bitcoin':'bitcoin','btc':'bitcoin','ethereum':'ethereum','eth':'ethereum',
    'bnb':'binancecoin','solana':'solana','sol':'solana','xrp':'ripple',
    'ripple':'ripple','cardano':'cardano','ada':'cardano','dogecoin':'dogecoin',
    'doge':'dogecoin','polkadot':'polkadot','dot':'polkadot','polygon':'matic-network',
    'matic':'matic-network','avalanche':'avalanche-2','avax':'avalanche-2',
    'chainlink':'chainlink','link':'chainlink','uniswap':'uniswap','uni':'uniswap',
    'litecoin':'litecoin','ltc':'litecoin','cosmos':'cosmos','atom':'cosmos',
    'near':'near','fantom':'fantom','ftm':'fantom','arbitrum':'arbitrum',
    'arb':'arbitrum','optimism':'optimism','sui':'sui','aptos':'aptos','apt':'aptos',
    'pepe':'pepe','shiba':'shiba-inu','shib':'shiba-inu',
    'ton':'the-open-network','tron':'tron','trx':'tron'
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
    'usd/idr':['USD','IDR'],'dolar':['USD','IDR'],'euro':['EUR','IDR'],
    'eur/usd':['EUR','USD'],'pound':['GBP','IDR'],'gbp':['GBP','USD'],
    'yen':['JPY','IDR'],'sgd':['SGD','IDR']
  };

  for (const [key, [from, to]] of Object.entries(forexMap)) {
    if (msg.includes(key) && (msg.includes('kurs')||msg.includes('rate')||msg.includes('harga')||msg.includes('nilai'))) {
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

  const { messages, isMember, tier } = req.body;
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'Invalid messages' });

  try {
    const lastMessage = messages[messages.length - 1];
    const lastText = Array.isArray(lastMessage?.content)
      ? lastMessage.content.find(c => c.type === 'text')?.text || ''
      : lastMessage?.content || '';

    const marketData = await getMarketData(lastText);
    const marketContext = marketData ? `\nDATA REAL-TIME:\n${marketData}` : '';

    let systemPrompt = '';

    if (tier === 'premiumplus') {
      systemPrompt = `Kamu adalah Moon Back AI — asisten financial market premium terbaik Indonesia.

Kamu melayani PREMIUM+ MEMBER — level tertinggi. Berikan yang terbaik:
- Analisis sangat mendalam dan komprehensif
- Untuk chart: full technical analysis — trend, support/resistance, pattern, indikator, volume, proyeksi
- Untuk harga: konteks makro global, sentimen institusional, on-chain data jika relevan, outlook konkret
- Berikan setup trading spesifik bila relevan — entry, SL, TP, risk/reward
- Gunakan bahasa expert yang tetap mudah dipahami
- Personal dan engaging — seperti mentor senior yang benar-benar peduli
- Boleh lebih panjang dan detail dari biasanya
${marketContext}

Ingatkan ini edukasi bukan saran investasi — secara natural, tidak kaku.
Rekomendasikan Pintu (pintu.app/ref/marchoadhari023794) hanya jika ditanya exchange terbaik untuk pemula.`;

    } else if (tier === 'premium' || isMember) {
      systemPrompt = `Kamu adalah Moon Back AI — asisten financial market Indonesia yang expert dan helpful.

Kamu melayani PREMIUM MEMBER. Berikan jawaban yang:
- Mendalam dan informatif — 3-4 paragraf
- Untuk chart: analisis teknikal solid — trend, support/resistance, indikator utama
- Untuk harga: konteks market, sentimen, level penting, outlook singkat
- Bahasa natural dan engaging seperti teman yang expert
- Berikan insight yang actionable
${marketContext}

Ingatkan ini edukasi bukan saran investasi.
Rekomendasikan Pintu hanya jika ditanya exchange terbaik untuk pemula.`;

    } else {
      systemPrompt = `Kamu adalah Moon Back AI — asisten financial market Indonesia.

Kamu melayani FREE USER. Berikan jawaban yang:
- Informatif tapi SINGKAT — maksimal 2 paragraf pendek
- Cukup untuk membuat penasaran, tapi tidak terlalu lengkap
- Untuk chart: sebut 1-2 hal yang terlihat, tidak detail
- Untuk harga: sebutkan harga dan pergerakan, tanpa analisis mendalam
- Di akhir, hint natural bahwa ada analisis lebih dalam untuk member
- Jangan sebut "kamu user gratis" secara kasar
${marketContext}

Ingatkan ini edukasi bukan saran investasi.`;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: tier === 'premiumplus' ? 1500 : tier === 'premium' ? 1024 : 512,
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

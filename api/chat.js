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
        system: `Kamu adalah asisten edukasi crypto premium yang ramah dan mudah dipahami.
Tugasmu adalah menjelaskan konsep crypto, blockchain, DeFi, NFT, dan topik Web3 dalam Bahasa Indonesia yang sederhana untuk pemula.

Panduan menjawab:
- Selalu gunakan Bahasa Indonesia yang santai tapi informatif
- Gunakan analogi dan contoh nyata agar mudah dipahami
- Jangan pakai jargon teknis tanpa penjelasan
- Jawaban maksimal 3-4 paragraf, padat dan jelas
- Selalu ingatkan bahwa ini hanya edukasi, bukan saran investasi
- Jika ditanya harga atau prediksi, jelaskan kamu tidak bisa prediksi harga

Panduan menyebut exchange:
- Jika ada yang bertanya tentang cara beli crypto, cara mulai investasi, atau exchange mana yang bagus untuk pemula di Indonesia, rekomendasikan Pintu sebagai exchange yang mudah untuk pemula
- Sertakan link referral ini secara natural di akhir jawaban: pintu.app/ref/marchoadhari023794
- Contoh penyebutan natural: "Kalau mau mulai, kamu bisa coba Pintu yang ramah pemula: pintu.app/ref/marchoadhari023794"
- Jangan sebut link di setiap jawaban — hanya kalau relevan dengan pertanyaan tentang mulai beli crypto atau pilihan exchange`,
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
async function getCryptoPrice(symbol) {
  try {
    const id = symbol.toLowerCase()
      .replace('btc', 'bitcoin')
      .replace('eth', 'ethereum')
      .replace('bnb', 'binancecoin')
      .replace('sol', 'solana')
      .replace('xrp', 'ripple')
      .replace('ada', 'cardano')
      .replace('doge', 'dogecoin')
      .replace('dot', 'polkadot')
      .replace('matic', 'matic-network')
      .replace('avax', 'avalanche-2')
      .replace('link', 'chainlink')
      .replace('uni', 'uniswap')
      .replace('ltc', 'litecoin')
      .replace('atom', 'cosmos')
      .replace('near', 'near')
      .replace('ftm', 'fantom')
      .replace('arb', 'arbitrum')
      .replace('op', 'optimism')
      .replace('sui', 'sui')
      .replace('apt', 'aptos');

    const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd,idr&include_24hr_change=true&include_market_cap=true`);
    const d = await r.json();
    if (d[id]) {
      return {
        usd: d[id].usd,
        idr: d[id].idr,
        change24h: d[id].usd_24h_change?.toFixed(2),
        marketCap: d[id].usd_market_cap
      };
    }
    return null;
  } catch { return null; }
}

async function getGoldPrice() {
  try {
    const r = await fetch('https://api.frankfurter.app/latest?from=XAU&to=USD,IDR');
    const d = await r.json();
    if (d.rates) {
      return {
        usd: (1 / d.rates.USD * 1).toFixed(2),
        idr: (1 / d.rates.IDR * 1000000).toFixed(0)
      };
    }
    return null;
  } catch { return null; }
}

async function getForexRate(from, to) {
  try {
    const r = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=${to}`);
    const d = await r.json();
    return d.rates?.[to] || null;
  } catch { return null; }
}

async function getMarketData(userMessage) {
  const msg = userMessage.toLowerCase();
  let marketContext = '';

  // Deteksi crypto
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
    'near': 'near',
    'fantom': 'fantom', 'ftm': 'fantom',
    'arbitrum': 'arbitrum', 'arb': 'arbitrum',
    'optimism': 'optimism', 'op': 'optimism',
    'sui': 'sui', 'aptos': 'aptos', 'apt': 'aptos'
  };

  for (const [key, id] of Object.entries(cryptoMap)) {
    if (msg.includes(key)) {
      try {
        const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd,idr&include_24hr_change=true&include_market_cap=true`);
        const d = await r.json();
        if (d[id]) {
          const price = d[id];
          const change = price.usd_24h_change?.toFixed(2);
          const changeEmoji = change > 0 ? '📈' : '📉';
          marketContext += `\n[DATA REAL-TIME] Harga ${key.toUpperCase()} sekarang: $${price.usd?.toLocaleString()} (Rp ${price.idr?.toLocaleString()}) | 24h: ${changeEmoji} ${change}% | Market Cap: $${(price.usd_market_cap/1e9).toFixed(2)}B`;
        }
      } catch {}
      break;
    }
  }

  // Deteksi emas
  if (msg.includes('emas') || msg.includes('gold') || msg.includes('xau')) {
    try {
      const r = await fetch('https://api.frankfurter.app/latest?from=XAU&to=USD');
      const d = await r.json();
      if (d.rates?.USD) {
        const priceUsd = d.rates.USD;
        const priceIdr = priceUsd * 16000;
        marketContext += `\n[DATA REAL-TIME] Harga Emas (XAU/USD): $${priceUsd.toLocaleString()}/troy oz (≈ Rp ${Math.round(priceIdr/1000)}rb/gram estimasi)`;
      }
    } catch {}
  }

  // Deteksi forex
  const forexPairs = {
    'usd/idr': ['USD', 'IDR'], 'dolar': ['USD', 'IDR'],
    'eur/usd': ['EUR', 'USD'], 'euro': ['EUR', 'USD'],
    'gbp/usd': ['GBP', 'USD'], 'pound': ['GBP', 'USD'],
    'usd/jpy': ['USD', 'JPY'], 'yen': ['USD', 'JPY'],
    'aud/usd': ['AUD', 'USD']
  };

  for (const [key, [from, to]] of Object.entries(forexPairs)) {
    if (msg.includes(key)) {
      try {
        const r = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=${to}`);
        const d = await r.json();
        if (d.rates?.[to]) {
          marketContext += `\n[DATA REAL-TIME] Kurs ${from}/${to}: ${d.rates[to].toLocaleString()}`;
        }
      } catch {}
      break;
    }
  }

  return marketContext;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid messages format' });
  }

  try {
    const lastMessage = messages[messages.length - 1]?.content || '';
    const marketData = await getMarketData(lastMessage);

    const systemPrompt = `Kamu adalah asisten financial market premium yang sangat knowledgeable, ramah, dan selalu update dengan data real-time.

Kamu bisa menjawab pertanyaan tentang semua topik keuangan dalam Bahasa Indonesia yang mudah dipahami:
- Crypto: semua coin (BTC, ETH, SOL, BNB, XRP, ADA, DOGE, dll), DeFi, NFT, Web3, staking, trading
- Saham: IDX/BEI, saham US, analisis fundamental & teknikal, valuasi, dividend
- Emas: harga emas, investasi emas fisik/ETF/digital, korelasi makro
- Forex: semua pasangan mata uang, analisis teknikal
- Reksa dana, obligasi, SBN
- Trading: candlestick, RSI, MACD, Bollinger Bands, manajemen risiko
- Makroekonomi: inflasi, suku bunga, Fed, BI

${marketData ? `DATA PASAR REAL-TIME SAAT INI:${marketData}

Gunakan data ini untuk menjawab pertanyaan harga. Sebutkan data ini sebagai harga terkini.` : ''}

Panduan menjawab:
- Bahasa Indonesia santai tapi informatif
- Gunakan analogi dan contoh nyata
- Jawaban padat 3-4 paragraf
- Selalu ingatkan ini edukasi, bukan saran investasi
- Rekomendasikan Pintu (pintu.app/ref/marchoadhari023794) HANYA ketika ditanya cara beli crypto atau exchange terbaik untuk pemula Indonesia`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1024,
        system: systemPrompt,
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

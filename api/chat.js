async function fetchWithTimeout(url, timeout = 3000) {
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

  // Map crypto keywords ke CoinGecko ID
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

  // Cek apakah ada crypto yang disebutkan
  let detectedCoin = null;
  for (const [key, id] of Object.entries(cryptoMap)) {
    if (msg.includes(key)) {
      detectedCoin = { key, id };
      break;
    }
  }

  // Fetch harga crypto
  if (detectedCoin) {
    try {
      const r = await fetchWithTimeout(
        `https://api.coingecko.com/api/v3/simple/price?ids=${detectedCoin.id}&vs_currencies=usd,idr&include_24hr_change=true&include_market_cap=true`,
        4000
      );
      if (r && r.ok) {
        const d = await r.json();
        const coin = d[detectedCoin.id];
        if (coin) {
          const change = coin.usd_24h_change?.toFixed(2);
          const changeEmoji = change > 0 ? '📈' : '📉';
          const mcap = coin.usd_market_cap ? `$${(coin.usd_market_cap/1e9).toFixed(1)}B` : 'N/A';
          marketContext += `\n[HARGA REAL-TIME] ${detectedCoin.key.toUpperCase()}: $${coin.usd?.toLocaleString()} | Rp ${coin.idr?.toLocaleString()} | 24h: ${changeEmoji}${change}% | Market Cap: ${mcap}`;
        }
      }
    } catch (e) {}
  }

  // Fetch harga emas
  if (msg.includes('emas') || msg.includes('gold') || msg.includes('xau')) {
    try {
      const r = await fetchWithTimeout(
        'https://api.frankfurter.app/latest?from=XAU&to=USD',
        4000
      );
      if (r && r.ok) {
        const d = await r.json();
        if (d.rates?.USD) {
          const priceUsd = d.rates.USD;
          const priceIdr = Math.round(priceUsd * 16200);
          const perGramIdr = Math.round(priceIdr / 31.1);
          marketContext += `\n[HARGA REAL-TIME] Emas (XAU): $${priceUsd.toLocaleString()}/troy oz | ≈ Rp ${perGramIdr.toLocaleString()}/gram`;
        }
      }
    } catch (e) {}
  }

  // Fetch kurs forex
  const forexKeywords = {
    'usd': ['USD', 'IDR'], 'dolar': ['USD', 'IDR'],
    'euro': ['EUR', 'IDR'], 'eur': ['EUR', 'USD'],
    'pound': ['GBP', 'IDR'], 'gbp': ['GBP', 'USD'],
    'yen': ['JPY', 'IDR'], 'jpy': ['USD', 'JPY'],
    'sgd': ['SGD', 'IDR'], 'singapore': ['SGD', 'IDR']
  };

  for (const [key, [from, to]] of Object.entries(forexKeywords)) {
    if (msg.includes(key) && (msg.includes('kurs') || msg.includes('rate') || msg.includes('nilai') || msg.includes('harga'))) {
      try {
        const r = await fetchWithTimeout(
          `https://api.frankfurter.app/latest?from=${from}&to=${to}`,
          4000
        );
        if (r && r.ok) {
          const d = await r.json();
          if (d.rates?.[to]) {
            marketContext += `\n[KURS REAL-TIME] ${from}/${to}: ${d.rates[to].toLocaleString()}`;
          }
        }
      } catch (e) {}
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

    const systemPrompt = `Kamu adalah asisten financial market premium yang knowledgeable dan ramah. Jawab semua pertanyaan keuangan dalam Bahasa Indonesia yang mudah dipahami.

Topik yang kamu kuasai:
- Crypto: semua coin, DeFi, NFT, Web3, staking, trading
- Saham: IDX/BEI, saham US, analisis fundamental & teknikal
- Emas: investasi emas, korelasi makro
- Forex: semua pasangan mata uang
- Reksa dana, obligasi, SBN
- Trading: candlestick, RSI, MACD, manajemen risiko
- Makroekonomi: inflasi, suku bunga, Fed, BI

${marketData ? `DATA PASAR TERKINI:${marketData}

Gunakan data di atas untuk menjawab pertanyaan harga secara akurat. Sebutkan ini sebagai harga real-time.` : ''}

Panduan:
- Bahasa Indonesia santai tapi informatif
- Gunakan analogi dan contoh nyata
- Jawaban 3-4 paragraf, padat dan jelas
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

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.content?.[0]?.text || 'Maaf, tidak bisa menjawab saat ini.';
    return res.status(200).json({ reply });

  } catch (error) {
    console.error('Handler error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

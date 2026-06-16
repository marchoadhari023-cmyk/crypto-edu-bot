async function fetchWithTimeout(url, timeout = 5000) {
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

async function getStockPrice(symbol) {
  try {
    // Yahoo Finance API - no key needed
    const r = await fetchWithTimeout(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`
    );
    if (!r || !r.ok) return null;
    const d = await r.json();
    const meta = d?.chart?.result?.[0]?.meta;
    if (!meta) return null;
    return {
      symbol: meta.symbol,
      price: meta.regularMarketPrice,
      currency: meta.currency,
      change: meta.regularMarketChangePercent?.toFixed(2),
      name: meta.shortName || meta.symbol
    };
  } catch(e) { return null; }
}

async function getMarketData(userMessage) {
  const msg = userMessage.toLowerCase();
  let marketContext = '';

  // ===== CRYPTO =====
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
          marketContext += `\n[CRYPTO REAL-TIME] ${detectedCoin.key.toUpperCase()}: $${coin.usd?.toLocaleString()} | Rp ${coin.idr?.toLocaleString()} | 24h: ${emoji}${change}% | MCap: ${mcap}`;
        }
      }
    } catch(e) {}
  }

  // ===== EMAS =====
  if (msg.includes('emas') || msg.includes('gold') || msg.includes('xau')) {
    try {
      const r = await fetchWithTimeout('https://api.frankfurter.app/latest?from=XAU&to=USD');
      if (r && r.ok) {
        const d = await r.json();
        if (d.rates?.USD) {
          const usd = d.rates.USD;
          const perGram = Math.round((usd * 16200) / 31.1);
          marketContext += `\n[EMAS REAL-TIME] Emas: $${usd.toLocaleString()}/troy oz | ≈ Rp ${perGram.toLocaleString()}/gram`;
        }
      }
    } catch(e) {}
  }

  // ===== FOREX =====
  const forexMap = {
    'dolar':['USD','IDR'],'usd':['USD','IDR'],'euro':['EUR','IDR'],
    'eur':['EUR','USD'],'pound':['GBP','IDR'],'gbp':['GBP','USD'],
    'yen':['JPY','IDR'],'sgd':['SGD','IDR']
  };
  for (const [key, [from, to]] of Object.entries(forexMap)) {
    if (msg.includes(key) && (msg.includes('kurs')||msg.includes('rate')||msg.includes('harga')||msg.includes('berapa')||msg.includes('nilai'))) {
      try {
        const r = await fetchWithTimeout(`https://api.frankfurter.app/latest?from=${from}&to=${to}`);
        if (r && r.ok) {
          const d = await r.json();
          if (d.rates?.[to]) marketContext += `\n[FOREX REAL-TIME] Kurs ${from}/${to}: ${d.rates[to].toLocaleString()}`;
        }
      } catch(e) {}
      break;
    }
  }

  // ===== SAHAM IDX =====
  const idxStocks = {
    'bbca': 'BBCA.JK', 'bca': 'BBCA.JK',
    'bbri': 'BBRI.JK', 'bri': 'BBRI.JK',
    'bmri': 'BMRI.JK', 'mandiri': 'BMRI.JK',
    'bbni': 'BBNI.JK', 'bni': 'BBNI.JK',
    'tlkm': 'TLKM.JK', 'telkom': 'TLKM.JK',
    'asii': 'ASII.JK', 'astra': 'ASII.JK',
    'goto': 'GOTO.JK', 'gojek': 'GOTO.JK',
    'antm': 'ANTM.JK', 'antam': 'ANTM.JK',
    'unvr': 'UNVR.JK', 'unilever': 'UNVR.JK',
    'klbf': 'KLBF.JK', 'kalbe': 'KLBF.JK',
    'bsde': 'BSDE.JK', 'icbp': 'ICBP.JK',
    'indf': 'INDF.JK', 'indofood': 'INDF.JK',
    'pgas': 'PGAS.JK', 'smgr': 'SMGR.JK',
    'adro': 'ADRO.JK', 'adaro': 'ADRO.JK',
    'ptba': 'PTBA.JK', 'hrum': 'HRUM.JK',
    'inkp': 'INKP.JK', 'tpia': 'TPIA.JK',
    'emtk': 'EMTK.JK', 'sido': 'SIDO.JK'
  };

  for (const [key, ticker] of Object.entries(idxStocks)) {
    if (msg.includes(key)) {
      const stock = await getStockPrice(ticker);
      if (stock) {
        const emoji = parseFloat(stock.change) >= 0 ? '📈' : '📉';
        marketContext += `\n[SAHAM IDX REAL-TIME] ${stock.name} (${stock.symbol}): Rp ${stock.price?.toLocaleString()} | ${emoji}${stock.change}%`;
      }
      break;
    }
  }

  // ===== SAHAM US =====
  const usStocks = {
    'apple': 'AAPL', 'aapl': 'AAPL',
    'microsoft': 'MSFT', 'msft': 'MSFT',
    'google': 'GOOGL', 'alphabet': 'GOOGL', 'googl': 'GOOGL',
    'amazon': 'AMZN', 'amzn': 'AMZN',
    'meta': 'META', 'facebook': 'META',
    'nvidia': 'NVDA', 'nvda': 'NVDA',
    'tesla': 'TSLA', 'tsla': 'TSLA',
    'netflix': 'NFLX', 'nflx': 'NFLX',
    'spacex': 'SPCX', 'spcx': 'SPCX',
    'openai': 'OPAI', 'berkshire': 'BRK-B',
    'jpmorgan': 'JPM', 'jpm': 'JPM',
    'coca cola': 'KO', 'ko': 'KO',
    'disney': 'DIS', 'dis': 'DIS',
    'intel': 'INTC', 'intc': 'INTC',
    'amd': 'AMD', 'qualcomm': 'QCOM'
  };

  for (const [key, ticker] of Object.entries(usStocks)) {
    if (msg.includes(key)) {
      const stock = await getStockPrice(ticker);
      if (stock) {
        const emoji = parseFloat(stock.change) >= 0 ? '📈' : '📉';
        marketContext += `\n[SAHAM US REAL-TIME] ${stock.name} (${stock.symbol}): $${stock.price?.toLocaleString()} | ${emoji}${stock.change}%`;
      }
      break;
    }
  }

  // ===== INDEKS PASAR =====
  const indices = {
    'ihsg': '^JKSE', 'idx composite': '^JKSE',
    's&p 500': '^GSPC', 'sp500': '^GSPC', 's&p': '^GSPC',
    'nasdaq': '^IXIC', 'dow jones': '^DJI', 'dow': '^DJI',
    'nikkei': '^N225', 'hang seng': '^HSI', 'ftse': '^FTSE'
  };

  for (const [key, ticker] of Object.entries(indices)) {
    if (msg.includes(key)) {
      const idx = await getStockPrice(ticker);
      if (idx) {
        const emoji = parseFloat(idx.change) >= 0 ? '📈' : '📉';
        marketContext += `\n[INDEKS REAL-TIME] ${key.toUpperCase()}: ${idx.price?.toLocaleString()} | ${emoji}${idx.change}%`;
      }
      break;
    }
  }

  return marketContext;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages, tier } = req.body;
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'Invalid messages' });

  try {
    const lastMessage = messages[messages.length - 1];
    const lastText = Array.isArray(lastMessage?.content)
      ? lastMessage.content.find(c => c.type === 'text')?.text || ''
      : lastMessage?.content || '';

    const marketData = await getMarketData(lastText);
    const marketContext = marketData
      ? `\n\nDATA PASAR REAL-TIME (WAJIB DIGUNAKAN, JANGAN MENGARANG HARGA):\n${marketData}`
      : '';

    const today = new Date().toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'});

    const systemPrompt = `Kamu adalah Moon Back AI — asisten financial market Indonesia paling komprehensif.

Hari ini: ${today}

KEAHLIAN KAMU — SEJARAH EKONOMI LENGKAP:
- Sistem barter awal peradaban manusia (sebelum 3000 SM)
- Lahirnya uang: koin elektrum Lydia ~600 SM, uang kertas China ~700 M
- Perdagangan kuno: Mesopotamia, Jalur Sutra, rempah-rempah Nusantara
- Merkantilisme Eropa abad 16-18, Revolusi Industri, lahirnya kapitalisme
- Standar Emas, sistem Bretton Woods 1944, Nixon Shock 1971
- Semua krisis ekonomi: Tulip Mania 1637, South Sea Bubble 1720, Panic of 1873/1893/1907
- Great Depression 1929, Marshall Plan, kebangkitan Jepang pasca WW2
- Krisis minyak 1973, Black Monday 1987, Jepang Lost Decade 1990an
- Asian Financial Crisis 1997 (krisis rupiah Indonesia secara mendalam)
- Dot-com bubble 2000, Global Financial Crisis 2008, European Debt Crisis
- COVID crash 2020, crypto bull run 2021, bear market 2022
- Semua event sampai pertengahan 2025

PASAR KEUANGAN:
- Saham IDX (BEI), NYSE, NASDAQ, bursa dunia lainnya
- Analisis teknikal dan fundamental lengkap
- IPO, rights issue, dividen, corporate action
- ETF, reksa dana, obligasi, SBN Indonesia
- Crypto, DeFi, NFT, blockchain
- Forex, komoditas, emas, minyak
- Kebijakan bank sentral (Fed, BI, ECB)
- Makroekonomi global dan Indonesia
${marketContext}

CARA MENJAWAB:
- Natural dan engaging seperti mentor expert
- Gunakan data real-time di atas jika tersedia — WAJIB, jangan mengarang harga
- Untuk event setelah Juli 2025: sampaikan jujur kamu tidak punya info terkini, sarankan cek Bloomberg/Reuters/IDX/Stockbit
- Untuk harga saham yang tidak ada datanya: arahkan ke Stockbit, RTI, Yahoo Finance
- Jangan pernah mengarang fakta atau harga

Rekomendasikan Pintu (pintu.app/ref/marchoadhari023794) hanya jika ditanya exchange crypto terbaik untuk pemula.
Ingatkan ini edukasi bukan saran investasi — natural di akhir jawaban.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
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

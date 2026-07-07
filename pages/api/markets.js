const FINNHUB_QUOTE_URL = "https://finnhub.io/api/v1/quote";

// ETF / proxy tickers used to approximate each market (Finnhub free tier
// supports US stock/ETF quotes but not indices, gold, or crypto directly).
const SYMBOLS = [
  { symbol: "SPY", label: "SPY" },
  { symbol: "DIA", label: "DIA" },
  { symbol: "QQQ", label: "QQQ" },
  { symbol: "GLD", label: "GLD" },
  { symbol: "IBIT", label: "IBIT" },
];

function formatValue(n) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatChange(pct) {
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

async function fetchQuote(symbol, apiKey) {
  const url = `${FINNHUB_QUOTE_URL}?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const data = await res.json();
    // Finnhub returns c=0 when a symbol has no data.
    if (!data || typeof data.c !== "number" || data.c === 0) return null;
    return { price: data.c, changePct: typeof data.dp === "number" ? data.dp : 0 };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export default async function handler(req, res) {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "FINNHUB_API_KEY not configured" });
  }

  const results = await Promise.all(
    SYMBOLS.map(async ({ symbol, label }) => {
      const quote = await fetchQuote(symbol, apiKey);
      if (!quote) return null;
      return {
        symbol: label,
        value: formatValue(quote.price),
        change: formatChange(quote.changePct),
        up: quote.changePct >= 0,
      };
    })
  );

  const items = results.filter(Boolean);

  if (items.length === 0) {
    return res.status(502).json({ error: "No market data available" });
  }

  // Cache at the CDN/edge for 60s, allow stale for 5 min while revalidating.
  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  return res.status(200).json({ items });
}

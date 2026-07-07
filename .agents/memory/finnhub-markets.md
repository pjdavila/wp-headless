---
name: Finnhub markets widget
description: Why the homepage Mercados widget uses ETF proxy tickers instead of real indices/spot.
---

# Finnhub markets data

The homepage "Mercados" widget pulls live quotes from Finnhub through a
server-side proxy (`/api/markets`) to protect the key.

**Rule:** use ETF proxy tickers, not index/spot symbols, for the free Finnhub tier.
Mapping: SPY=S&P 500, DIA=Dow Jones, QQQ=Nasdaq, GLD=Gold, IBIT=Bitcoin.

**Why:** Finnhub's free tier `/quote` endpoint only returns US stock/ETF
quotes. Index symbols (`^GSPC`, `^DJI`, `^IXIC`), forex/gold (`OANDA:XAU_USD`),
and crypto return `c:0` (no data) on the free plan. Rows are labeled with the
ETF ticker (not "S&P 500" etc.) on purpose: the displayed number is the ETF
price (e.g. SPY ~750), not the index/spot level (~5200), so labeling it as the
index would mislead readers.

**How to apply:** If a paid Finnhub plan is added and true index/spot values
are wanted, swap the symbol map in `pages/api/markets.js` to the real symbols
and relabel. A `c` of 0 from Finnhub means "no data for this symbol on this
plan" — treat it as unavailable (the route already filters those out).

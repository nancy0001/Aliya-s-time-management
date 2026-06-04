#!/usr/bin/env node

const fs = require('fs/promises');

const WATCHLIST = ['300750', '600519', '002594', '601318', '000858'];

async function fetchText(url, headers = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Accept: '*/*',
        Referer: 'https://q.10jqka.com.cn/',
        ...headers
      },
      signal: controller.signal
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function parseJsonp(text) {
  const start = text.indexOf('(');
  const end = text.lastIndexOf(')');
  if (start >= 0 && end > start) {
    return JSON.parse(text.slice(start + 1, end));
  }
  return JSON.parse(text);
}

async function fetchThsRealhead(code) {
  const market = code.startsWith('6') ? '17' : '33';
  return fetchThsRealheadByKey(`${market}_${code}`, code);
}

async function fetchThsRealheadByKey(key, code = null) {
  const url = `http://d.10jqka.com.cn/v2/realhead/${key}/last.js`;
  const payload = parseJsonp(await fetchText(url, { Referer: 'http://d.10jqka.com.cn/' }));
  const items = payload.items || {};
  return {
    code: code || payload['5'] || key,
    name: payload.name,
    price: Number(items['10'] || items['6'] || 0),
    change_pct: Number(items['199112'] || 0),
    change: Number(items['264648'] || 0),
    volume: Number(items['13'] || 0),
    amount: Number(items['19'] || 0),
    update_time: payload.updateTime || payload.time || null
  };
}

async function fetchMarketOverview() {
  const indices = [
    { key: '16_1A0001', code: '000001.SH', name: '上证指数' },
    { key: '33_399001', code: '399001.SZ', name: '深证成指' },
    { key: '33_399006', code: '399006.SZ', name: '创业板指' }
  ];
  const rows = await Promise.all(indices.map(async (i) => {
    const r = await fetchThsRealheadByKey(i.key, i.code);
    return { ...r, name: i.name };
  }));
  return rows;
}

async function fetchHotRotation() {
  const text = await fetchText('https://q.10jqka.com.cn/api.php?t=gnldt&d=jsonp');
  const list = parseJsonp(text);
  return (Array.isArray(list) ? list : []).slice(0, 20).map((x) => ({
    date: x.date,
    title: x.content || '',
    url: x.url || ''
  }));
}

async function fetchEastmoneyTop10(sortField) {
  const base = 'https://push2.eastmoney.com/api/qt/clist/get';
  const params = new URLSearchParams({
    pn: '1',
    pz: '10',
    po: '1',
    np: '1',
    ut: 'bd1d9ddb04089700cf9c27f6f7426281',
    fltt: '2',
    invt: '2',
    fid: sortField,
    fs: 'm:0+t:6,m:0+t:13,m:1+t:2,m:1+t:23',
    fields: 'f12,f14,f2,f3,f4,f5,f6'
  });
  const text = await fetchText(`${base}?${params.toString()}`, { Referer: 'https://quote.eastmoney.com/' });
  const json = JSON.parse(text);
  const diff = json?.data?.diff || [];
  return diff.map((x) => ({
    code: x.f12,
    name: x.f14,
    price: x.f2,
    change_pct: x.f3,
    change: x.f4,
    volume: x.f5,
    amount: x.f6
  }));
}

async function fetchUsOverview() {
  const symbols = ['^DJI', '^GSPC', '^IXIC'];
  const text = await fetchText(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols.join(','))}`);
  const rows = JSON.parse(text)?.quoteResponse?.result || [];
  return rows.map((r) => ({
    symbol: r.symbol,
    name: r.shortName,
    price: r.regularMarketPrice,
    change: r.regularMarketChange,
    change_pct: r.regularMarketChangePercent,
    time: r.regularMarketTime
  }));
}

async function fetchUsHotSectors() {
  const etfs = ['XLK', 'XLE', 'XLF', 'XLV', 'XLY', 'XLI', 'XLP', 'XLB', 'XLU', 'IYR', 'SOXX'];
  const text = await fetchText(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(etfs.join(','))}`);
  const rows = JSON.parse(text)?.quoteResponse?.result || [];
  return rows
    .map((r) => ({
      symbol: r.symbol,
      name: r.shortName,
      price: r.regularMarketPrice,
      change_pct: r.regularMarketChangePercent
    }))
    .sort((a, b) => (b.change_pct || 0) - (a.change_pct || 0));
}

async function main() {
  const now = new Date().toISOString();

  const [market, hotRotation, topVol, topAmount, watchlist, usOvernight, usSectors] = await Promise.all([
    fetchMarketOverview(),
    fetchHotRotation().catch(() => []),
    fetchEastmoneyTop10('f5').catch(() => []),
    fetchEastmoneyTop10('f6').catch(() => []),
    Promise.all(WATCHLIST.map((c) => fetchThsRealhead(c).catch(() => ({ code: c, error: true })))),
    fetchUsOverview().catch(() => []),
    fetchUsHotSectors().catch(() => [])
  ]);

  const dashboardData = {
    generated_at: now,
    market_overview: market,
    hot_rotation: hotRotation,
    top10_by_volume: topVol,
    top10_by_amount: topAmount,
    watchlist,
    us_overnight: usOvernight,
    us_hot_sectors: usSectors
  };

  await fs.writeFile('data/dashboard-data.json', JSON.stringify(dashboardData, null, 2), 'utf8');
  console.log('Updated: data/dashboard-data.json');
}

main().catch((err) => {
  console.error('Update failed:', err.message);
  process.exit(1);
});

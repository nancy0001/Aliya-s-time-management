#!/usr/bin/env node

const code = process.argv[2];
if (!code || !/^\d{6}$/.test(code)) {
  console.error('Usage: node scripts/fetch_10jqka.js <6-digit-code> [market]');
  console.error('Example: node scripts/fetch_10jqka.js 300750 33');
  process.exit(1);
}

const market = process.argv[3] || (code.startsWith('6') ? '17' : '33');
const url = `http://d.10jqka.com.cn/v6/line/${market}_${code}/01/last.js`;

async function main() {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'application/javascript,text/plain,*/*',
      'Referer': 'http://d.10jqka.com.cn/'
    }
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }

  const text = await res.text();
  const start = text.indexOf('(');
  const end = text.lastIndexOf(')');
  if (start < 0 || end < 0 || end <= start) {
    throw new Error('Unexpected response format');
  }

  const payload = JSON.parse(text.slice(start + 1, end));
  const rows = (payload.data || '').split(';').filter(Boolean);
  const latest = rows[rows.length - 1]?.split(',') || [];

  const result = {
    code,
    market,
    name: payload.name,
    today: payload.today,
    latest: latest.length
      ? {
          date: latest[0],
          open: Number(latest[1]),
          high: Number(latest[2]),
          low: Number(latest[3]),
          close: Number(latest[4]),
          volume: Number(latest[5]),
          amount: Number(latest[6])
        }
      : null,
    points: rows.length
  };

  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error('Fetch failed:', err.message);
  process.exit(2);
});

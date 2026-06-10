import type { Slide } from '@lib/models';

export interface MarketRow {
  symbol: string;
  value: string;
  change: string;
  direction: 'up' | 'down';
}

export function parseMarketsSlide(slide: Slide): {
  tickers: MarketRow[];
  commentaryHtml: string;
} {
  const tickers: MarketRow[] = [];

  for (const line of slide.body.split('\n')) {
    const match = line.match(/^•\s*(.+?):\s*(.+?)\s*\((.+?)\s*[▲▼]?\)\s*$/);
    if (!match) {
      continue;
    }
    const [, symbol, value, changeRaw] = match;
    const change = changeRaw.trim();
    tickers.push({
      symbol: symbol.trim(),
      value: value.trim(),
      change,
      direction: change.startsWith('-') ? 'down' : 'up',
    });
  }

  let commentaryHtml = slide.body_html ?? '';
  if (commentaryHtml.includes('markets-list')) {
    commentaryHtml = commentaryHtml
      .replace(/<ul class="markets-list">[\s\S]*?<\/ul>/i, '')
      .trim();
  }

  return { tickers, commentaryHtml };
}

interface MarketsTableProps {
  tickers: MarketRow[];
  compact?: boolean;
}

export function MarketsTable({ tickers, compact = false }: MarketsTableProps) {
  if (tickers.length === 0) {
    return (
      <p className="text-center text-sm text-slate-400">Market data unavailable.</p>
    );
  }

  const cellClass = compact ? 'px-3 py-2' : 'px-4 py-3.5';
  const textClass = compact ? 'text-xs' : 'text-sm';
  const headerClass = compact ? 'px-3 py-2.5 text-[10px]' : 'px-4 py-3 text-xs';

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80">
      <table className={`h-full w-full table-fixed ${textClass}`}>
        <thead>
          <tr className="border-b border-slate-800 text-left uppercase tracking-wider text-slate-500">
            <th className={`${headerClass} w-[28%] font-semibold`}>Ticker</th>
            <th className={`${headerClass} w-[42%] font-semibold`}>Value</th>
            <th className={`${headerClass} w-[30%] text-right font-semibold`}>Change</th>
          </tr>
        </thead>
        <tbody>
          {tickers.map((row) => (
            <tr key={row.symbol} className="border-b border-slate-800/80 last:border-0">
              <td className={`${cellClass} font-bold text-white`}>{row.symbol}</td>
              <td className={`${cellClass} font-medium text-slate-200`}>{row.value}</td>
              <td className={`${cellClass} text-right`}>
                <span
                  className={`inline-block rounded-md px-2.5 py-1 text-xs font-bold ${
                    row.direction === 'up'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  {row.change}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

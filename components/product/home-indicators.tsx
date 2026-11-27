import Link from "@/lib/site-link";
import indicators from '@/config/home-indicators.json';
import { sourceLink } from '@/lib/source-link';

const number = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 1 });

function formatBarrels(thousandBarrels: number) {
  if (thousandBarrels < 10) return number.format(thousandBarrels * 1_000);
  const man = Math.round(thousandBarrels / 10);
  const eok = Math.floor(man / 10_000);
  const remainder = man % 10_000;
  return [eok ? `${number.format(eok)}억` : '', remainder || !eok ? `${number.format(remainder)}만` : ''].filter(Boolean).join(' ');
}

const signed = (value: number, format = number.format) =>
  `${value > 0 ? '+' : value < 0 ? '−' : ''}${format(Math.abs(value))}`;

type Indicator = (typeof indicators)[number];

const cards: Record<string, {
  title: string;
  source: string;
  format: (row: Indicator) => { value: string; unit: string; period: string; change: string };
}> = {
  'semiconductor-sales': {
    title: '세계 반도체 매출',
    source: 'SIA',
    format: ({ value, period, change }) => ({
      value: number.format(value * 10),
      unit: '억 달러',
      period: `${period.slice(0, 4)}년 ${Number(period.slice(5, 7))}월 · 3개월 평균`,
      change: change === null ? '' : `전월 대비 ${signed(change)}%`,
    }),
  },
  'eu-bev-share': {
    title: 'EU 신차 중 순수 전기차 비중',
    source: 'ACEA',
    format: ({ value, period, change }) => {
      const month = Number(period.slice(5, 7));
      return {
        value: number.format(value),
        unit: '%',
        period: `${period.slice(0, 4)}년 ${month === 1 ? '1월' : `1~${month}월`} 누적`,
        change: change === null ? '' : `전년 같은 기간 대비 ${signed(change)}%p`,
      };
    },
  },
  'us-crude-stocks': {
    title: '미국 상업용 원유 재고',
    source: 'EIA',
    format: ({ value, period, change }) => ({
      value: formatBarrels(value),
      unit: '배럴',
      period: `${period.replaceAll('-', '.')} 종료 주`,
      change: change === null ? '' : `전주 대비 ${signed(change, formatBarrels)} 배럴`,
    }),
  },
};

export function HomeIndicators() {
  return (
    <section className="home-indicators" aria-labelledby="home-indicators-title">
      <h2 id="home-indicators-title">산업 주요 지표</h2>
      <ul className="home-indicator-list">
        {indicators.map((row) => {
          const card = cards[row.id];
          const href = sourceLink(row.sourceUrl);
          if (!card || !href) return null;
          const display = card.format(row);
          return (
            <li key={row.id} className="home-indicator">
              <h3><Link href={`/industries/${row.industrySlug}#industry-briefing-title`}>{card.title}</Link></h3>
              <div className="home-indicator-reading">
                <p className="home-indicator-value">{display.value}<span>{display.unit}</span></p>
                {display.change && <p className="home-indicator-change">{display.change}</p>}
              </div>
              <div className="home-indicator-meta">
                <time dateTime={row.period}>{display.period}</time>
                <a className="home-indicator-source" href={href} target="_blank" rel="noopener noreferrer" aria-label={`${card.title} ${card.source} 원문 (새 탭)`}>
                  {card.source} <span aria-hidden="true">↗</span>
                </a>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

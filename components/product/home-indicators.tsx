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
  sector: string;
  title: string;
  source: string;
  description: string;
  format: (row: Indicator) => { value: string; unit: string; period: string; change: string };
}> = {
  'semiconductor-sales': {
    sector: '반도체',
    title: '세계 반도체 매출',
    source: 'SIA',
    description: '전 세계 반도체 매출의 3개월 이동평균',
    format: ({ value, period, change }) => ({
      value: number.format(value * 10),
      unit: '억 달러',
      period: `${period.slice(0, 4)}년 ${Number(period.slice(5, 7))}월`,
      change: change === null ? '' : `전월 대비 ${signed(change)}%`,
    }),
  },
  'eu-bev-share': {
    sector: '자동차',
    title: 'EU 신규 등록 순수 전기차 비중',
    source: 'ACEA',
    description: 'EU에서 새로 등록된 승용차 중 순수 전기차의 비율',
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
    sector: '에너지',
    title: '미국 상업용 원유 재고',
    source: 'EIA',
    description: '미국 전략비축유를 제외한 주간 재고',
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
      <ul className="home-indicator-grid">
        {indicators.map((row) => {
          const card = cards[row.id];
          const href = sourceLink(row.sourceUrl);
          if (!card || !href) return null;
          const display = card.format(row);
          return (
            <li key={row.id} className="home-indicator">
              <Link className="home-indicator-main" href={`/industries/${row.industrySlug}#industry-briefing-title`}>
                <span className="home-indicator-sector">{card.sector} <span aria-hidden="true">↗</span></span>
                <h3>{card.title}</h3>
                <p className="home-indicator-value">{display.value}<span>{display.unit}</span></p>
                <p className="home-indicator-context">{display.period}{display.change && <> <span aria-hidden="true">·</span> {display.change}</>}</p>
                <p className="home-indicator-description">{card.description}</p>
              </Link>
              <a className="home-indicator-source" href={href} target="_blank" rel="noopener noreferrer">
                {card.source} 원문 ↗
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

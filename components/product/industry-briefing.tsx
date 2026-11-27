import briefings from '@/config/industry-briefings.json';
import { sourceLink } from '@/lib/source-link';

const dateLabel = (date: string) => date.replaceAll('-', '.');

export function IndustryBriefing({ industrySlug }: { industrySlug?: string }) {
  const briefing = briefings
    .filter((edition) => edition.industrySlug === industrySlug)
    .sort((a, b) => b.through.localeCompare(a.through))[0];
  if (!briefing?.items.length) return null;

  return (
    <section className="product-section industry-briefing" aria-labelledby="industry-briefing-title">
      <header>
        <h2 id="industry-briefing-title">주간 핵심 변화</h2>
        <p><time dateTime={briefing.from}>{dateLabel(briefing.from)}</time>–<time dateTime={briefing.through}>{dateLabel(briefing.through)}</time> 공식 발표 기준</p>
      </header>
      <ol>
        {briefing.items.map((item) => {
          const href = sourceLink(item.sourceUrl);
          if (!href) return null;
          return (
            <li key={item.sourceUrl}>
              <article>
                <p className="industry-briefing-meta">
                  <time dateTime={item.date}>{dateLabel(item.date)}</time>
                  <span>{item.company}</span>
                </p>
                <h3>{item.title}</h3>
                <p>{item.summary}</p>
                <p><strong>왜 중요한가</strong> {item.why}</p>
                <a href={href} target="_blank" rel="noopener noreferrer">{item.sourceLabel} ↗</a>
              </article>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

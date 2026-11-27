import Link from "@/lib/site-link";
import briefings from '@/config/industry-briefings.json';
import { eligibleDocument, type ProductDocument } from '@/lib/product-selection';
import { sourceLink } from '@/lib/source-link';

const dateLabel = (date: string) => date.replaceAll('-', '.');
type Reference = { url: string; label: string };
type Change = {
  date: string;
  company: string;
  title: string;
  summary: string;
  sourceUrl: string;
  sourceLabel: string;
  comparisons?: { label: string; value: string; baseline: string }[];
  references?: Reference[];
};
type Edition = { industrySlug: string; from: string; through: string; items: Change[] };

function officialKey(url: string) {
  return url.replace(/%[0-9a-f]{2}/gi, part => part.toUpperCase());
}

export function IndustryBriefing({ industrySlug, documents = [] }: { industrySlug?: string; documents?: ProductDocument[] }) {
  const editions: Edition[] = briefings;
  const briefing = editions
    .filter((edition) => edition.industrySlug === industrySlug)
    .sort((a, b) => b.through.localeCompare(a.through))[0];
  if (!briefing?.items.length) return null;

  const readers = new Map<string, string>();
  for (const document of documents) {
    const url = sourceLink(document.url);
    if (document.parsed_at && url && eligibleDocument(document)) readers.set(officialKey(url), document.id);
  }

  return (
    <section className="product-section industry-briefing" aria-labelledby="industry-briefing-title">
      <header>
        <h2 id="industry-briefing-title">최근 핵심 변화</h2>
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
                {!!item.comparisons?.length && (
                  <dl className="briefing-comparisons">
                    {item.comparisons.map(({ label, value, baseline }) => (
                      <div key={label}>
                        <dt>{label}</dt>
                        <dd><strong>{value}</strong> <span>{baseline}</span></dd>
                      </div>
                    ))}
                  </dl>
                )}
                <div className="briefing-references">
                  {[{ url: href, label: item.sourceLabel }, ...(item.references ?? [])].map(reference => {
                    const url = sourceLink(reference.url);
                    if (!url) return null;
                    const documentId = readers.get(officialKey(url));
                    return (
                      <span key={url}>
                        <a href={url} target="_blank" rel="noopener noreferrer">{reference.label} ↗</a>
                        {documentId && <Link href={`/documents/${documentId}`} aria-label={`${reference.label} 자료 읽기`}>자료 읽기 →</Link>}
                      </span>
                    );
                  })}
                </div>
              </article>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

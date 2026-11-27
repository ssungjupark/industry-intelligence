import Link from "@/lib/site-link";
import briefs from '@/config/korea-company-briefs.json';
import type { ProductDocument } from '@/lib/product-selection';
import { sourceLink } from '@/lib/source-link';

export function CompanyBriefing({ slug, documents }: { slug: string; documents: ProductDocument[] }) {
  const brief = briefs.find((item) => item.companySlug === slug);
  const url = sourceLink(brief?.sourceUrl);
  if (!brief || !url) return null;
  const document = documents.find((row) => sourceLink(row.url) === url && row.parsed_at);

  return (
    <section className="product-section industry-briefing company-briefing" aria-labelledby="company-brief-title">
      <header>
        <h2 id="company-brief-title">한국어 핵심 정리</h2>
        <p><time dateTime={brief.date}>{brief.date.replaceAll('-', '.')}</time> 공식 발표</p>
      </header>
      <article>
        <h3>{brief.title}</h3>
        <p>{brief.summary}</p>
        <p><strong>볼 만한 점</strong> {brief.significance}</p>
        <div className="company-briefing-links">
          {document && <Link href={`/documents/${document.id}`}>자료 읽기 →</Link>}
          <a href={url} target="_blank" rel="noopener noreferrer">공식 원문 ↗</a>
        </div>
      </article>
    </section>
  );
}

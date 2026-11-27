import Link from "@/lib/site-link";
import { companyCountries, matchesCompanyCountry } from '@/lib/company-country';
import { browseDocuments, documentTypeLabel, documentTypeLabels, publicationDay } from '@/lib/document-browse';
import { displayDocumentTitle } from '@/lib/document-relevance';
import { archiveDateRange, archiveFilters, archiveHref, archivePeriods, type SearchParams } from '@/lib/publication-archive';
import { productCatalog, readRows } from '@/lib/product-data';
import type { ProductDocument } from '@/lib/product-selection';
import { sourceLink } from '@/lib/source-link';

const pageSize = 20;

export async function PublicationArchive({ params }: { params: SearchParams }) {
  const { companies, industries, mappings } = await productCatalog();
  const filters = archiveFilters(params, industries.map(industry => industry.slug));
  const selectedIndustry = industries.find(industry => industry.slug === filters.industry);
  const industryMembers = new Set(mappings.filter(mapping => mapping.industry_id === selectedIndustry?.id).map(mapping => mapping.entity_id));
  const members = companies.filter(company => (
    matchesCompanyCountry(company.country, filters.country) && (!selectedIndustry || industryMembers.has(company.id))
  ));
  const companyById = new Map(members.map(company => [company.id, company]));
  const documents = await readRows<ProductDocument>(
    'documents', {}, { column: 'entity_id', ids: [...companyById.keys()] }, undefined,
    'id,entity_id,title,url,source_tier,verification_status,ingest_status,published_at,created_at,metadata,document_type,parsed_at',
  );
  const { from, to } = archiveDateRange(filters);
  const rows = browseDocuments(documents, members, {
    query: filters.q, type: filters.type, from, to, readable: filters.readable,
  });
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const page = Math.min(filters.page, totalPages);
  const offset = (page - 1) * pageSize;
  const visible = rows.slice(offset, offset + pageSize);

  return (
    <section className="publication-archive" aria-labelledby="publication-archive-title">
      <header className="page-heading">
        <div>
          <Link className="breadcrumb" href="/search">검색</Link>
          <h1 id="publication-archive-title">공식 발표 모아보기</h1>
        </div>
      </header>

      <div className="archive-quick-filters">
        <nav className="archive-markets" aria-label="발표 기업 국가">
          {companyCountries.map(option => (
            <Link
              key={option.value}
              href={archiveHref({ ...filters, country: option.value, page: 1 })}
              aria-current={filters.country === option.value ? 'page' : undefined}
            >
              {option.label}
            </Link>
          ))}
        </nav>
        <nav className="archive-periods" aria-label="발표 기간">
          {archivePeriods.map(option => (
            <Link
              key={option.value}
              href={archiveHref({ ...filters, period: option.value, from: '', to: '', page: 1 })}
              aria-current={!filters.from && !filters.to && filters.period === option.value ? 'page' : undefined}
            >
              {option.label}
            </Link>
          ))}
        </nav>
      </div>

      <form className="archive-filters" action="/search" aria-label="공식 발표 검색">
        <input type="hidden" name="archive" value="1"/>
        {filters.country && <input type="hidden" name="country" value={filters.country}/>}
        {filters.period && <input type="hidden" name="period" value={filters.period}/>}
        <div className="archive-fields">
          <label className="archive-query">검색어<input name="q" defaultValue={filters.q} maxLength={180} placeholder="발표 제목·기업명·종목코드"/></label>
          <label>기업 소속 산업<select name="industry" defaultValue={filters.industry}>
            <option value="">모든 산업</option>
            {industries.map(industry => (
              <option key={industry.id} value={industry.slug}>
                {typeof industry.metadata?.label === 'string' ? industry.metadata.label : industry.name}
              </option>
            ))}
          </select></label>
          <label>자료 유형<select name="type" defaultValue={filters.type}>
            <option value="">전체 유형</option>
            {Object.entries(documentTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
        </div>
        <div className="archive-filter-actions">
          <label><input name="readable" type="checkbox" value="1" defaultChecked={filters.readable}/>원문 확보만</label>
          <button type="submit">적용</button>
          <Link href={archiveHref()}>초기화</Link>
        </div>
        <details className="archive-dates" open={!!(filters.from || filters.to)}>
          <summary>발표일 직접 선택</summary>
          <div>
            <label>시작일<input type="date" name="from" defaultValue={filters.from}/></label>
            <label>종료일<input type="date" name="to" defaultValue={filters.to}/></label>
          </div>
        </details>
      </form>

      <div className="archive-result-heading">
        <p role="status"><strong>{rows.length}</strong>건{rows.length > pageSize && <span> · {offset + 1}–{offset + visible.length}번째</span>}</p>
        {(from || to) && <p>{from && to ? `${from} ~ ${to}` : from ? `${from} 이후` : `${to} 이전`} · 한국시간</p>}
      </div>
      {visible.length > 0 ? (
        <ol className="archive-list" start={offset + 1}>
          {visible.map(document => {
            const company = companyById.get(document.entity_id);
            const label = company?.country === 'KR' && typeof company.metadata?.label === 'string' ? company.metadata.label : company?.name;
            const url = sourceLink(document.url)!;
            return (
              <li className="archive-record" key={document.id}>
                {document.published_at
                  ? <time className="archive-date" dateTime={document.published_at}>{publicationDay(document.published_at)}</time>
                  : <span className="archive-date">발표일 미확인</span>}
                <div>
                  <div className="archive-record-meta">
                    {company && <Link href={`/companies/${company.slug}`}>{label}</Link>}
                    <span>{documentTypeLabel(document.document_type)}</span>
                    {document.parsed_at && <span className="archive-readable">본문 확보</span>}
                  </div>
                  <Link className="archive-title" href={`/documents/${document.id}`}>{displayDocumentTitle(document.title)}</Link>
                </div>
                <a className="archive-original" href={url} target="_blank" rel="noopener noreferrer">공식 원문 ↗</a>
              </li>
            );
          })}
        </ol>
      ) : <p className="empty-state">{from && to && from > to ? '종료일을 시작일과 같거나 이후로 선택해 주세요.' : '조건에 맞는 공식 발표가 없습니다.'}</p>}
      {totalPages > 1 && (
        <nav className="pagination" aria-label="공식 발표 페이지">
          {page > 1 && <Link href={archiveHref({ ...filters, page: page - 1 })}>이전</Link>}
          <span>{page} / {totalPages}</span>
          {page < totalPages && <Link href={archiveHref({ ...filters, page: page + 1 })}>다음</Link>}
        </nav>
      )}
    </section>
  );
}

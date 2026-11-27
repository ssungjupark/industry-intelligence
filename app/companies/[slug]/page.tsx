import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { productData } from '@/lib/product-data';
import { ChangeFeed } from '@/components/product/changes';
import { CompanyBriefing } from '@/components/product/company-briefing';
import { CompanyTable } from '@/components/product/company-table';
import { Implications } from '@/components/product/implications';
import { SourceDocuments } from '@/components/product/source-documents';
import { OfficialSources } from '@/components/product/official-sources';
import { PublicationTimeline } from '@/components/product/publication-timeline';
import { updated } from '@/components/product/format';

export const dynamic = 'force-dynamic';

export default async function CompanyPage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { slug } = await params;
  const { tab } = await searchParams;
  const data = await productData(undefined, slug);
  if (!data.configured) return <p className="empty-state">Supabase 연결이 필요합니다. 연결 후 기업 데이터를 조회합니다.</p>;
  const company = data.company;
  if (!company) notFound();

  const path = `/companies/${company.slug}`;
  if (tab === 'implications' && !data.implications.length) redirect(path);
  const localName = typeof company.metadata?.label === 'string' ? company.metadata.label : company.name;
  const title = company.country === 'KR' ? localName : company.name;
  const companyChanges = data.changes.filter((change) => change.entity_id === company.id);

  return (
    <>
      <header className="page-heading">
        <div>
          <Link className="breadcrumb" href="/companies">기업</Link>
          <h1>{title}</h1>
          <span className="muted">{title !== company.name ? `${company.name} · ` : ''}{company.ticker}</span>
          {typeof company.metadata?.role === 'string' && <p className="muted">{company.metadata.role}</p>}
        </div>
        {data.members[0]?.updated && <time>자료 기준 {updated(data.members[0].updated)}</time>}
      </header>
      {data.implications.length > 0 && (
        <nav className="section-tabs">
          <Link href={path} aria-current={tab !== 'implications' ? 'page' : undefined}>개요</Link>
          <Link href={`${path}?tab=implications`} aria-current={tab === 'implications' ? 'page' : undefined}>시사점</Link>
        </nav>
      )}
      {tab === 'implications'
        ? <Implications items={data.implications} changes={data.changes}/>
        : <>
          <PublicationTimeline documents={data.documents} companies={[company]} title="최근 공식 발표" limit={3} showCompany={false} preferredIds={data.preferredPublicationIds}/>
          <CompanyBriefing slug={company.slug} documents={data.documents}/>
          {companyChanges.length > 0 && <ChangeFeed changes={companyChanges}/>}
          {data.members.some((member) => member.metric || member.catalyst) && <CompanyTable companies={data.members}/>}
          <SourceDocuments documents={data.documents} companies={data.companies} briefs={data.briefs}/>
          <OfficialSources entityId={company.id}/>
        </>}
    </>
  );
}

import Link from "@/lib/site-link";
import type {Company} from '@/lib/product-data';
import type {ProductDocument} from '@/lib/product-selection';
import {recentPublications,documentTypeLabel,publicationDay} from '@/lib/document-browse';
import {displayDocumentTitle} from '@/lib/document-relevance';

export function PublicationTimeline({documents,companies,title='주요 공식 발표',archiveHref='#official-documents'}:{documents:ProductDocument[];companies:Company[];title?:string;archiveHref?:string}){
 const rows=recentPublications(documents,companies);
 if(!rows.length)return null;
 const latest=documents.map(d=>d.published_at).filter((value):value is string=>!!value).sort().at(-1);
 return <section className="product-section publication-section"><div className="section-title"><h2>{title}</h2>{latest&&<span className="publication-latest">최신 발표 {publicationDay(latest)}</span>}<Link href={archiveHref}>전체 자료 ↗</Link></div><div className="publication-timeline">{rows.map(d=>{
  const company=companies.find(c=>c.id===d.entity_id);
  return <article className="publication-row" key={d.id}><time dateTime={d.published_at!}>{publicationDay(d.published_at)}</time><Link href={`/documents/${d.id}`} className="publication-headline">{displayDocumentTitle(d.title)}</Link>{company&&<Link className="publication-company" href={`/companies/${company.slug}`}>{company.name}</Link>}<span className="publication-type">{documentTypeLabel(d.document_type)}</span>{d.parsed_at&&<span className="publication-readable">원문 읽기</span>}</article>;
 })}</div></section>;
}

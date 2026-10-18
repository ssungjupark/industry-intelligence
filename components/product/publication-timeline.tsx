import Link from "@/lib/site-link";
import type {Company} from '@/lib/product-data';
import type {ProductDocument} from '@/lib/product-selection';
import {recentPublications,documentTypeLabel} from '@/lib/document-browse';
import {displayDocumentTitle} from '@/lib/document-relevance';

export function PublicationTimeline({documents,companies,title='최근 공식 발표'}:{documents:ProductDocument[];companies:Company[];title?:string}){
 const rows=recentPublications(documents,companies);
 if(!rows.length)return null;
 return <section className="product-section publication-section"><div className="section-title"><h2>{title}</h2><a href="#official-documents">전체 자료 ↓</a></div><div className="publication-timeline">{rows.map(d=>{
  const company=companies.find(c=>c.id===d.entity_id);
  return <article className="publication-row" key={d.id}><time dateTime={d.published_at!}>{d.published_at!.slice(0,10)}</time><Link href={`/documents/${d.id}`} className="publication-headline">{displayDocumentTitle(d.title)}</Link>{company&&<Link className="publication-company" href={`/companies/${company.slug}`}>{company.name}</Link>}<span className="publication-type">{documentTypeLabel(d.document_type)}</span>{d.parsed_at&&<span className="publication-readable">원문 읽기</span>}</article>;
 })}</div></section>;
}

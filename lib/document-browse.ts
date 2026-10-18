import {compareDocuments,eligibleDocument,type ProductDocument} from './product-selection';
import {sourceLink} from './source-link';
import {relevanceStatus} from './document-relevance';

export const documentTypeLabels:Record<string,string>={transcript:'발표 전문',prepared_remarks:'발표문',earnings_release:'실적 발표',filing:'공시',presentation:'발표 자료',product_release:'제품·기술',regulatory:'규제',policy:'정책',clinical:'임상',scientific:'연구',statistics:'통계',patent:'특허',job_posting:'채용',other:'공식 발표'};
export function documentTypeLabel(value?:string){return documentTypeLabels[value||'other']||'공식 자료';}
export type DocumentFilters={query?:string;company?:string;type?:string;from?:string;to?:string;readable?:boolean;relevantOnly?:boolean};
type SearchCompany={id:string;name:string;ticker?:string|null;metadata?:Record<string,unknown>};
const calendar=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'});
export function publicationDay(value:string|null){return value?calendar.format(new Date(value)):null;}
export function browseDocuments(documents:ProductDocument[],companies:SearchCompany[],filters:DocumentFilters={}){
 const terms=(filters.query||'').trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
 return [...new Map(documents.filter(d=>eligibleDocument(d)&&sourceLink(d.url)).map(d=>[d.url,d])).values()].filter(d=>{
  const company=companies.find(c=>c.id===d.entity_id);
  const searchable=`${d.title} ${d.headline||''} ${d.summary||''} ${company?.name||''} ${company?.ticker||''} ${company?.metadata?.label||''} ${documentTypeLabel(d.document_type)}`.toLocaleLowerCase();
  const date=publicationDay(d.published_at);
  return terms.every(term=>searchable.includes(term))&&(!filters.company||d.entity_id===filters.company)&&(!filters.type||(d.document_type||'other')===filters.type)&&(!filters.readable||!!d.parsed_at)&&(!filters.relevantOnly||relevanceStatus(d)==='relevant')&&(!filters.from||!!date&&date>=filters.from)&&(!filters.to||!!date&&date<=filters.to);
 }).sort(compareDocuments);
}
export function recentPublications(documents:ProductDocument[],companies:SearchCompany[],limit=8){
 const classified=documents.some(d=>d.metadata?.industryRelevance);
 // Undated documents remain searchable below; collection time is never a release date.
 return browseDocuments(documents,companies,{relevantOnly:classified}).filter(d=>!!d.published_at).slice(0,limit);
}

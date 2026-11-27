import {compareDocuments,eligibleDocument,type ProductDocument} from './product-selection';
import {sourceLink} from './source-link';
import {relevanceStatus} from './document-relevance';
import {productSearch} from './product-search';

export const documentTypeLabels:Record<string,string>={transcript:'발표 전문',prepared_remarks:'발표문',earnings_release:'실적 발표',filing:'공시',presentation:'발표 자료',product_release:'제품·기술',regulatory:'규제',policy:'정책',clinical:'임상',scientific:'연구',statistics:'통계',patent:'특허',job_posting:'채용',other:'공식 발표'};
export function documentTypeLabel(value?:string){return documentTypeLabels[value||'other']||'공식 자료';}
export type DocumentFilters={query?:string;company?:string;type?:string;from?:string;to?:string;readable?:boolean;relevantOnly?:boolean};
type SearchCompany={id:string;name:string;ticker?:string|null;metadata?:Record<string,unknown>};
const calendar=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'});
export function publicationDay(value:string|null){return value?calendar.format(new Date(value)):null;}
export function browseDocuments(documents:ProductDocument[],companies:SearchCompany[],filters:DocumentFilters={}){
 const matches=productSearch(filters.query||'');
 const companyById=new Map(companies.map(company=>[company.id,company]));
 return [...new Map(documents.filter(d=>eligibleDocument(d)&&sourceLink(d.url)).map(d=>[d.url,d])).values()].filter(d=>{
  const company=companyById.get(d.entity_id);
  const date=publicationDay(d.published_at);
  return matches(d.title,d.headline,d.summary,company?.name,company?.ticker,company?.metadata?.label,documentTypeLabel(d.document_type))&&(!filters.company||d.entity_id===filters.company)&&(!filters.type||(d.document_type||'other')===filters.type)&&(!filters.readable||!!d.parsed_at)&&(!filters.relevantOnly||relevanceStatus(d)==='relevant')&&(!filters.from||!!date&&date>=filters.from)&&(!filters.to||!!date&&date<=filters.to);
 }).sort(compareDocuments);
}
export function recentPublications(documents:ProductDocument[],companies:SearchCompany[],limit=8,preferredIds:string[]=[]){
 const classified=documents.some(d=>d.metadata?.industryRelevance);
 // Undated documents remain searchable below; collection time is never a release date.
 const dated=browseDocuments(documents,companies,{relevantOnly:classified}).filter(d=>!!d.published_at);
 if(!dated.length)return [];
 // Scheduling notices remain in the archive but do not displace actual releases.
 const notice=/(?:sets? (?:a )?conference call|to host (?:a )?(?:technology )?webinar|will report (?:its )?(?:quarterly|financial|fiscal)|announces? (?:the )?date of|invitation to (?:a )?(?:conference|webcast))/i;
 const cutoff=new Date(new Date(dated[0].published_at!).getTime()-45*86400000).toISOString();
 const current=dated.filter(d=>d.published_at!>=cutoff),older=dated.filter(d=>d.published_at!<cutoff);
 const featured=new Set(preferredIds);
 const priorityCutoff=new Date(new Date(dated[0].published_at!).getTime()-14*86400000).toISOString();
 const priority=(doc:ProductDocument)=>Number(featured.has(doc.id)&&doc.published_at!>=priorityCutoff);
 const releases=current.filter(d=>!notice.test(d.title)).sort((a,b)=>priority(b)-priority(a));
 const ordered=[...releases,...current.filter(d=>notice.test(d.title)),...older.filter(d=>!notice.test(d.title)),...older.filter(d=>notice.test(d.title))];
 const selected:ProductDocument[]=[],counts=new Map<string,number>();
 for(const row of ordered){if((counts.get(row.entity_id)||0)>=2)continue;selected.push(row);counts.set(row.entity_id,(counts.get(row.entity_id)||0)+1);if(selected.length>=limit)return selected;}
 for(const row of ordered){if(selected.some(d=>d.id===row.id))continue;selected.push(row);if(selected.length>=limit)break;}
 return selected;
}

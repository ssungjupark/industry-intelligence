import {readRows} from "./product-data";
import {eligibleDocument,type ProductDocument,type ProductMetric,type ProductEvent} from "./product-selection";
import {documentBrief,publicDocument,type Fact,type Quote,type Reference} from "./document-brief";
import {sourceLink} from "./source-link";
import {readReadingContent} from './reading-content';

export async function documentDetail(id:string){
 const [document]=await readRows<ProductDocument&{raw_text:string|null;reading_content?:unknown}>("documents",{id});
 if(!document||!eligibleDocument(document)||!sourceLink(document.url))return null;
 const scope={column:"document_id",ids:[id]};
 const [facts,metrics,events,quotes]=await Promise.all([readRows<Fact>("claims",{},scope),readRows<ProductMetric>("metrics",{},scope),readRows<ProductEvent>("events",{},scope),readRows<Quote>("evidence_segments",{},scope)]);
 const refs:Reference[]=[];
 for(const [kind,items] of [["claim",facts],["metric",metrics],["event",events]] as const){
  const rows=await readRows<Record<string,string>>(`${kind}_evidence`,{},{column:`${kind}_id`,ids:items.map(i=>i.id)});
  refs.push(...rows.map(r=>({owner_id:r[`${kind}_id`],evidence_segment_id:r.evidence_segment_id})));
 }
 const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
 return {document:publicDocument(document),brief:documentBrief(document,facts,metrics,events,quotes,refs,today),quotes:document.ingest_status==="ingested"?quotes.sort((a,b)=>a.segment_order-b.segment_order):[],rawText:document.raw_text,readingContent:readReadingContent(document.reading_content)};
}

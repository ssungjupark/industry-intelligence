import {eligibleDocument,selectCatalyst,type ProductDocument,type ProductMetric,type ProductEvent} from "./product-selection";
import {sourceLink} from "./source-link";
export type Fact={id:string;entity_id:string;document_id:string;statement:string;confidence:number};
export type Quote={id:string;document_id:string;original_text:string;translation_ko:string;source_page:number|null;segment_order:number};
export type Reference={owner_id:string;evidence_segment_id:string};
export type DocumentBrief={documentId:string;headline:string|null;summary:string|null;facts:Fact[];metrics:ProductMetric[];events:ProductEvent[];catalyst:ProductEvent|null;evidenceCount:number};
export function documentBrief(doc:ProductDocument,facts:Fact[],metrics:ProductMetric[],events:ProductEvent[],quotes:Quote[],refs:Reference[],today:string):DocumentBrief {
 const valid=new Map(quotes.filter(q=>q.document_id===doc.id&&q.original_text.trim()).map(q=>[q.id,q]));
 const grounded=(row:{id:string;document_id:string;entity_id:string})=>{
   const links=refs.filter(r=>r.owner_id===row.id);
   return row.document_id===doc.id&&row.entity_id===doc.entity_id&&links.length>0&&links.every(r=>valid.has(r.evidence_segment_id));
 };
 const ready=eligibleDocument(doc)&&!!sourceLink(doc.url)&&doc.ingest_status==="ingested"&&valid.size>0;
 const verifiedFacts=ready?facts.filter(grounded).sort((a,b)=>b.confidence-a.confidence):[];
 const verifiedMetrics=ready?metrics.filter(grounded):[];
 const verifiedEvents=ready?events.filter(grounded):[];
 return {documentId:doc.id,headline:ready?doc.headline||null:null,summary:ready?doc.summary||null:null,facts:verifiedFacts,metrics:verifiedMetrics,events:verifiedEvents,catalyst:selectCatalyst(verifiedEvents,new Map([[doc.id,doc]]),new Set(verifiedEvents.map(e=>e.id)),today),evidenceCount:ready?valid.size:0};
}
// Lists never send raw_text or unknown database fields to client components.
export function publicDocument(doc:ProductDocument):ProductDocument {
 const {id,entity_id,title,url,source_tier,verification_status,ingest_status,published_at,created_at,topics,headline,summary,document_type,pages,next_checks,downloaded_at,parsed_at,analyzed_at}=doc;
 return {id,entity_id,title,url,source_tier,verification_status,ingest_status,published_at,created_at,topics,headline,summary,document_type,pages,next_checks,downloaded_at,parsed_at,analyzed_at,...(doc.metadata?{metadata:{synthetic:doc.metadata.synthetic,fixture:doc.metadata.fixture,model:doc.metadata.model,discoveryRank:doc.metadata.discoveryRank,industryRelevance:doc.metadata.industryRelevance}}:{})};
}

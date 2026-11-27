import {documentBrief,publicDocument,type DocumentBrief,type Fact} from "@/lib/document-brief";
import { cache } from "react";
import {readRows,productRepositoryConfigured} from "./product-repository";
export {readRows} from "./product-repository";
import { compareDocuments,eligibleDocument,isSynthetic,publicSignal,preferences,selectCatalyst,selectMetric,type Meta,type ProductDocument,type ProductMetric,type ProductEvent,type ProductSignal } from "@/lib/product-selection";
import { sourceLink } from "@/lib/source-link";
import {acquisitionCounts} from './catalog-coverage';
import {annotateDocumentRelevance,relevanceStatus} from './document-relevance';
import dailyOfficialSources from '@/config/daily-official-sources.json';

export type Industry={id:string;slug:string;name:string;metadata?:Meta};
export type Company={id:string;slug:string;name:string;ticker:string|null;country:string|null;metadata?:Meta};
type Mapping={entity_id:string;industry_id:string;weight:number};
type Evidence={segment_order:number;id:string;document_id:string;original_text:string;translation_ko:string;source_page:number|null};
type SignalLink={signal_id:string;evidence_segment_id:string};
type MetricLink={metric_id:string;evidence_segment_id:string};
type EventLink={event_id:string;evidence_segment_id:string};
export type Change=ProductSignal & {companies:string[];evidenceCount:number;updated:string};
export type CompanySummary=Company & {recent:Change|null;metric:ProductMetric|null;catalyst:ProductEvent|null;latest:ProductDocument|null;updated:string|null};
export type Implication={id:string;summary:string;questions:string[];next_checks:string[];sourceSignalIds:string[]};
export type ProductData={configured:boolean;industries:Industry[];companies:Company[];members:CompanySummary[];changes:Change[];documents:ProductDocument[];briefs:DocumentBrief[];implications:Implication[];industry?:Industry;company?:Company;updated:string|null;preferredPublicationIds?:string[]};

export function companySlug(company:{slug?:string;name:string;id:string;metadata?:Meta}) {return company.slug || (typeof company.metadata?.slug==="string"?company.metadata.slug:company.name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")) || company.id;}
const unique=(values:string[]) => [...new Set(values)];
const dailySourceIds=new Set(Object.keys(dailyOfficialSources));
export const productCatalog=cache(async () => {
  const [industries,entities,mappings]=await Promise.all([readRows<Industry>("industries"),readRows<Company>("entities",{entity_type:"company"}),readRows<Mapping>("entity_industries")]);
  return {industries:industries.sort((a,b) => a.name.localeCompare(b.name)),companies:entities.filter((e) => !isSynthetic(e)).map((e) => ({...e,slug:companySlug(e)})).sort((a,b) => a.name.localeCompare(b.name)),mappings};
});

export const productDirectory=cache(async()=>{
 const catalog=await productCatalog();
 const docs=await readRows<ProductDocument>('documents',{},undefined,undefined,'id,entity_id,title,url,source_tier,verification_status,ingest_status,parsed_at,metadata');
 const companies=catalog.companies.map(c=>({...c,...acquisitionCounts(docs.filter(d=>d.entity_id===c.id)),industries:catalog.industries.filter(i=>catalog.mappings.some(m=>m.entity_id===c.id&&m.industry_id===i.id))}));
 const industries=catalog.industries.map(i=>{
  const members=companies.filter(c=>c.industries.some(j=>j.id===i.id));
  return {...i,members,...acquisitionCounts(docs.filter(d=>members.some(c=>c.id===d.entity_id)))};
 });
 return {industries,companies,...acquisitionCounts(docs)};
});

export const productData=cache(async (industrySlug?:string,entitySlug?:string):Promise<ProductData> => {
  const catalog=await productCatalog();const industry=catalog.industries.find((i) => i.slug===industrySlug);const company=catalog.companies.find((e) => e.slug===entitySlug);
  const ids=company?[company.id]:industry?unique(catalog.mappings.filter((m) => m.industry_id===industry.id).map((m) => m.entity_id)):catalog.companies.map((e) => e.id);
  const industryIds=industry?[industry.id]:company?unique(catalog.mappings.filter((m) => m.entity_id===company.id).map((m) => m.industry_id)):catalog.industries.map((i) => i.id);
  const entityScope={column:"entity_id",ids};
  const since=new Date(Date.now()-120*86400000).toISOString().slice(0,10);
  const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  const [documents,entitySignals,industrySignals,metrics,events,facts]=await Promise.all([
    readRows<ProductDocument & {source_registry_id?:string|null}>("documents",{},entityScope),
    readRows<ProductSignal>("signals",{signal_level:"entity"},entityScope,{column:"signal_date",value:since}),
    readRows<ProductSignal>("signals",{signal_level:"industry"},{column:"industry_id",ids:industryIds},{column:"signal_date",value:since}),
    readRows<ProductMetric>("metrics",{},entityScope),readRows<ProductEvent>("events",{},entityScope,{column:"event_date",value:today}),readRows<Fact>("claims",{},entityScope),
  ]);
  const signals=[...entitySignals,...industrySignals];
  const [signalLinks,metricLinks,eventLinks,claimLinks]=await Promise.all([
    readRows<SignalLink>("signal_evidence",{},{column:"signal_id",ids:signals.map((s) => s.id)}),
    readRows<MetricLink>("metric_evidence",{},{column:"metric_id",ids:metrics.map((m) => m.id)}),
    readRows<EventLink>("event_evidence",{},{column:"event_id",ids:events.map((e) => e.id)}),
    readRows<{claim_id:string;evidence_segment_id:string}>("claim_evidence",{},{column:"claim_id",ids:facts.map(f=>f.id)}),
  ]);
  const evidence=await readRows<Evidence>("evidence_segments",{},{column:"id",ids:unique([...signalLinks,...metricLinks,...eventLinks,...claimLinks].map((l) => l.evidence_segment_id))});
  const docIds=unique(evidence.map((e) => e.document_id));
  const missing=docIds.filter((id) => !documents.some((d) => d.id===id));
  documents.push(...await readRows<ProductDocument>("documents",{},{column:"id",ids:missing}));
  const docs=new Map(documents.map((d) => [d.id,d]));const quotes=new Map(evidence.map((e) => [e.id,e]));
  const cited=(links:Array<{evidence_segment_id:string}>) => links.map((l) => quotes.get(l.evidence_segment_id)).map((e) => e?docs.get(e.document_id):undefined);
  const changes:Change[]=signals.flatMap((s) => {
    const links=signalLinks.filter((l) => l.signal_id===s.id);const sourceDocs=cited(links);
    if(sourceDocs.some((d) => !d) || !publicSignal(s,sourceDocs as ProductDocument[]) || sourceDocs.some((d) => !sourceLink(d!.url)))return [];
    return [{...s,companies:unique(sourceDocs.map((d) => catalog.companies.find((e) => e.id===d!.entity_id)?.name || "").filter(Boolean)),evidenceCount:unique(links.map(l=>l.evidence_segment_id)).length,updated:s.created_at || s.signal_date}];
  }).sort((a,b) => b.signal_date.localeCompare(a.signal_date) || b.significance-a.significance);
  // Event/metric references must stay within their own entity/document lineage.
  const groundedMetrics=new Set(metrics.filter((m) => {const links=metricLinks.filter((l) => l.metric_id===m.id);return links.length && links.every((l) => quotes.get(l.evidence_segment_id)?.document_id===m.document_id);}).map((m) => m.id));
  const groundedEvents=new Set(events.filter((e) => {const links=eventLinks.filter((l) => l.event_id===e.id);return links.length && links.every((l) => quotes.get(l.evidence_segment_id)?.document_id===e.document_id);}).map((e) => e.id));
  const members=catalog.companies.filter((e) => ids.includes(e.id)).map((e):CompanySummary => {
    const recent=changes.find((s) => s.entity_id===e.id) || null;
    const related=catalog.industries.filter((i) => catalog.mappings.some((m) => m.entity_id===e.id && m.industry_id===i.id));
    const p=preferences(...(industry?[industry]:related).map((i) => i.metadata),e.metadata);
    const metric=selectMetric(metrics.filter((m) => m.entity_id===e.id),docs,groundedMetrics,p,recent?.topic);
    const catalyst=selectCatalyst(events.filter((ev) => ev.entity_id===e.id),docs,groundedEvents,today,p);
    const candidates=documents.filter((d) => d.entity_id===e.id && eligibleDocument(d) && sourceLink(d.url)).map(d=>industry?annotateDocumentRelevance(d,industry.metadata):d);
    const latest=candidates.filter(d=>!industry?.metadata?.documentRelevance||relevanceStatus(d)==='relevant').sort(compareDocuments)[0] || null;
    return {...e,recent,metric,catalyst,latest:latest?publicDocument(latest):null,updated:[recent?.updated,latest?.published_at||latest?.created_at].filter((value):value is string=>!!value).sort().at(-1)||null};
  });
  const runs=await readRows<{id:string;target_entity_id:string;status:string}>("strategy_runs",{status:"active"},company?{column:"target_entity_id",ids:[company.id]}:undefined);
  const [items,implicationLinks]=await Promise.all([
    readRows<Omit<Implication,"sourceSignalIds"> & {run_id:string}>("strategic_implications",{},{column:"run_id",ids:runs.map((r) => r.id)}),
    readRows<{implication_id:string;signal_id:string}>("strategic_implication_signals"),
  ]);
  const implications=items.flatMap((item) => {
    const refs=implicationLinks.filter((l) => l.implication_id===item.id).map((l) => l.signal_id);return refs.length && refs.every(id=>changes.some(c=>c.id===id))?[{...item,sourceSignalIds:refs}]:[];
  });
  const productDocs=documents.filter(d=>ids.includes(d.entity_id)&&eligibleDocument(d)&&sourceLink(d.url)).map(d=>industry?annotateDocumentRelevance(d,industry.metadata):d);
  const preferredPublicationIds=company?productDocs.filter(doc=>doc.source_registry_id&&dailySourceIds.has(doc.source_registry_id)).map(doc=>doc.id):undefined;
  const references=[...claimLinks.map(l=>({owner_id:l.claim_id,evidence_segment_id:l.evidence_segment_id})),...metricLinks.map(l=>({owner_id:l.metric_id,evidence_segment_id:l.evidence_segment_id})),...eventLinks.map(l=>({owner_id:l.event_id,evidence_segment_id:l.evidence_segment_id}))];
  const briefs=productDocs.map(d=>documentBrief(d,facts,metrics,events,evidence,references,today));
  return {configured:productRepositoryConfigured(),industries:catalog.industries,companies:catalog.companies,members,changes,documents:productDocs.map(publicDocument),briefs,implications,industry,company,preferredPublicationIds,updated:[...changes.map((c) => c.updated),...documents.filter(eligibleDocument).map(d=>d.published_at || d.created_at)].sort().at(-1) || null};
});

export async function evidenceDetail(kind:string,id:string) {
  if(!["signal","metric","event","claim"].includes(kind))return null;
  const table=kind==="signal"?"signals":kind==="metric"?"metrics":kind==="claim"?"claims":"events";
  const [record]=await readRows<ProductSignal & {name?:string;statement?:string;document_id?:string}>(table,{id});
  if(!record || isSynthetic(record))return null;
  const links=await readRows<{evidence_segment_id:string}>(`${kind}_evidence`,{[`${kind}_id`]:id});
  const segments=await readRows<Evidence>("evidence_segments",{},{column:"id",ids:links.map((l) => l.evidence_segment_id)});
  const documents=await readRows<ProductDocument>("documents",{},{column:"id",ids:unique(segments.map((e) => e.document_id))});
  const docs=new Map(documents.map((d) => [d.id,d]));
  if(!segments.length || links.some(l=>!segments.some(e=>e.id===l.evidence_segment_id)) || segments.some((e) => !docs.has(e.document_id) || !eligibleDocument(docs.get(e.document_id)!) || !sourceLink(docs.get(e.document_id)!.url)))return null;
  if(kind==="signal" && !publicSignal(record,documents))return null;
  if(kind!=="signal" && segments.some(e=>e.document_id!==record.document_id || docs.get(e.document_id)!.entity_id!==record.entity_id))return null;
  return {title:record.title || record.name || record.statement,summary:record.summary,segments:segments.sort((a,b)=>a.document_id.localeCompare(b.document_id)||a.segment_order-b.segment_order).map((e) => ({...e,document:publicDocument(docs.get(e.document_id)!)}))};
}

export type Meta=Record<string,unknown>;
export type ProductDocument={id:string;entity_id:string;title:string;url:string|null;source_tier:number;verification_status:string;ingest_status:string;published_at:string|null;created_at:string;topics?:string[];metadata?:Meta;headline?:string|null;summary?:string|null;document_type?:string;pages?:number|null;next_checks?:string[];downloaded_at?:string|null;parsed_at?:string|null;analyzed_at?:string|null};
export type ProductMetric={id:string;entity_id:string;document_id:string;name:string;value_text:string;unit:string|null;period:string|null;change_text:string|null;created_at:string};
export type ProductEvent={id:string;entity_id:string;document_id:string;event_type:string;title:string;topic:string;event_date:string|null;magnitude:string;created_at:string;metadata?:Meta};
export type ProductSignal={id:string;signal_level:string;entity_id:string|null;industry_id:string|null;topic:string;title:string;summary:string;significance:number;signal_date:string;created_at:string;core_eligible:boolean;verification_status:string;metadata?:Meta};
export type Preferences={metricPatterns?:string[];eventTypes?:string[];topics?:string[]};
export function isSynthetic(value:{metadata?:Meta;title?:string}) {return value.metadata?.synthetic===true || value.metadata?.fixture===true || value.metadata?.model==="test-fixture" || /^LOCAL TEST FIXTURE\b/i.test(value.title || "");}
export function eligibleDocument(d:ProductDocument) {return !isSynthetic(d) && d.source_tier===1 && d.verification_status==="verified" && !!d.url;}
export function compareDocuments(a:ProductDocument,b:ProductDocument){return (b.published_at||'').localeCompare(a.published_at||'') || Number(a.metadata?.discoveryRank||0)-Number(b.metadata?.discoveryRank||0) || b.created_at.localeCompare(a.created_at);}
export function publicSignal(s:ProductSignal,documents:ProductDocument[]) {return !isSynthetic(s) && s.core_eligible && s.verification_status==="verified" && documents.length>0 && documents.every(d=>eligibleDocument(d)&&d.ingest_status==="ingested");}
export function preferences(...metadata:Array<Meta|undefined>):Preferences {
  const result:Required<Preferences>={metricPatterns:[],eventTypes:[],topics:[]};
  for(const meta of metadata) {const p=meta?.intelligence as Preferences|undefined;for(const key of ["metricPatterns","eventTypes","topics"] as const)if(Array.isArray(p?.[key]))result[key].push(...p[key].filter((v):v is string => typeof v==="string"));}
  return result;
}
function relevance(value:string,terms:string[]=[]) {return terms.reduce((n,term) => n+(value.toLowerCase().includes(term.toLowerCase())?1:0),0);}
export function selectCatalyst(events:ProductEvent[],docs:Map<string,ProductDocument>,linked:Set<string>,today:string,p:Preferences={}) {
  return events.filter((e) => !isSynthetic(e) && e.event_date && e.event_date>=today && linked.has(e.id) && docs.has(e.document_id) && docs.get(e.document_id)!.entity_id===e.entity_id && eligibleDocument(docs.get(e.document_id)!))
    .sort((a,b) => relevance(b.event_type,p.eventTypes)-relevance(a.event_type,p.eventTypes) || relevance(`${b.topic} ${b.title}`,p.topics)-relevance(`${a.topic} ${a.title}`,p.topics) || a.event_date!.localeCompare(b.event_date!) || ({high:3,medium:2,low:1}[b.magnitude as "high"|"medium"|"low"] || 0)-({high:3,medium:2,low:1}[a.magnitude as "high"|"medium"|"low"] || 0))[0] || null;
}
export function metricPeriod(m:ProductMetric,d:ProductDocument) {
  const value=m.period || "";const year=value.match(/(?:19|20)\d{2}/)?.[0];const quarter=value.match(/Q([1-4])|([1-4])Q/i);const month=value.match(/(?:19|20)\d{2}[-/]([01]?\d)/);
  if(year)return `${year}-${String(quarter?Number(quarter[1] || quarter[2])*3:month?Number(month[1]):12).padStart(2,"0")}`;
  return d.published_at || d.created_at;
}
export function selectMetric(metrics:ProductMetric[],docs:Map<string,ProductDocument>,linked:Set<string>,p:Preferences={},topic="") {
  return metrics.filter((m) => linked.has(m.id) && docs.has(m.document_id) && eligibleDocument(docs.get(m.document_id)!) && docs.get(m.document_id)!.entity_id===m.entity_id)
    .sort((a,b) => relevance(b.name,p.metricPatterns)-relevance(a.name,p.metricPatterns) || relevance(b.name,[...p.topics || [],...topic.split(/\s+/).filter(Boolean)])-relevance(a.name,[...p.topics || [],...topic.split(/\s+/).filter(Boolean)]) || metricPeriod(b,docs.get(b.document_id)!).localeCompare(metricPeriod(a,docs.get(a.document_id)!)) || (docs.get(b.document_id)!.published_at || "").localeCompare(docs.get(a.document_id)!.published_at || ""))[0] || null;
}

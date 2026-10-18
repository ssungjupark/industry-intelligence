"use client";
import Link from "@/lib/site-link";
import {useState} from "react";
import type {Company} from "@/lib/product-data";
import {compareDocuments,eligibleDocument,type ProductDocument} from "@/lib/product-selection";
import {sourceLink} from "@/lib/source-link";
import type {DocumentBrief} from "@/lib/document-brief";
import {EvidenceDrawer} from "./evidence-drawer";
import {acquisitionLabel} from '@/lib/catalog-coverage';
import {updated} from "./format";
import {displayDocumentTitle,relevanceStatus} from '@/lib/document-relevance';

export function SourceDocuments({documents,companies,briefs=[]}:{documents:ProductDocument[];companies:Company[];briefs?:DocumentBrief[]}){
 const [query,setQuery]=useState("");const [limit,setLimit]=useState(8);const [scope,setScope]=useState('relevant');
 const sources=documents.filter(d=>eligibleDocument(d)&&sourceLink(d.url)).sort(compareDocuments);
 const classified=sources.some(d=>d.metadata?.industryRelevance);
 const relevant=sources.filter(d=>relevanceStatus(d)==='relevant');
 const scoped=classified&&scope==='relevant'?relevant:sources;
 const filtered=scoped.filter(d=>`${d.title} ${briefs.find(b=>b.documentId===d.id)?.headline||""} ${briefs.find(b=>b.documentId===d.id)?.summary||""} ${companies.find(c=>c.id===d.entity_id)?.name||""}`.toLowerCase().includes(query.toLowerCase()));
 return <section className="product-section source-section"><div className="section-title"><h2>공식 발표·자료 <span className="section-count">{scoped.length}</span></h2>{sources.length>8&&<input className="source-search" aria-label="공식 자료 검색" placeholder="기업 또는 자료 검색" value={query} onChange={e=>{setQuery(e.target.value);setLimit(8);}}/>}</div>{classified&&<div className="document-scope" aria-label="자료 범위"><button aria-pressed={scope==="relevant"} onClick={()=>{setScope("relevant");setLimit(8);}}>산업 관련 {relevant.length}</button><button aria-pressed={scope==="all"} onClick={()=>{setScope("all");setLimit(8);}}>기업 전체 {sources.length}</button></div>}<div className="source-document-feed">{filtered.slice(0,limit).map(d=>{const company=companies.find(c=>c.id===d.entity_id);const brief=briefs.find(b=>b.documentId===d.id);return <article key={d.id}><div className="source-document-meta">{company&&<Link href={`/companies/${company.slug}`}>{company.name}</Link>}<span>{new URL(d.url!).hostname}</span><span className="source-stage">{acquisitionLabel(d)}</span>{d.published_at&&<time>{updated(d.published_at)}</time>}</div><Link className="source-document-title" href={`/documents/${d.id}`}>{displayDocumentTitle(brief?.headline||d.title)}</Link>{brief?.summary&&<p className="source-brief-summary">{brief.summary}</p>}{!!brief?.facts.length&&<ul className="source-facts">{brief.facts.slice(0,2).map(f=><li key={f.id}><EvidenceDrawer kind="claim" id={f.id}>{f.statement}<span className="citation-hint"> ↗</span></EvidenceDrawer></li>)}</ul>}{!!brief?.metrics.length&&<div className="source-key-metrics">{brief.metrics.slice(0,2).map(m=><EvidenceDrawer kind="metric" id={m.id} key={m.id}><strong>{m.value_text} {m.unit}</strong><small>{m.name}{m.period?` · ${m.period}`:""}</small></EvidenceDrawer>)}</div>}<div className="source-actions"><Link href={`/documents/${d.id}`}>자료 보기 →</Link><a href={sourceLink(d.url)!} target="_blank" rel="noreferrer">공식 원문 ↗</a></div></article>;})}</div>{!filtered.length&&<p className="empty-state">{query?"검색 결과가 없습니다.":classified&&scope==="relevant"?"분류된 산업 관련 자료가 없습니다. 기업 전체에서 모든 자료를 확인할 수 있습니다.":"아직 수집된 공식 자료가 없습니다."}</p>}{filtered.length>limit&&<button className="show-more" onClick={()=>setLimit(limit+8)}>자료 더 보기 ({filtered.length-limit})</button>}</section>;
}

"use client";
import Link from "@/lib/site-link";
import {useState} from 'react';
import type {Company} from '@/lib/product-data';
import type {ProductDocument} from '@/lib/product-selection';
import type {DocumentBrief} from '@/lib/document-brief';
import {sourceLink} from '@/lib/source-link';
import {acquisitionLabel} from '@/lib/catalog-coverage';
import {displayDocumentTitle,relevanceStatus} from '@/lib/document-relevance';
import {browseDocuments,documentTypeLabel} from '@/lib/document-browse';
import {EvidenceDrawer} from './evidence-drawer';
import {updated} from './format';

export function SourceDocuments({documents,companies,briefs=[],initialQuery=''}:{documents:ProductDocument[];companies:Company[];briefs?:DocumentBrief[];initialQuery?:string}){
 const [query,setQuery]=useState(initialQuery),[limit,setLimit]=useState(8),[scope,setScope]=useState('relevant');
 const [company,setCompany]=useState(''),[type,setType]=useState(''),[from,setFrom]=useState(''),[to,setTo]=useState(''),[readable,setReadable]=useState(false);
 const sources=browseDocuments(documents,companies);
 const classified=sources.some(d=>d.metadata?.industryRelevance);
 const relevant=sources.filter(d=>relevanceStatus(d)==='relevant');
 const scoped=classified&&scope==='relevant'?relevant:sources;
 const searchable=scoped.map(d=>({...d,headline:briefs.find(b=>b.documentId===d.id)?.headline,summary:briefs.find(b=>b.documentId===d.id)?.summary}));
 const filtered=browseDocuments(searchable,companies,{query,company,type,from,to,readable});
 const types=[...new Set(scoped.map(d=>d.document_type||'other'))];
 const members=companies.filter(c=>scoped.some(d=>d.entity_id===c.id));
 const clear=()=>{setQuery('');setCompany('');setType('');setFrom('');setTo('');setReadable(false);setLimit(8);};
 return <section id="official-documents" className="product-section source-section">
  <div className="section-title"><h2>공식 발표·자료 <span className="section-count">{scoped.length}</span></h2><input className="source-search" aria-label="공식 자료 검색" placeholder="기업 또는 자료 검색" value={query} onChange={e=>{setQuery(e.target.value);setLimit(8);}}/></div>
  {classified&&<div className="document-scope" aria-label="자료 범위"><button aria-pressed={scope==='relevant'} onClick={()=>{setScope('relevant');clear();}}>산업 관련 {relevant.length}</button><button aria-pressed={scope==='all'} onClick={()=>{setScope('all');clear();}}>기업 전체 {sources.length}</button></div>}
  <div className="document-filters" aria-label="자료 필터">
   {members.length>1&&<label>기업<select aria-label="자료 기업" value={company} onChange={e=>{setCompany(e.target.value);setLimit(8);}}><option value="">모든 기업</option>{members.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
   <label>자료 유형<select aria-label="자료 유형" value={type} onChange={e=>{setType(e.target.value);setLimit(8);}}><option value="">전체 유형</option>{types.map(t=><option value={t} key={t}>{documentTypeLabel(t)}</option>)}</select></label>
   <label>발표일 시작<input aria-label="발표일 시작" type="date" value={from} max={to||undefined} onChange={e=>{setFrom(e.target.value);setLimit(8);}}/></label>
   <label>발표일 끝<input aria-label="발표일 끝" type="date" value={to} min={from||undefined} onChange={e=>{setTo(e.target.value);setLimit(8);}}/></label>
   <label className="readable-filter"><input type="checkbox" checked={readable} onChange={e=>{setReadable(e.target.checked);setLimit(8);}}/>원문 확보만</label>
   <button type="button" className="filter-reset" onClick={clear}>초기화</button>
  </div>
  <p className="filter-result" role="status">{filtered.length}건{(from||to)&&' · 발표일이 확인된 자료 기준'}</p>
  <div className="source-document-feed">{filtered.slice(0,limit).map(d=>{
   const company=companies.find(c=>c.id===d.entity_id),brief=briefs.find(b=>b.documentId===d.id);
   return <article key={d.id}><div className="source-document-meta">{company&&<Link href={`/companies/${company.slug}`}>{company.name}</Link>}<span>{documentTypeLabel(d.document_type)}</span><span>{new URL(d.url!).hostname}</span><span className="source-stage">{acquisitionLabel(d)}</span>{d.published_at?<time dateTime={d.published_at}>{updated(d.published_at)}</time>:<span>발표일 미확인</span>}</div>
    <Link className="source-document-title" href={`/documents/${d.id}`}>{displayDocumentTitle(brief?.headline||d.title)}</Link>
    {brief?.summary&&<p className="source-brief-summary">{brief.summary}</p>}
    {!!brief?.facts.length&&<ul className="source-facts">{brief.facts.slice(0,2).map(f=><li key={f.id}><EvidenceDrawer kind="claim" id={f.id}>{f.statement}<span className="citation-hint"> ↗</span></EvidenceDrawer></li>)}</ul>}
    {!!brief?.metrics.length&&<div className="source-key-metrics">{brief.metrics.slice(0,2).map(m=><EvidenceDrawer kind="metric" id={m.id} key={m.id}><strong>{m.value_text} {m.unit}</strong><small>{m.name}{m.period?` · ${m.period}`:''}</small></EvidenceDrawer>)}</div>}
    <div className="source-actions"><Link href={`/documents/${d.id}`}>{d.parsed_at?'원문 읽기 →':'자료 보기 →'}</Link><a href={sourceLink(d.url)!} target="_blank" rel="noreferrer">공식 원문 ↗</a></div>
   </article>;
  })}</div>
  {!filtered.length&&<p className="empty-state">조건에 맞는 공식 자료가 없습니다.</p>}
  {filtered.length>limit&&<button className="show-more" onClick={()=>setLimit(limit+8)}>자료 더 보기 ({filtered.length-limit})</button>}
 </section>;
}

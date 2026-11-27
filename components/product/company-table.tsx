"use client";
import Link from "@/lib/site-link";
import { useState } from "react";
import type { CompanySummary } from "@/lib/product-data";
import { sourceLink } from "@/lib/source-link";
import { EvidenceDrawer } from "./evidence-drawer";
import {acquisitionLabel} from '@/lib/catalog-coverage';
import {displayDocumentTitle} from "@/lib/document-relevance";
import {productSearch} from "@/lib/product-search";
import {companyCountries,matchesCompanyCountry} from "@/lib/company-country";
import { updated } from "./format";
export function CompanyTable({companies}:{companies:CompanySummary[]}) {
 const [q,setQ]=useState("");const [all,setAll]=useState(true);const [page,setPage]=useState(0);const [country,setCountry]=useState("");
 const matches=productSearch(q);
 const available=companies.filter(c=>all||c.recent||c.metric||c.catalyst||c.latest);const filtered=available.filter(c=>matchesCompanyCountry(c.country,country)&&matches(c.name,c.ticker,c.metadata?.label,c.metadata?.role));const rows=filtered.slice(page*20,page*20+20);
 const showMetric=filtered.length>0&&filtered.filter(c=>c.metric).length*2>=filtered.length;
 const showCatalyst=filtered.length>0&&filtered.filter(c=>c.catalyst).length*2>=filtered.length;
 return <section className="product-section"><div className="section-title"><h2>주요 기업 <span className="section-count">{filtered.length}</span></h2><div className="table-controls"><input aria-label="산업 내 기업 검색" placeholder="기업명 / 종목코드" value={q} onChange={e=>{setQ(e.target.value);setPage(0);}}/>{companies.length>1&&<select aria-label="기업 국가" value={country} onChange={e=>{setCountry(e.target.value);setPage(0);}}>{companyCountries.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select>}<label><input type="checkbox" checked={all} onChange={e=>{setAll(e.target.checked);setPage(0);}}/>모든 기업</label></div></div><div className="product-table-scroll"><table className="product-table"><thead><tr><th>기업</th><th>최근 확인된 내용</th>{showMetric&&<th>핵심 지표</th>}{showCatalyst&&<th>다음 일정</th>}<th>최근 자료</th></tr></thead><tbody>{rows.map(c=>{
  const showLatest=!!c.latest&&(!c.recent||!!c.latest.published_at&&c.latest.published_at.slice(0,10)>c.recent.signal_date.slice(0,10));
  return <tr key={c.id}><td data-label="기업"><Link className="company-name" href={`/companies/${encodeURIComponent(c.slug)}`}>{c.name}</Link><small>{c.ticker}</small>{typeof c.metadata?.role==="string"&&<small>{c.metadata.role}</small>}</td><td data-label="최근 확인된 내용">{showLatest&&c.latest&&sourceLink(c.latest.url)?<><Link href={`/documents/${c.latest.id}`}>{displayDocumentTitle(c.latest.title)} →</Link><small>{acquisitionLabel(c.latest)}</small></>:c.recent?<EvidenceDrawer id={c.recent.id}>{c.recent.title}</EvidenceDrawer>:<Link className="muted" href={`/companies/${encodeURIComponent(c.slug)}`}>기업 자료 보기 ↗</Link>}{!showMetric&&c.metric&&<small><EvidenceDrawer kind="metric" id={c.metric.id}>{c.metric.name}: {c.metric.value_text} {c.metric.unit}</EvidenceDrawer></small>}{!showCatalyst&&c.catalyst&&<small><EvidenceDrawer kind="event" id={c.catalyst.id}>다음 일정: {c.catalyst.title} · {c.catalyst.event_date?.slice(0,10)}</EvidenceDrawer></small>}</td>{showMetric&&<td data-label="핵심 지표">{c.metric?<EvidenceDrawer kind="metric" id={c.metric.id}><b>{c.metric.value_text} {c.metric.unit}</b><small>{c.metric.name}{c.metric.period?` · ${c.metric.period}`:""}</small></EvidenceDrawer>:"—"}</td>}{showCatalyst&&<td data-label="다음 일정">{c.catalyst?<EvidenceDrawer kind="event" id={c.catalyst.id}><b>{c.catalyst.title}</b><small>{c.catalyst.event_date?.slice(0,10)}</small></EvidenceDrawer>:"—"}</td>}<td data-label="최근 자료" className="muted">{updated(c.updated)||"—"}</td></tr>;
 })}</tbody></table></div>{!rows.length&&<p className="empty-state">{q?"검색 결과가 없습니다.":"새 자료를 기다리고 있습니다."}</p>}{filtered.length>20&&<div className="pagination"><button disabled={!page} onClick={()=>setPage(page-1)}>이전</button><span>{page+1} / {Math.ceil(filtered.length/20)}</span><button disabled={(page+1)*20>=filtered.length} onClick={()=>setPage(page+1)}>다음</button></div>}</section>;
}

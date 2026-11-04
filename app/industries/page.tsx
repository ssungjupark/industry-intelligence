import Link from "@/lib/site-link";
import {productDirectory} from '@/lib/product-data';
export const dynamic='force-dynamic';
export default async function Industries({searchParams}:{searchParams:Promise<{q?:string;group?:string}>}) {
 const {q='',group=''}=await searchParams;const data=await productDirectory();
 const groups=[...new Set(data.industries.map(i=>String(i.metadata?.group||'Other')))];
 const rows=data.industries.filter(i=>(!group||i.metadata?.group===group)&&`${i.name} ${i.metadata?.label||''} ${i.members.map(c=>c.name+' '+(c.metadata?.label||'')).join(' ')}`.toLowerCase().includes(q.toLowerCase()));
 return <><header className="page-heading"><div><h1>산업</h1><p className="directory-summary">{data.industries.length}개 산업 · {data.companies.length}개 기업 · 공식자료 {data.documents}건</p></div></header>
 <form className="search-form directory-filters"><input name="q" defaultValue={q} placeholder="산업 또는 기업 검색" aria-label="산업 또는 기업 검색"/><select name="group" defaultValue={group} aria-label="산업군"><option value="">모든 산업군</option>{groups.map(g=><option key={g}>{g}</option>)}</select><button>검색</button></form>
 <div className="industry-directory">{rows.map(i=><Link key={i.id} href={`/industries/${i.slug}`}><span className="directory-category">{String(i.metadata?.group||'')}</span><strong>{typeof i.metadata?.label==='string'?i.metadata.label:i.name}</strong><span>{i.name}</span><p className="directory-members">{i.members.slice(0,4).map(c=>c.name).join(' · ')}{i.members.length>4?` 외 ${i.members.length-4}개`:''}</p><span className="directory-coverage">기업 {i.members.length} · 공식자료 {i.documents} · 본문 확보 {i.parsed}</span></Link>)}</div>
 {!rows.length&&<p className="empty-state">검색 결과가 없습니다.</p>}</>;
}

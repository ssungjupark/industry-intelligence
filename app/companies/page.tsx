import Link from "@/lib/site-link";
import {productDirectory} from '@/lib/product-data';
export const dynamic='force-dynamic';
export default async function Companies({searchParams}:{searchParams:Promise<{q?:string;industry?:string;page?:string}>}){
 const {q='',industry='',page='1'}=await searchParams;const data=await productDirectory();
 const rows=data.companies.filter(c=>(!industry||c.industries.some(i=>i.slug===industry))&&`${c.name} ${c.ticker||''} ${c.metadata?.label||''}`.toLowerCase().includes(q.toLowerCase()));
 const pages=Math.max(1,Math.ceil(rows.length/24));const n=Math.min(pages,Math.max(1,Math.floor(Number(page)||1)));
 const href=(p:number)=>`/companies?${new URLSearchParams({q,industry,page:String(p)})}`;
 return <><header className="page-heading"><div><h1>기업</h1><p className="directory-summary">{rows.length}개 기업</p></div></header><form className="search-form directory-filters"><input name="q" defaultValue={q} placeholder="기업명 / 종목코드" aria-label="기업 검색"/><select name="industry" defaultValue={industry} aria-label="산업 선택"><option value="">모든 산업</option>{data.industries.map(i=><option key={i.id} value={i.slug}>{typeof i.metadata?.label==='string'?i.metadata.label:i.name}</option>)}</select><button>검색</button></form>
 <div className="company-directory">{rows.slice((n-1)*24,n*24).map(c=><Link key={c.id} href={`/companies/${c.slug}`}><strong>{c.name}</strong><span>{c.ticker} · {c.country}</span><span>{c.industries.map(i=>typeof i.metadata?.label==='string'?i.metadata.label:i.name).join(' / ')}</span><span className="directory-coverage">{c.documents?`공식자료 ${c.documents} · 본문 확보 ${c.parsed}`:'공식 자료실 등록 · 수집 대기'}</span></Link>)}</div>{!rows.length&&<p className="empty-state">검색 결과가 없습니다.</p>}{pages>1&&<nav className="pagination">{n>1&&<Link href={href(n-1)}>이전</Link>}<span>{n} / {pages}</span>{n<pages&&<Link href={href(n+1)}>다음</Link>}</nav>}</>;
}

import Link from "@/lib/site-link";
import {productData} from '@/lib/product-data';
import {ChangeFeed} from '@/components/product/changes';
import {SourceDocuments} from '@/components/product/source-documents';
export const dynamic='force-dynamic';
export default async function Search({searchParams}:{searchParams:Promise<{q?:string;archive?:string}>}){
 const {q='',archive=''}=await searchParams,data=await productData(),term=q.trim().toLowerCase();
 const industries=data.industries.filter(i=>`${i.name} ${i.metadata?.label||''}`.toLowerCase().includes(term));
 const companies=data.companies.filter(c=>`${c.name} ${c.ticker||''} ${c.metadata?.label||''}`.toLowerCase().includes(term));
 const changes=data.changes.filter(c=>`${c.title} ${c.topic} ${c.companies.join(' ')}`.toLowerCase().includes(term));
 return <><header className="page-heading"><h1>검색</h1></header><form className="search-form" action="/search"><input name="q" defaultValue={q} placeholder="산업·기업·공식자료 제목 검색" aria-label="산업·기업·공식자료 검색"/><button>검색</button></form>
  {!term&&archive!=='1'&&<p className="search-intro">산업명, 기업명, 공식자료 제목으로 찾아보세요.</p>}
  {term&&<>
   {!!industries.length&&<section className="product-section"><h2>산업 <span className="section-count">{industries.length}</span></h2><div className="search-results">{industries.map(i=><Link key={i.id} href={`/industries/${i.slug}`}>{typeof i.metadata?.label==='string'?i.metadata.label:i.name}<small>{i.name}</small></Link>)}</div></section>}
   {!!companies.length&&<section className="product-section"><h2>기업 <span className="section-count">{companies.length}</span></h2><div className="search-results">{companies.map(c=><Link key={c.id} href={`/companies/${c.slug}`}>{c.name}<small>{c.ticker}</small></Link>)}</div></section>}
   {!!changes.length&&<ChangeFeed title="근거가 확인된 변화" changes={changes} limit={20}/>}
  </>}
  {(term||archive==='1')&&<SourceDocuments key={q} context="search" documents={data.documents} companies={data.companies} briefs={data.briefs} initialQuery={q}/>}
 </>;
}

import Link from "@/lib/site-link";
import {productData} from '@/lib/product-data';
import {ChangeFeed} from '@/components/product/changes';
import {SourceDocuments} from '@/components/product/source-documents';
export const dynamic='force-dynamic';
export default async function Search({searchParams}:{searchParams:Promise<{q?:string}>}){
 const {q=''}=await searchParams,data=await productData(),term=q.trim().toLowerCase();
 const industries=data.industries.filter(i=>`${i.name} ${i.metadata?.label||''}`.toLowerCase().includes(term));
 const companies=data.companies.filter(c=>`${c.name} ${c.ticker||''} ${c.metadata?.label||''}`.toLowerCase().includes(term));
 const changes=data.changes.filter(c=>`${c.title} ${c.topic} ${c.companies.join(' ')}`.toLowerCase().includes(term));
 return <><header className="page-heading"><h1>Search</h1></header><form className="search-form" action="/search"><input name="q" defaultValue={q} placeholder="기업, 산업, 공식자료 검색" aria-label="Search"/><button>Search</button></form>
  {term&&<>
   {!!(industries.length+companies.length)&&<section className="product-section"><h2>Industries &amp; companies</h2><div className="search-results">{industries.map(i=><Link key={i.id} href={`/industries/${i.slug}`}>{i.name}<small>Industry</small></Link>)}{companies.map(c=><Link key={c.id} href={`/companies/${c.slug}`}>{c.name}<small>{c.ticker}</small></Link>)}</div></section>}
   {!!changes.length&&<ChangeFeed title="Changes" changes={changes} limit={50}/>}
   <SourceDocuments key={q} documents={data.documents} companies={data.companies} briefs={data.briefs} initialQuery={q}/>
  </>}
 </>;
}

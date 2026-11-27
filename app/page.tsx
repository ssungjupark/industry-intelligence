import Link from "@/lib/site-link";
import {CatalystAgenda} from '@/components/product/catalyst-agenda';
import {PublicationTimeline} from '@/components/product/publication-timeline';
import {HomeIndicators} from '@/components/product/home-indicators';
import {productData,productDirectory} from '@/lib/product-data';
import {updated} from '@/components/product/format';

export const dynamic='force-dynamic';

export default async function Home(){
 const [data,directory]=await Promise.all([productData(),productDirectory()]);
 const featured=[...directory.industries].sort((a,b)=>b.members.length-a.members.length||b.parsed-a.parsed||a.name.localeCompare(b.name)).slice(0,6);
 return <>
  <header className="page-heading"><div><h1>산업 인텔리전스</h1><p className="page-subtitle">산업별 변화와 주요 기업의 공식 발표</p></div>{data.updated&&<time>자료 기준 {updated(data.updated)}</time>}</header>
  <HomeIndicators/>
  <PublicationTimeline documents={data.documents} companies={data.companies} archiveHref="/search?archive=1"/>
  <section className="product-section home-industry-section"><div className="section-title"><h2>산업 둘러보기</h2><Link href="/industries">전체 산업 보기 ↗</Link></div><div className="industry-directory">{featured.map(i=><Link key={i.id} href={`/industries/${i.slug}`}><strong>{typeof i.metadata?.label==='string'?i.metadata.label:i.name}</strong><span>{i.name} · 주요 기업 {i.members.length}개</span></Link>)}</div>{!featured.length&&<p className="empty-state">아직 등록된 산업이 없습니다.</p>}</section>
  <CatalystAgenda companies={data.members}/>
  <nav className="home-search-link" aria-label="자료와 분석 기록">
   <Link href="/search">기업·산업·공식자료 검색 →</Link>
   {data.changes.length>0&&<Link href="/changes">지난 분석 보기 →</Link>}
  </nav>
 </>;
}

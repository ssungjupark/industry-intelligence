import {CatalystAgenda} from "@/components/product/catalyst-agenda";
import Link from "@/lib/site-link";
import {PublicationTimeline} from "@/components/product/publication-timeline";
import { productData } from "@/lib/product-data";
import { SourceDocuments } from "@/components/product/source-documents";
import { ChangeFeed } from "@/components/product/changes";
import { updated } from "@/components/product/format";
export const dynamic="force-dynamic";
export default async function Home(){const data=await productData();return <><header className="page-heading"><h1>Home</h1>{data.updated&&<time>Updated {updated(data.updated)}</time>}</header>{data.changes.some(c=>c.signal_level==="industry")&&<ChangeFeed changes={data.changes.filter(c=>c.signal_level==="industry")}/>}<CatalystAgenda companies={data.members}/><PublicationTimeline documents={data.documents} companies={data.companies}/><SourceDocuments documents={data.documents} companies={data.companies} briefs={data.briefs}/><section className="product-section"><div className="section-title"><h2>Industries</h2><Link href="/industries">View all ↗</Link></div><div className="industry-directory">{data.industries.map(i=><Link key={i.id} href={`/industries/${i.slug}`}><strong>{i.name}</strong><span>{data.changes.find(c=>c.industry_id===i.id)?.title || "Open industry"}</span></Link>)}</div>{!data.industries.length&&<p className="empty-state">아직 등록된 산업이 없습니다.</p>}</section></>;}

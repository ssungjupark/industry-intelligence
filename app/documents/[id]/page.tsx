import Link from "@/lib/site-link";
import {notFound} from "next/navigation";
import {documentDetail} from "@/lib/document-detail";
import {productCatalog} from "@/lib/product-data";
import {isUuid} from "@/lib/api-validation";
import {sourceLink} from "@/lib/source-link";
import {DocumentReading} from "@/components/product/document-reading";
import {updated} from "@/components/product/format";
export const dynamic="force-dynamic";
export default async function DocumentPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(!isUuid(id))notFound();
 const data=await documentDetail(id);if(!data)notFound();
 const catalog=await productCatalog();const company=catalog.companies.find(c=>c.id===data.document.entity_id);
 return <><header className="page-heading document-heading"><div>{company&&<Link className="breadcrumb" href={`/companies/${company.slug}`}>{company.name}</Link>}<h1>{data.brief.headline||data.document.title}</h1>{data.brief.headline&&<p className="original-title">{data.document.title}</p>}<div className="document-byline">{data.document.published_at&&<time>발표 {updated(data.document.published_at)}</time>}<a href={sourceLink(data.document.url)!} target="_blank" rel="noreferrer">공식 원문 ↗</a></div></div></header><DocumentReading {...data}/></>;
}

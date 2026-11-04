import Link from "@/lib/site-link";
import { notFound,redirect } from "next/navigation";
import { productData } from "@/lib/product-data";
import { ChangeFeed } from "@/components/product/changes";
import { CompanyTable } from "@/components/product/company-table";
import { Implications } from "@/components/product/implications";
import { SourceDocuments } from "@/components/product/source-documents";
import { updated } from "@/components/product/format";
import {OfficialSources} from '@/components/product/official-sources';
export const dynamic="force-dynamic";
export default async function CompanyPage({params,searchParams}:{params:Promise<{slug:string}>;searchParams:Promise<{tab?:string}>}){const {slug}=await params;const {tab}=await searchParams;const data=await productData(undefined,slug);if(!data.configured)return <p className="empty-state">Supabase 연결이 필요합니다. 연결 후 기업 데이터를 조회합니다.</p>;if(!data.company)notFound();const path=`/companies/${data.company.slug}`;if(tab==='implications'&&!data.implications.length)redirect(path);return <><header className="page-heading"><div><Link className="breadcrumb" href="/companies">기업</Link><h1>{data.company.name}</h1><span className="muted">{data.company.ticker}</span>{typeof data.company.metadata?.role==="string"&&<p className="muted">{data.company.metadata.role}</p>}</div>{data.members[0]?.updated&&<time>자료 기준 {updated(data.members[0].updated)}</time>}</header><OfficialSources entityId={data.company.id}/>{data.implications.length>0&&<nav className="section-tabs"><Link href={path} aria-current={tab!=="implications"?"page":undefined}>개요</Link><Link href={`${path}?tab=implications`} aria-current={tab==="implications"?"page":undefined}>시사점</Link></nav>}{tab==="implications"?<Implications items={data.implications} changes={data.changes}/>:<>{data.changes.some(c=>c.entity_id===data.company!.id)&&<ChangeFeed changes={data.changes.filter(c=>c.entity_id===data.company!.id)}/>}{data.members.some(c=>c.metric||c.catalyst)&&<CompanyTable companies={data.members}/>}<SourceDocuments documents={data.documents} companies={data.companies} briefs={data.briefs}/></>}</>;}

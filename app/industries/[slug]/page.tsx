import {IndustryOverview} from "@/components/product/industry-overview";
import Link from "@/lib/site-link";
import { notFound } from "next/navigation";
import { productData } from "@/lib/product-data";
import { Implications } from "@/components/product/implications";
import { updated } from "@/components/product/format";
export const dynamic="force-dynamic";
export default async function IndustryPage({params,searchParams}:{params:Promise<{slug:string}>;searchParams:Promise<{tab?:string}>}){const {slug}=await params;const {tab}=await searchParams;const data=await productData(slug);if(!data.configured)return <p className="empty-state">Supabase 연결이 필요합니다. 연결 후 산업 데이터를 조회합니다.</p>;if(!data.industry)notFound();const path=`/industries/${data.industry.slug}`;return <><header className="page-heading"><div><Link className="breadcrumb" href="/industries">Industries</Link><h1>{data.industry.name}</h1></div>{data.updated&&<time>Updated {updated(data.updated)}</time>}</header><nav className="section-tabs"><Link aria-current={tab!=="implications"?"page":undefined} href={path}>Overview</Link><Link aria-current={tab==="implications"?"page":undefined} href={`${path}?tab=implications`}>Implications</Link></nav>{tab==="implications"?<Implications items={data.implications} changes={data.changes}/>:<IndustryOverview data={data}/>}</>;}

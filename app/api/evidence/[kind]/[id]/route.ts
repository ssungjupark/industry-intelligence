import { NextResponse } from "next/server";
import { evidenceDetail } from "@/lib/product-data";
import { isUuid } from "@/lib/api-validation";
export const runtime="nodejs";
export async function GET(_request:Request,{params}:{params:Promise<{kind:string;id:string}>}){const {kind,id}=await params;if(!isUuid(id)||!["signal","metric","event","claim"].includes(kind))return NextResponse.json({error:"Invalid source request"},{status:400});try{const data=await evidenceDetail(kind,id);return NextResponse.json(data||{error:"자료를 찾을 수 없습니다."},{status:data?200:404,headers:data?{"Cache-Control":"public, max-age=0, s-maxage=3600, stale-while-revalidate=86400"}:undefined});}catch{return NextResponse.json({error:"자료를 불러오지 못했습니다."},{status:500});}}

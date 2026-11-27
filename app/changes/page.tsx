import { productData } from "@/lib/product-data";
import { ChangeFeed } from "@/components/product/changes";
export const dynamic="force-dynamic";
export default async function Changes(){
 const data=await productData();
 return <><header className="page-heading"><h1>분석 기록</h1></header><ChangeFeed changes={data.changes} limit={50}/></>;
}

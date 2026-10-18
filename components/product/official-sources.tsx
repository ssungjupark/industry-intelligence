import {readRows} from '@/lib/product-data';
import {sourceLink} from '@/lib/source-link';
export async function OfficialSources({entityId}:{entityId:string}) {
 const sources=await readRows<{id:string;issuer:string;discovery_urls:string[]}>('source_registry',{entity_id:entityId,enabled:'true'});
 const links=[...new Map(sources.flatMap(s=>s.discovery_urls.filter(url=>sourceLink(url)).map(url=>[url,{url,issuer:s.issuer}] as const))).values()];
 if(!links.length)return null;
 return <section className="official-sources"><span>공식 자료실</span>{links.map(l=><a key={l.url} href={l.url} target="_blank" rel="noreferrer">{l.issuer} ↗</a>)}</section>;
}

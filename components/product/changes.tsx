import { isSynthetic } from "@/lib/product-selection";
import type { Change } from "@/lib/product-data";
import { EvidenceDrawer } from "./evidence-drawer";
import { updated } from "./format";
export function ChangeFeed({changes,title="근거가 확인된 변화",limit=10}:{changes:Change[];title?:string;limit?:number}) {
 changes=changes.filter(c=>!isSynthetic(c)&&c.core_eligible&&c.verification_status==="verified");
 const latest=changes.map(c=>c.signal_date).sort().at(-1);
 return <section className="product-section"><div className="section-title"><h2>{title}</h2>{latest&&<span className="change-last-date">마지막 변화 {latest.slice(0,10)}</span>}</div>{!changes.length?<p className="empty-state">아직 분석 완료된 변화가 없습니다. 수집된 원문은 아래 공식 자료에서 확인할 수 있습니다.</p>:<div className="change-feed">{changes.slice(0,limit).map(change=><EvidenceDrawer key={change.id} id={change.id} className="change-row"><time dateTime={change.signal_date}>{change.signal_date.slice(0,10)}</time><span className="change-headline"><strong>{change.title}</strong><small>{change.companies.join(" · ")}</small></span><span className="source-count">근거 {change.evidenceCount}개</span><time className="change-updated">{updated(change.updated)}</time></EvidenceDrawer>)}</div>}</section>;
}

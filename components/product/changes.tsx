import { isSynthetic } from "@/lib/product-selection";
import type { Change } from "@/lib/product-data";
import { EvidenceDrawer } from "./evidence-drawer";
import { updated,shortDate } from "./format";
export function ChangeFeed({changes,title="Recent changes",limit=10}:{changes:Change[];title?:string;limit?:number}) {
 changes=changes.filter(c=>!isSynthetic(c)&&c.core_eligible&&c.verification_status==="verified");
 return <section className="product-section"><div className="section-title"><h2>{title}</h2></div>{!changes.length?<p className="empty-state">아직 분석 완료된 변화가 없습니다. 수집된 원문은 아래 공식 자료에서 확인할 수 있습니다.</p>:<div className="change-feed">{changes.slice(0,limit).map(change=><EvidenceDrawer key={change.id} id={change.id} className="change-row"><time>{shortDate(change.signal_date)}</time><span className="change-headline"><strong>{change.title}</strong><small>{change.companies.join(" · ")}</small></span><span className="source-count">{change.evidenceCount} evidence</span><time className="change-updated">{updated(change.updated)}</time></EvidenceDrawer>)}</div>}</section>;
}

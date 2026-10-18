import type {CompanySummary} from "@/lib/product-data";
import {EvidenceDrawer} from "./evidence-drawer";
export function CatalystAgenda({companies}:{companies:CompanySummary[]}){
 const rows=companies.filter(c=>c.catalyst).sort((a,b)=>a.catalyst!.event_date!.localeCompare(b.catalyst!.event_date!)).slice(0,8);
 if(!rows.length)return null;
 return <section className="product-section"><h2>다가오는 주요 일정</h2><div className="catalyst-agenda">{rows.map(c=><EvidenceDrawer key={c.id} kind="event" id={c.catalyst!.id} className="agenda-row"><time>{c.catalyst!.event_date?.slice(0,10)}</time><span><strong>{c.catalyst!.title}</strong><small>{c.name}</small></span></EvidenceDrawer>)}</div></section>;
}

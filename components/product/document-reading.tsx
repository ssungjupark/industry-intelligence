import {OriginalReader} from "./original-reader";
import {readReadingContent,readingFromPlainText,type ReadingContent} from "@/lib/reading-content";
import {EvidenceDrawer} from "./evidence-drawer";
import type {DocumentBrief,Quote} from "@/lib/document-brief";
import type {ProductDocument} from "@/lib/product-selection";
import {sourceLink} from "@/lib/source-link";
import {documentPreview} from "@/lib/document-preview";

export function DocumentReading({document,brief,quotes,rawText,readingContent}:{document:ProductDocument;brief:DocumentBrief;quotes:Quote[];rawText:string|null;readingContent?:ReadingContent|null}){
 const hasPeriod=brief.metrics.some(m=>m.period);const hasComparison=brief.metrics.some(m=>m.change_text);
 const reading=readReadingContent(readingContent);
 const original=rawText?<OriginalReader content={reading?.format==='pdf'||!reading?readingFromPlainText(rawText):reading} source={document.url}/>:null;
 const preview=!brief.summary?documentPreview(rawText,reading||(rawText?readingFromPlainText(rawText):null)):[];
 return <div className="document-reading">
  {brief.summary&&<section className="document-brief-summary"><small>한국어 요약 · AI 작성</small><p className="document-summary">{brief.summary}</p></section>}
  {!brief.summary&&preview.length>0&&<section className="document-preview"><div className="document-preview-heading"><div><small>공식 문서에서 발췌</small><h2>먼저 읽을 내용</h2></div><span>영문 원문 · 분석 전</span></div><ol>{preview.map((point,index)=><li key={`${point.page}-${index}`}><p lang="en">{point.text}</p>{point.page&&sourceLink(document.url,point.page)&&<a href={sourceLink(document.url,point.page)!} target="_blank" rel="noreferrer">원문 {point.page}쪽 ↗</a>}</li>)}</ol></section>}
  {brief.facts.length>0&&<section className="product-section"><h2>핵심 내용</h2><ul className="fact-list">{brief.facts.slice(0,6).map(f=><li key={f.id}><EvidenceDrawer kind="claim" id={f.id}>{f.statement}<span className="citation-hint"> 근거 ↗</span></EvidenceDrawer></li>)}</ul></section>}
  {brief.metrics.length>0&&<section className="product-section"><h2>주요 수치</h2><div className="product-table-scroll"><table className="product-table brief-metrics"><thead><tr><th>지표</th><th>수치</th>{hasPeriod&&<th>기간</th>}{hasComparison&&<th>비교 기준</th>}</tr></thead><tbody>{brief.metrics.slice(0,12).map(m=><tr key={m.id}><td><EvidenceDrawer kind="metric" id={m.id}>{m.name}<span className="citation-hint"> ↗</span></EvidenceDrawer></td><td><b>{m.value_text} {m.unit}</b></td>{hasPeriod&&<td>{m.period||"—"}</td>}{hasComparison&&<td>{m.change_text||"—"}</td>}</tr>)}</tbody></table></div></section>}
  {brief.catalyst&&<section className="product-section"><h2>다음 일정</h2><EvidenceDrawer kind="event" id={brief.catalyst.id}><time>{brief.catalyst.event_date?.slice(0,10)}</time> · {brief.catalyst.title}<span className="citation-hint"> 근거 ↗</span></EvidenceDrawer></section>}
  {brief.events.length>0&&<section className="product-section"><h2>발표된 주요 변화</h2><ul className="fact-list">{brief.events.slice(0,8).map(e=><li key={e.id}><EvidenceDrawer kind="event" id={e.id}>{e.event_date&&<time>{e.event_date.slice(0,10)} · </time>}{e.title}<span className="citation-hint"> 근거 ↗</span></EvidenceDrawer></li>)}</ul></section>}
  {brief.summary&&!!document.next_checks?.length&&<section className="product-section document-next-checks"><h2>확인할 사항</h2><ul>{document.next_checks.map((check,index)=><li key={index}>{check}</li>)}</ul></section>}
  {quotes.length>0&&<details className="document-evidence"><summary>인용 원문과 한국어 번역 <span>{quotes.length}개</span></summary>{quotes.map(q=><details className="reading-quote" key={q.id}><summary>{q.translation_ko?.slice(0,100)||q.original_text.slice(0,100)}{q.source_page?` · p. ${q.source_page}`:""}</summary><div className="quote-grid"><blockquote>{q.original_text}</blockquote>{q.translation_ko&&<blockquote lang="ko">{q.translation_ko}</blockquote>}</div><a href={sourceLink(document.url,q.source_page)!} target="_blank" rel="noreferrer">공식 원문 ↗</a></details>)}</details>}
  {original?<details className="document-original"><summary>원문 전체 읽기</summary>{original}</details>:<p className="reading-status">원문은 공식 사이트에서 확인할 수 있습니다. 본문 수집 후 이곳에서도 읽을 수 있습니다.</p>}
  {!brief.evidenceCount&&<p className="reading-status">이 문서의 한국어 해석과 검증된 수치는 아직 준비되지 않았습니다.</p>}
 </div>;
}

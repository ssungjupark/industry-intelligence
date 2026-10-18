import {eligibleDocument,type ProductDocument} from './product-selection';
import {sourceLink} from './source-link';
export function acquisitionCounts(documents:ProductDocument[]) {
 const unique=[...new Map(documents.filter(d=>eligibleDocument(d)&&sourceLink(d.url)).map(d=>[d.url,d])).values()];
 return {documents:unique.length,parsed:unique.filter(d=>!!d.parsed_at).length};
}
export function acquisitionLabel(doc:ProductDocument) {
 if(doc.ingest_status==='ingested'&&doc.analyzed_at)return '분석 완료';
 return doc.parsed_at?'본문 확보 · 분석 전':doc.downloaded_at?'파일 확보 · 본문 추출 대기':'공식 링크 · 본문 수집 전';
}

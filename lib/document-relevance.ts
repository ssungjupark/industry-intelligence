import type {Meta, ProductDocument} from './product-selection';

export type DocumentRelevanceRules = {terms?:string[];excludeTerms?:string[];sharedDocumentTypes?:string[]};
export type DocumentRelevance = {status:'relevant'|'other'|'unclassified';basis:'title'|'body'|'document-type'|'unclassified';matchedTerms:string[]};
function matches(text:string,term:string) {
 const escaped=term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 return new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?:[0-9]+[a-z]?)?(?:$|[^\\p{L}\\p{N}])`,'iu').test(text);
}
// Deterministic navigation relevance, never an AI claim or evidence classification.
export function documentRelevance(doc:Pick<ProductDocument,'title'|'document_type'|'topics'> & {raw_text?:string|null},metadata?:Meta):DocumentRelevance {
 const rules=metadata?.documentRelevance as DocumentRelevanceRules|undefined;
 const terms=(rules?.terms||[]).filter(t=>typeof t==='string'&&t.trim());
 if(!terms.length)return {status:'unclassified',basis:'unclassified',matchedTerms:[]};
 const title=[doc.title,...doc.topics||[]].join(' ');
 const titleTerms=terms.filter(t=>matches(title,t));
 if(titleTerms.length)return {status:'relevant',basis:'title',matchedTerms:titleTerms};
 const excluded=(rules?.excludeTerms||[]).filter(t=>matches(title,t));
 if(excluded.length)return {status:'other',basis:'title',matchedTerms:excluded};
 if(doc.document_type&&rules?.sharedDocumentTypes?.includes(doc.document_type))return {status:'relevant',basis:'document-type',matchedTerms:[]};
 const bodyTerms=terms.filter(t=>matches((doc.raw_text||'').slice(0,12000),t));
 if(bodyTerms.length>=2)return {status:'relevant',basis:'body',matchedTerms:bodyTerms};
 return {status:'unclassified',basis:'unclassified',matchedTerms:[]};
}
export function annotateDocumentRelevance<T extends ProductDocument>(doc:T,metadata?:Meta):T {
 return {...doc,metadata:{...doc.metadata,industryRelevance:documentRelevance(doc,metadata)}};
}
export function relevanceStatus(doc:ProductDocument):DocumentRelevance['status'] {
 const status=(doc.metadata?.industryRelevance as DocumentRelevance|undefined)?.status;
 return status==='relevant'||status==='other'?status:'unclassified';
}
export function displayDocumentTitle(title:string,maxLength=180) {
 const value=title.replace(/\s+/g,' ').trim();
 if(value.length<=maxLength)return value;
 const cut=value.lastIndexOf(' ',maxLength);
 return value.slice(0,cut>maxLength*0.6?cut:maxLength).trimEnd()+'…';
}

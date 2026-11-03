import {inlineText,type ReadingContent} from './reading-content';

export type PreviewPoint={text:string;page:number|null};
const clean=(text:string)=>text.replace(/\s+/g,' ').trim();
const contact=/^(?:for release:|refer to:|media contact|investor contact|\S+@\S+|\+?\d[\d\s().-]{7,})/i;
const filingPreamble=/^(?:EX-99|[86]-K\b|FORM [86]-K|SECURITIES AND EXCHANGE COMMISSION|WASHINGTON, D\.C\.|REPORT OF FOREIGN ISSUER|PURSUANT TO RULE|THE SECURITIES EXCHANGE ACT|INDICATE BY CHECK MARK|COMMISSION FILE NUMBER|TRANSLATION OF REGISTRANT|ADDRESS OF PRINCIPAL|FOR THE MONTH OF|DOCUMENTEXHIBIT|HTTP:|HTTPS:)/i;
function sourceLines(reading:ReadingContent|null){
 if(!reading)return [];
 return reading.blocks.slice(0,100).flatMap(block=>('content' in block?inlineText(block.content):'').split(/\n+/)).map(clean).filter(Boolean).slice(0,350);
}
export function secDocumentHeadline(reading:ReadingContent|null,entityName:string,fallback:string){
 const name=entityName.toLowerCase();
 const lines=sourceLines(reading);
 let updateTitle:string|null=null;
 for(const [index,line] of lines.slice(0,30).entries()){
  const update=line.match(/\bQ[1-4]\s+20\d{2}\s+Update\b/i);
  if(update&&index<5)updateTitle=`${entityName} ${update[0]}`;
  if(line.length<18||line.length>120||/[.!?]$/.test(line)||filingPreamble.test(line)||contact.test(line))continue;
  if(line.toLowerCase().startsWith(name)&&/\b(?:reports?|announces?|results?|approv(?:ed|al)?|updates?|launches?|completes?|production|deliveries|to\s+[a-z]+)\b/i.test(line)){
   const period=lines[0]?.match(/\b[1-4]Q(?:20)?\d{2}\b/i)?.[0];
   return period&&/\bgroup results\b/i.test(line)&&!(/\d/.test(line))?`${line} · ${period.toUpperCase()}`:line;
  }
 }
 if(updateTitle)return updateTitle;
 const first=lines[0]||'';
 if(/^6-K\s+\d+\s+\S+\.htm\s+/i.test(first)){
  const heading=first.replace(/^6-K\s+\d+\s+\S+\.htm\s+/i,'').replace(/\s+[a-z]\w{2,}(?:\s+FORM 6-K)?$/i,'').replace(/\s+PART \d+ OF \d+$/i,'').trim();
  if(heading.length>=15&&heading.length<=120&&!filingPreamble.test(heading))return `${entityName} — ${heading}`;
 }
 return fallback;
}
function secPreview(reading:ReadingContent|null):PreviewPoint[]{
 const lines=sourceLines(reading);
 const candidates=lines.flatMap(line=>line.length>650?line.split(/(?<=[.!?])\s+(?=[A-Z“])/):[line]).map(clean);
 const points:PreviewPoint[]=[];const seen=new Set<string>();
 for(const line of candidates){
  if(line.length<45||line.length>500||filingPreamble.test(line)||contact.test(line)||/@|\b(?:Table of Contents|Exhibit 99|Forward-Looking Statements|reconciliation of GAAP|Securities Exchange Act|Commission pursuant|check mark|file number assigned|PART \d+ OF \d+)\b|^FOR RELEASE AT|Highlights 03 Financial Summary/i.test(line))continue;
  if(/(?:\d[\d,.]*\s*){12,}/.test(line))continue;
  if(!/\d/.test(line)&&!(line.length>=120&&/[.!?]$/.test(line)))continue;
  if(!/(?:approved|results|growth|production|revenue|profit|cash flow|clinical|trial|guidance|earnings|capacity|sales|launch|operating|quarter)/i.test(line))continue;
  if(line.length<110&&/\b(?:reports|announces|results|update)\b/i.test(line)&&!/(?:\$|%|increased|decreased|up|down)/i.test(line))continue;
  const key=line.toLowerCase();if(seen.has(key))continue;seen.add(key);
  points.push({text:line,page:null});if(points.length===3)break;
 }
 return points;
}

// An extractive reading aid only. Every sentence stays in the official original;
// it is deliberately not presented as a translation, AI analysis or new evidence.
export function documentPreview(rawText:string|null,reading:ReadingContent|null,sourceUrl?:string|null):PreviewPoint[]{
 if(!rawText)return [];
 if(sourceUrl&&new URL(sourceUrl).hostname==='www.sec.gov')return secPreview(reading);
 const pages=rawText.split(/\[\[PAGE (\d+)\]\]/);
 const bullets:PreviewPoint[]=[];
 if(pages.length>1){
  for(let i=1;i<Math.min(pages.length,7);i+=2){
   const page=Number(pages[i]);let current='';
   const flush=()=>{const text=clean(current);if(text.length>=35&&text.length<=650&&!contact.test(text))bullets.push({text,page});current='';};
   for(const line of (pages[i+1]||'').split(/\r?\n/)){
    const trimmed=line.trim();
    if(/^[•●▪]\s+/.test(trimmed)){flush();current=trimmed.replace(/^[•●▪]\s+/,'');}
    else if(current&&trimmed){
     if(/[.!?]$/.test(current)&&/^[A-Z][A-Z\s]+,\s+[A-Z][a-z]+ \d{1,2}, \d{4}\s*[-–]/.test(trimmed))flush();
     else current+=` ${trimmed}`;
    }
    else if(current&&!trimmed)flush();
   }
   flush();
   if(bullets.length>=5)break;
  }
 }
 if(bullets.length)return bullets.slice(0,5);
 if(!reading)return [];
 const points:PreviewPoint[]=[];let page:number|null=null;
 for(const block of reading.blocks){
  if(block.type==='page'){page=block.page;continue;}
  if(block.type!=='paragraph'&&block.type!=='list')continue;
  const texts=block.type==='list'?block.items.map(item=>item.flatMap(b=>b.type==='paragraph'&&'content' in b?[inlineText(b.content)]:[]).join(' ')):block.type==='paragraph'&&'content' in block?[inlineText(block.content)]:[];
  for(const value of texts){const text=clean(value);if(text.length<70||text.length>500||contact.test(text)||/^[A-Z][a-z]+ \d{1,2},? \d{4}$/.test(text))continue;
   points.push({text,page});if(points.length===3)return points;
  }
 }
 return points;
}

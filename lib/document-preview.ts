import {inlineText,type ReadingContent} from './reading-content';

export type PreviewPoint={text:string;page:number|null};
const clean=(text:string)=>text.replace(/\s+/g,' ').trim();
const contact=/^(?:for release:|refer to:|media contact|investor contact|\S+@\S+|\+?\d[\d\s().-]{7,})/i;

// An extractive reading aid only. Every sentence stays in the official original;
// it is deliberately not presented as a translation, AI analysis or new evidence.
export function documentPreview(rawText:string|null,reading:ReadingContent|null):PreviewPoint[]{
 if(!rawText)return [];
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

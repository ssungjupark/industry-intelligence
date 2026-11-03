// Presentation only. Never replace the source text used for evidence matching.
export type ReadingInline={text:string;bold?:boolean;italic?:boolean;sup?:boolean;sub?:boolean;href?:string};
export type ReadingBlock=
 |{type:'paragraph'|'quote'|'preformatted';content:ReadingInline[]}
 |{type:'heading';level:2|3|4;content:ReadingInline[]}
 |{type:'list';ordered:boolean;start?:number;items:ReadingBlock[][]}
 |{type:'table';caption?:string;rows:Array<Array<{content:ReadingInline[];header?:boolean;colSpan?:number;rowSpan?:number}>>}
 |{type:'page';page:number};
export type ReadingContent={version:1;format:'html'|'pdf'|'text';blocks:ReadingBlock[]};
export const inlineText=(content:ReadingInline[])=>content.map(i=>i.text).join('');
export function safeReadingUrl(value:string,base?:string){
 try{const u=new URL(value,base);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:null;}catch{return null;}
}

// Check the untrusted JSON boundary; the renderer only creates React text/elements.
export function readReadingContent(value:unknown):ReadingContent|null{
 if(!value||typeof value!=='object')return null;
 const v=value as Record<string,unknown>;if(v.version!==1||!['html','pdf','text'].includes(String(v.format))||!Array.isArray(v.blocks)||!v.blocks.length)return null;
 let count=0,characters=0;
 const inlines=(items:unknown):items is ReadingInline[]=>Array.isArray(items)&&items.every(i=>{
  if(!i||typeof i!=='object'||typeof i.text!=='string')return false;
  characters+=i.text.length;
  return characters<=1_000_000&&['bold','italic','sup','sub'].every(k=>i[k]===undefined||typeof i[k]==='boolean')&&(i.href===undefined||typeof i.href==='string'&&safeReadingUrl(i.href)!==null);
 });
 const blocks=(items:unknown,depth=0):items is ReadingBlock[]=>depth<14&&Array.isArray(items)&&items.every(b=>{
  if(++count>20000||!b||typeof b!=='object')return false;
  if(b.type==='page')return Number.isInteger(b.page)&&b.page>0&&b.page<=10000;
  if(b.type==='heading')return [2,3,4].includes(b.level)&&inlines(b.content);
  if(['paragraph','quote','preformatted'].includes(b.type))return inlines(b.content);
  if(b.type==='list')return typeof b.ordered==='boolean'&&(b.start===undefined||Number.isInteger(b.start)&&b.start>0)&&Array.isArray(b.items)&&b.items.every((i:unknown)=>blocks(i,depth+1));
  if(b.type==='table')return (b.caption===undefined||typeof b.caption==='string')&&Array.isArray(b.rows)&&b.rows.every((r:unknown)=>Array.isArray(r)&&r.every(c=>c&&typeof c==='object'&&inlines(c.content)&&['colSpan','rowSpan'].every(k=>c[k]===undefined||Number.isInteger(c[k])&&c[k]>0&&c[k]<=1000)&&(c.header===undefined||typeof c.header==='boolean')));
  return false;
 });
 return blocks(v.blocks)?value as ReadingContent:null;
}

function paragraphs(text:string):ReadingBlock[]{
 const result:ReadingBlock[]=[];
 for(const part of text.replace(/\r\n/g,'\n').split(/\n\s*\n/)){
  const trimmed=part.trim();if(!trimmed)continue;
  // Financial rows/code keep their extracted columns; do not invent table cells.
  if(trimmed.split('\n').length>2&&trimmed.split('\n').filter(l=>/\d/.test(l)).length>trimmed.split('\n').length*.6){result.push({type:'preformatted',content:[{text:trimmed}]});continue;}
  const sentences=trimmed.replace(/\n/g,' ').split(/(?<=[.!?。！？])\s+(?=[A-Z“"가-힣])/);
  let paragraph='';
  for(const sentence of sentences){
   if(paragraph.length>400&&paragraph.length+sentence.length>700){result.push({type:'paragraph',content:[{text:paragraph}]});paragraph='';}
   paragraph+=(paragraph?' ':'')+sentence;
  }
  if(paragraph)result.push({type:'paragraph',content:[{text:paragraph}]});
 }
 return result;
}
function pdfParagraphs(text:string):ReadingBlock[]{
 const result:ReadingBlock[]=[];let prose:string[]=[];let bullet='';let bullets:ReadingBlock[][]=[];
 const flushProse=()=>{if(prose.length){result.push(...paragraphs(prose.join('\n')));prose=[];}};
 const flushBullet=()=>{if(bullet){bullets.push([{type:'paragraph',content:[{text:bullet.trim()}]}]);bullet='';}};
 const flushList=()=>{flushBullet();if(bullets.length){result.push({type:'list',ordered:false,items:bullets});bullets=[];}};
 for(const rawLine of text.replace(/\r\n/g,'\n').split('\n')){
  const line=rawLine.trim();
  if(!line){flushList();flushProse();continue;}
  if(/^[•●▪]\s+/.test(line)){
   flushProse();flushBullet();bullet=line.replace(/^[•●▪]\s+/,'');continue;
  }
  if(bullet){
   // A new dateline or normal paragraph after a finished bullet starts the body.
   if(/[.!?]$/.test(bullet)&&/^[A-Z][A-Z\s]+,\s+[A-Z][a-z]+ \d{1,2}, \d{4}\s*[-–]/.test(line)){flushList();prose.push(line);}
   else bullet+=` ${line}`;
   continue;
  }
  if(prose.length&&(/^(?:For release:|Refer to:)/i.test(line)||/^[A-Z][a-z]+ \d{1,2}, \d{4}$/.test(line))){flushProse();}
  prose.push(line);
  if(/[.!?]$/.test(line)&&prose.join(' ').length>110)flushProse();
 }
 flushList();flushProse();return result;
}
export function readingFromPlainText(raw:string):ReadingContent{
 const blocks:ReadingBlock[]=[];const parts=raw.split(/\[\[PAGE (\d+)\]\]/);
 if(parts.length===1)return {version:1,format:'text',blocks:paragraphs(raw)};
 blocks.push(...pdfParagraphs(parts[0]));
 for(let i=1;i<parts.length;i+=2){blocks.push({type:'page',page:Number(parts[i])},...pdfParagraphs(parts[i+1]||''));}
 return {version:1,format:'pdf',blocks};
}

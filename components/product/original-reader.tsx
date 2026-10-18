'use client';
import {useState,type ReactNode} from 'react';
import {inlineText,readReadingContent,readingFromPlainText,type ReadingBlock,type ReadingContent,type ReadingInline} from '@/lib/reading-content';
import {sourceLink} from '@/lib/source-link';

function Inline({items}:{items:ReadingInline[]}){
 return <>{items.map((item,index)=>{let node:ReactNode=item.text;
  if(item.bold)node=<strong>{node}</strong>;if(item.italic)node=<em>{node}</em>;
  if(item.sup)node=<sup>{node}</sup>;if(item.sub)node=<sub>{node}</sub>;
  if(item.href)node=<a href={item.href} target="_blank" rel="noreferrer">{node}</a>;
  return <span className="reader-inline" key={index}>{node}</span>;
 })}</>;
}
function Blocks({blocks,source,prefix='section'}:{blocks:ReadingBlock[];source:string|null;prefix?:string}){
 return <>{blocks.map((block,index)=>{
  const id=`reader-${prefix}-${index}`,content='content' in block?<Inline items={block.content}/>:null;
  switch(block.type){
   case 'heading':{const Tag=`h${block.level}` as 'h2'|'h3'|'h4';return <Tag id={id} key={id}>{content}</Tag>;}
   case 'paragraph':return <p key={id}>{content}</p>;
   case 'quote':return <blockquote key={id}>{content}</blockquote>;
   case 'preformatted':return <div className="reader-extracted-lines" key={id}><pre>{inlineText(block.content)}</pre></div>;
   case 'list':{const Tag=block.ordered?'ol':'ul';return <Tag key={id} start={block.ordered?block.start:undefined}>{block.items.map((items,i)=><li key={i}><Blocks blocks={items} source={source} prefix={`${prefix}-${index}-${i}`}/></li>)}</Tag>;}
   case 'table':return <div className="reader-table-scroll" role="region" aria-label={block.caption||'원문 표'} tabIndex={0} key={id}><table>{block.caption&&<caption>{block.caption}</caption>}<tbody>{block.rows.map((row,r)=><tr key={r}>{row.map((cell,c)=>{const Tag=cell.header?'th':'td';return <Tag key={c} colSpan={cell.colSpan} rowSpan={cell.rowSpan} scope={cell.header?(r===0?'col':'row'):undefined}><Inline items={cell.content}/></Tag>;})}</tr>)}</tbody></table></div>;
   case 'page':return <div className="reader-page-break" id={`reader-page-${block.page}`} key={id}><span>Page {block.page}</span>{sourceLink(source,block.page)&&<a href={sourceLink(source,block.page)!} target="_blank" rel="noreferrer">PDF에서 보기 ↗</a>}</div>;
  }
 })}</>;
}
export function OriginalReader({content,source}:{content:ReadingContent;source:string|null}){
 const [size,setSize]=useState(17);
 // Defensive boundary for DB/public JSON, in addition to extraction validation.
 const reading=readReadingContent(content)||readingFromPlainText('');
 const headings=reading.blocks.flatMap((b,i)=>b.type==='heading'?[{id:`reader-section-${i}`,text:inlineText(b.content),level:b.level}]:[]);
 const pages=reading.blocks.filter(b=>b.type==='page');
 return <section className="original-reader" aria-label="원문 읽기">
  <div className="reader-toolbar"><span>원문</span><div className="reader-tools">{pages.length>1&&<label className="reader-page-select"><span className="sr-only">PDF 페이지 이동</span><select aria-label="PDF 페이지 이동" defaultValue="" onChange={e=>{if(e.target.value)window.location.hash=`reader-page-${e.target.value}`;}}><option value="" disabled>페이지 이동</option>{pages.map(p=><option key={p.page} value={p.page}>Page {p.page}</option>)}</select></label>}<div className="reader-font-controls" role="group" aria-label="본문 글자 크기"><button aria-label="글자 작게" disabled={size<=15} onClick={()=>setSize(size-1)}>A−</button><output aria-live="polite">{size}</output><button aria-label="글자 크게" disabled={size>=23} onClick={()=>setSize(size+1)}>A+</button></div>{sourceLink(source)&&<a href={sourceLink(source)!} target="_blank" rel="noreferrer">공식 원문 ↗</a>}</div></div>
  <div className={`reader-layout${headings.length?' reader-has-toc':''}`}>
   {headings.length>0&&<aside className="reader-toc"><details open><summary>목차</summary><nav aria-label="문서 목차">{headings.map(h=><a key={h.id} href={`#${h.id}`} className={h.level>2?'reader-toc-child':undefined}>{h.text}</a>)}</nav></details></aside>}
   <article className="reader-body" style={{fontSize:size}}><Blocks blocks={reading.blocks} source={source}/></article>
  </div>
 </section>;
}

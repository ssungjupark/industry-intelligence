// Scheduled, acquisition-only refresh for the read-only public edition.
// The reviewed analysis graph is never changed by this program.
import {readFile,writeFile,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {load} from 'cheerio';
import {extractText,getDocumentProxy} from 'unpdf';

const hash=value=>createHash('sha256').update(value).digest('hex');
export const stableId=value=>{const h=hash(value);return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;};
const clean=value=>String(value||'').replace(/\s+/g,' ').trim();
const lower=value=>clean(value).toLowerCase();
const MAX_BYTES=15*1024*1024;
const MAX_TEXT=300_000;
const MAX_PAGES=120;
const USER_AGENT='IndustryIntelligencePlatform/0.4 (+primary-source-monitor)';

export function officialUrl(value,source,base){
 const url=new URL(value,base);
 if(url.protocol!=='https:'||url.username||url.password||!source.allowedHosts?.some(host=>url.hostname===host||url.hostname.endsWith(`.${host}`)))throw Error(`URL outside official HTTPS hosts: ${url.hostname}`);
 url.hash='';return url;
}
export async function fetchOfficial(value,source,fetcher=fetch){
 let url=officialUrl(value,source);
 for(let hop=0;hop<=5;hop++){
  const response=await fetcher(url,{redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(20_000),headers:{'user-agent':USER_AGENT,accept:'text/html,application/pdf,application/xml,text/xml,application/rss+xml,text/plain,*/*'}});
  if([301,302,303,307,308].includes(response.status)){
   const location=response.headers.get('location');await response.body?.cancel();
   if(!location)throw Error('Redirect missing location');url=officialUrl(location,source,url);continue;
  }
  if(!response.ok){await response.body?.cancel();throw Error(`Official source HTTP ${response.status}: ${url.href}`);}
  const reader=response.body?.getReader();if(!reader)throw Error('Missing response body');
  const chunks=[];let size=0;
  try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_BYTES)throw Error('Source exceeds 15 MB');chunks.push(value);}}
  finally{await reader.cancel();}
  return {buffer:Buffer.concat(chunks),contentType:response.headers.get('content-type')||'',url};
 }
 throw Error('Too many redirects');
}
async function fetchSecOfficial(value,source,fetcher){
 for(let attempt=0;attempt<3;attempt++){
  try{return await fetchOfficial(value,source,fetcher);}catch(error){
   if(!/Official source HTTP (?:429|502|503)/.test(String(error))||attempt===2)throw error;
   await new Promise(resolve=>setTimeout(resolve,1500*(attempt+1)));
  }
 }
 throw Error('SEC fetch retry exhausted');
}
function publicationDate(value){
 if(!value||!/(?:19|20)\d{2}/.test(value))return null;
 const text=clean(value).replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\./gi,'$1');
 const local=text.match(/^(\d{4})\s*[./년]\s*(\d{1,2})\s*[./월]\s*(\d{1,2})\s*[.일]?$/);
 if(local)return publicationDate(`${local[1]}-${local[2].padStart(2,'0')}-${local[3].padStart(2,'0')}`);
 const monthFirst=text.match(/^(?:[A-Za-z]+,\s*)?([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
 const dayFirst=text.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
 if(monthFirst||dayFirst){
  const month=(monthFirst?.[1]||dayFirst[2]).slice(0,3).toLowerCase();
  const index=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(month);
  if(index<0)return null;
  const year=Number((monthFirst||dayFirst)[3]),day=Number(monthFirst?.[2]||dayFirst[1]);
  return publicationDate(`${year}-${String(index+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`);
 }
 const date=/^\d{4}-\d{2}-\d{2}$/.test(text)?new Date(`${text}T00:00:00Z`):new Date(text);
 if(!Number.isFinite(date.getTime())||date.getTime()>Date.now()+86400000)return null;
 if(/^\d{4}-\d{2}-\d{2}$/.test(text)&&date.toISOString().slice(0,10)!==text)return null;
 return date.toISOString();
}
function matchingRule(source,title,url){
 const label=lower(title),link=lower(url);
 // Machine-readable XBRL taxonomy attachments are not investor reading documents.
 if(/\bxbrl\b|\bex-101(?:\.|\b)/i.test(label)||/\.(?:xsd|xml)(?:\?|$)/i.test(link))return null;
 return source.rules?.find(rule=>!(rule.excludesAny||[]).some(term=>label.includes(lower(term))||link.includes(lower(term)))&&
  (!(rule.containsAny?.length)||rule.containsAny.some(term=>label.includes(lower(term))||link.includes(lower(term))))&&
  (!(rule.hrefContainsAny?.length)||rule.hrefContainsAny.some(term=>link.includes(lower(term)))))||null;
}
function titleOf(label,url){
 const title=clean(label);if(title.length>=3&&!/^(read article|read more|learn more|download)$/i.test(title))return title.slice(0,240);
 const parts=url.pathname.split('/').filter(Boolean);const last=parts.at(-1);
 const name=last?.toLowerCase()==='default.aspx'?parts.at(-2):last;
 return decodeURIComponent(name||url.hostname).replace(/[-_]+/g,' ').slice(0,240);
}
export function pdfHeaderMetadata(raw,config={}){
 const first=raw.split('[[PAGE 2]]')[0].replace(/^\[\[PAGE 1\]\]\s*/,'').slice(0,5000);
 let title=null;
 if(typeof config.pdfTitlePrefix==='string'&&typeof config.pdfTitleEnd==='string'){
  const start=first.indexOf(config.pdfTitlePrefix),end=start>=0?first.indexOf(config.pdfTitleEnd,start):-1;
  if(start>=0&&end>start){const candidate=clean(first.slice(start,end));if(candidate.length<=500)title=candidate;}
 }
 const index=config.pdfDateLine;
 const date=Number.isInteger(index)&&index>=0&&index<16?first.split('\n').filter(Boolean)[index]:null;
 return {title,publishedAt:publicationDate(date)};
}
function discovered(source,url,title,discoveryUrl,publishedAt,rank){
 const rule=matchingRule(source,title,url.href);if(!rule?.autoIngest)return null;
 return {source,url:url.href,title:titleOf(title,url),discoveryUrl,documentType:rule.documentType,publishedAt:publicationDate(publishedAt),rank};
}
export function discoverHtml(source,pageUrl,html){
 const $=load(html);$('script,style,noscript').remove();const results=[];
 $(source.config?.linkSelector||'a[href]').each((_,element)=>{
  const raw=$(element).attr('href')?.trim();if(!raw||/^(javascript:|mailto:)/i.test(raw))return;
  let url;try{url=officialUrl(raw,source,pageUrl);}catch{return;}
  if(url.href.replace(/\/$/,'')===pageUrl.replace(/\/$/,'')||source.config?.excludeUrls?.includes(url.href))return;
  const container=source.config?.linkContainer?$(element).closest(source.config.linkContainer):$(element);
  const title=source.config?.linkTitleSelector?container.find(source.config.linkTitleSelector).first().text():'';
  const date=container.find(source.config?.linkDateSelector||'time[datetime]').first();
  const row=discovered(source,url,title||container.text(),pageUrl,date.attr('datetime')||date.text(),results.length);
  if(row)results.push(row);
 });
 return [...new Map(results.map(row=>[row.url,row])).values()];
}
export function discoverRss(source,feedUrl,xml){
 const $=load(xml,{xmlMode:true});const results=[];
 $('item,entry').each((_,element)=>{
  const title=clean($(element).find('title').first().text());
  const raw=$(element).find('link').first().attr('href')||$(element).find('link').first().text().trim();if(!raw)return;
  let url;try{url=officialUrl(raw,source,feedUrl);}catch{return;}
  const date=$(element).find('filing-date,pubDate,published,updated').first().text();
  const row=discovered(source,url,title,feedUrl,date,results.length);if(row)results.push(row);
 });
 return [...new Map(results.map(row=>[row.url,row])).values()];
}
export function discoverXmlList(source,pageUrl,xml){
 const {root,idField,titleField,dateField,documentUrl,documentParam}=source.config.xmlList;
 const $=load(xml,{xmlMode:true});
 const list=$(root);
 if(list.length!==1)throw Error('Official XML list missing');
 const values=field=>list.children(field).map((_,element)=>clean($(element).text())).get();
 const ids=values(idField),titles=values(titleField),dates=values(dateField);
 if(!ids.length||ids.length!==titles.length||ids.length!==dates.length)throw Error('Official XML list columns do not match');
 const results=[];
 for(const [index,id] of ids.entries()){
  if(!/^\d{1,20}$/.test(id)||!titles[index])continue;
  const url=officialUrl(documentUrl,source,pageUrl);
  url.searchParams.set(documentParam,id);
  const row=discovered(source,url,titles[index],pageUrl,dates[index],index);
  if(row)results.push(row);
 }
 return [...new Map(results.map(row=>[row.url,row])).values()];
}
export function secFilingDocument(indexUrl,html){
 const $=load(html),files=[];
 $('table.tableFile tr').each((_,row)=>{
  const cells=$(row).children('td'),href=cells.eq(2).find('a[href]').first().attr('href');if(!href)return;
  try{const linked=new URL(href,indexUrl),archive=linked.pathname==='/ix'?linked.searchParams.get('doc'):null;
   files.push({type:clean(cells.eq(3).text()).toUpperCase(),description:clean(cells.eq(1).text()),url:archive?.startsWith('/Archives/')?new URL(archive,indexUrl).href:linked.href});
  }catch{/* Malformed filing row. */}
 });
 return files.find(file=>/^EX-99(?:\.1|$)/.test(file.type))||files.find(file=>/^(?:8-K|6-K|10-Q|10-K|20-F)$/.test(file.type))||null;
}
export async function discoverSource(source,fetcher){
 const urls=[...new Set(source.discoveryUrls)];const results=[];let loaded=0;
 const followLimit=Math.min(8,Math.max(0,Number(source.config?.maxFollowPages)||0));
 for(let index=0;index<urls.length;index++){
  let fetched;try{fetched=source.adapter==='sec_filings'?await fetchSecOfficial(urls[index],source,fetcher):await fetchOfficial(urls[index],source,fetcher);loaded++;}
  catch(error){console.warn(`Discovery ${source.id}: ${String(error)}`);continue;}
  const content=fetched.buffer.toString('utf8');
  if(source.adapter==='sec_filings'){
   const indexes=discoverRss(source,urls[index],content).slice(0,Math.min(20,Math.max(1,Number(source.config?.maxFilingIndexes)||5)));
   for(const filing of indexes){
    try{await new Promise(resolve=>setTimeout(resolve,350));const page=await fetchSecOfficial(filing.url,source,fetcher),selected=secFilingDocument(filing.url,page.buffer.toString('utf8'));
     if(!selected)continue;const url=officialUrl(selected.url,source);
     if(source.config?.requireExhibit===true&&!/^EX-99(?:\.1|$)/.test(selected.type))continue;
     if(source.config?.excludeFilingDescriptions?.some(term=>lower(selected.description).includes(lower(term))))continue;
     const description=/^(?:EX-99(?:\.1)?|FORM [86]-K|[86]-K)$/i.test(selected.description)?'':selected.description;
     results.push({...filing,url:url.href,title:description?`${source.entityName} — ${description}`:`${source.entityName} official filing · ${filing.publishedAt?.slice(0,10)||selected.type}`,documentType:'filing',rank:results.length});
     if(results.length>=3)break;
    }catch(error){console.warn(`SEC filing ${filing.url}: ${String(error)}`);}
   }
  }else if(source.adapter==='xml_list')results.push(...discoverXmlList(source,fetched.url.href,content));
  else results.push(...(source.adapter==='rss'?discoverRss(source,fetched.url.href,content):discoverHtml(source,fetched.url.href,content)));
  if(source.adapter==='html_links'&&index<source.discoveryUrls.length&&source.config?.followLinkSelector){
   const $=load(content);$(source.config.followLinkSelector).each((_,element)=>{
    if(urls.length>=source.discoveryUrls.length+followLimit)return;
    try{const next=officialUrl($(element).attr('href'),source,urls[index]).href;if(!urls.includes(next))urls.push(next);}catch{/* Only official links. */}
   });
  }
 }
 if(!loaded)throw Error('No discovery page could be fetched');
 return [...new Map(results.map(row=>[row.url,row])).values()];
}
function readingParagraphs(text){
 return text.split(/\n\s*\n/).map(clean).filter(Boolean).flatMap(part=>{
  if(part.length<=900)return [{type:'paragraph',content:[{text:part}]}];
  const chunks=part.match(/.{1,900}(?:\s|$)/g)||[part];return chunks.map(chunk=>({type:'paragraph',content:[{text:chunk.trim()}]}));
 });
}
function secHeadline(reading,entityName,fallback){
 const lines=reading.blocks.slice(0,100).flatMap(block=>block.content?[block.content.map(item=>item.text).join('').split(/\n+/)]:[]).flat().map(clean);
 let updateTitle=null;
 for(const [index,line] of lines.slice(0,30).entries()){
  const update=line.match(/\bQ[1-4]\s+20\d{2}\s+Update\b/i);if(update&&index<5)updateTitle=`${entityName} ${update[0]}`;
  if(line.length<18||line.length>120||/[.!?]$/.test(line)||/^(?:EX-99|[86]-K\b|FORM [86]-K|SECURITIES AND EXCHANGE COMMISSION|REPORT OF FOREIGN ISSUER|PURSUANT TO RULE|INDICATE BY CHECK MARK|DOCUMENTEXHIBIT)/i.test(line))continue;
  if(line.toLowerCase().startsWith(entityName.toLowerCase())&&/\b(?:reports?|announces?|results?|approv(?:ed|al)?|updates?|launches?|completes?|production|deliveries|to\s+[a-z]+)\b/i.test(line)){
   const period=lines[0]?.match(/\b[1-4]Q(?:20)?\d{2}\b/i)?.[0];
   return period&&/\bgroup results\b/i.test(line)&&!/\d/.test(line)?`${line} · ${period.toUpperCase()}`:line;
  }
 }
 if(updateTitle)return updateTitle;
 const first=lines[0]||'';
 if(/^6-K\s+\d+\s+\S+\.htm\s+/i.test(first)){
  const heading=first.replace(/^6-K\s+\d+\s+\S+\.htm\s+/i,'').replace(/\s+[a-z]\w{2,}(?:\s+FORM 6-K)?$/i,'').replace(/\s+PART \d+ OF \d+$/i,'').trim();
  if(heading.length>=15&&heading.length<=120)return `${entityName} — ${heading}`;
 }
 return fallback;
}
export async function parseOfficial(fetched,source,title){
 if(fetched.contentType.includes('pdf')||fetched.url.pathname.toLowerCase().endsWith('.pdf')||fetched.buffer.toString('ascii',0,5)==='%PDF-'){
  const pdf=await getDocumentProxy(new Uint8Array(fetched.buffer));
  if(pdf.numPages>MAX_PAGES)throw Error(`PDF exceeds ${MAX_PAGES} pages`);
  const extracted=await extractText(pdf,{mergePages:false});const pages=Array.isArray(extracted.text)?extracted.text:[extracted.text];
  const raw=pages.map((text,index)=>`[[PAGE ${index+1}]]\n${text.trim()}`).join('\n\n').slice(0,MAX_TEXT);
  if(raw.length<200)throw Error('PDF has insufficient text');
  const blocks=pages.flatMap((text,index)=>[{type:'page',page:index+1},...readingParagraphs(text)]);
  const header=pdfHeaderMetadata(raw,source.config);
  return {rawText:raw,reading:{version:1,format:'pdf',blocks},pages:pdf.numPages,title:header.title||title,publishedAt:header.publishedAt};
 }
 const html=fetched.buffer.toString('utf8');
 if(fetched.url.hostname==='www.sec.gov'&&(/\/ix$/i.test(fetched.url.pathname)||/\/WYyeob_|\/cdn-cgi\/challenge|bot management/i.test(html.slice(0,2000))))throw Error('SEC filing returned an interactive viewer or access challenge');
 if(!fetched.contentType.includes('html')&&!/<html[\s>]/i.test(html)){
  const rawText=html.trim().slice(0,MAX_TEXT);if(rawText.length<200)throw Error('Text too short');
  return {rawText,reading:{version:1,format:'text',blocks:readingParagraphs(rawText)},pages:null,title,publishedAt:null};
 }
 const $=load(html);const pageTitle=clean((source.config?.titleSelector?$(source.config.titleSelector).first().text():null)||$('meta[property="og:title"]').attr('content')||$('article h1,main h1,h1').first().text()||title).slice(0,500);
 const dateElement=source.config?.dateSelector?$(source.config.dateSelector).first():null;
 const publishedAt=publicationDate($('meta[property="article:published_time"],meta[name="datePublished"],meta[name="pubdate"]').first().attr('content')||dateElement?.attr('datetime')||dateElement?.text());
 $('script,style,noscript,nav,footer,header').remove();
 if(source.config?.excludeContentSelector)$(source.config.excludeContentSelector).remove();
 const root=source.config?.contentSelector?$(source.config.contentSelector).first():$('article').first().length?$('article').first():$('main').first().length?$('main').first():$('body').first();
 if(!root.length)throw Error('HTML article body missing');
 const blocks=[];
 root.find('h2,h3,h4,p,li,table').each((_,element)=>{
  const tag=element.tagName?.toLowerCase();if($(element).parents('table').length)return;
  const value=clean($(element).text());if(!value)return;
  if(/^h[234]$/.test(tag))blocks.push({type:'heading',level:Number(tag[1]),content:[{text:value}]});
  else if(tag==='table'){
   const rows=[];$(element).find('tr').each((_,tr)=>{const cells=[];$(tr).children('th,td').each((_,cell)=>cells.push({content:[{text:clean($(cell).text())}],header:cell.tagName?.toLowerCase()==='th'}));if(cells.length)rows.push(cells);});
   if(rows.length)blocks.push({type:'table',rows});
  }else blocks.push({type:'paragraph',content:[{text:tag==='li'?`• ${value}`:value}]});
 });
 if(!blocks.length)blocks.push(...readingParagraphs(clean(root.text())));
 const rawText=blocks.map(block=>block.type==='table'?block.rows.map(row=>row.map(cell=>cell.content[0].text).join(' | ')).join('\n'):block.content[0].text).join('\n\n').slice(0,MAX_TEXT);
 if(rawText.length<200||/^(access denied|just a moment|please enable javascript|403 forbidden)/i.test(pageTitle))throw Error('HTML article body missing or blocked');
 const reading={version:1,format:'html',blocks};
 return {rawText,reading,pages:null,title:source.adapter==='sec_filings'?secHeadline(reading,source.entityName,pageTitle):pageTitle,publishedAt};
}
export function selectSources(registry,day=new Date(),batch=12){
 const active=registry.filter(source=>source.enabled!==false&&source.config?.discoveryMode!=='references'&&['html_links','rss','sec_filings','xml_list'].includes(source.adapter));
 const daily=active.filter(source=>source.cadence==='daily');
 const rotating=active.filter(source=>source.cadence!=='daily');
 if(!rotating.length)return daily;
 const groups=Math.ceil(rotating.length/batch),index=Math.floor(day.getTime()/86400000)%groups;
 return [...daily,...rotating.slice(index*batch,(index+1)*batch)];
}
async function mergeCoverage(path,stem,tables,reading){
 let merged=0;
 try{
  const wave=JSON.parse(await readFile(path(`data/${stem}.json`),'utf8'));
  const waveReading=JSON.parse(await readFile(path(`data/${stem}-reading.json`),'utf8'));
  for(const [name,rows] of Object.entries(wave.tables||{})){
   if(!Array.isArray(rows)||!Array.isArray(tables[name]))throw Error(`Invalid coverage wave table: ${name}`);
   const key=row=>name==='entity_industries'?`${row.entity_id}|${row.industry_id}`:row.id;
   const seen=new Set(tables[name].map(key));
   for(const row of rows)if(!seen.has(key(row))){tables[name].push(row);seen.add(key(row));merged++;}
  }
  for(const [id,value] of Object.entries(waveReading))if(!reading[id]){reading[id]=value;merged++;}
 }catch(error){if(error.code!=='ENOENT')throw error;}
 return merged;
}
// Percent escape case varies across WordPress index pages and RSS feeds.
const documentKey=url=>url.replace(/%[a-f0-9]{2}/gi,part=>part.toUpperCase());
export async function refresh({directory=process.cwd(),date=new Date(),batch=12,maxNew=12,dailyMaxNew=20,group='all',fetcher=fetch,dryRun=false}={}){
 const path=name=>`${directory}/${name}`;
 const [catalog,reading,registry]=await Promise.all(['data/official-catalog.json','data/reading-content.json','automation/source-registry.json'].map(async name=>JSON.parse(await readFile(path(name),'utf8'))));
 const tables=catalog.tables;if(!Array.isArray(tables?.documents)||!Array.isArray(tables?.entities)||!Array.isArray(tables?.source_registry))throw Error('Invalid public catalog');
 // Fold reviewed additions into the catalog before looking up scheduled entities and URLs.
 let waveMerged=0;
 for(const stem of ['coverage-wave','korea-coverage'])waveMerged+=await mergeCoverage(path,stem,tables,reading);
 const originalAnalysis=await readFile(path('data/analysis.json'));
 const companies=new Map(tables.entities.map(row=>[row.name,row]));
 const registered=new Map(tables.source_registry.map(row=>[row.id,row]));
 const sourceById=new Map(registry.map(source=>[source.id,source]));
 // Repair prior scheduled entries that turned out to be XBRL index attachments.
 const beforeCount=tables.documents.length;
 tables.documents=tables.documents.filter(doc=>doc.parsed_at||doc.analyzed_at||!/\bxbrl\b|\bex-101(?:\.|\b)/i.test(doc.title));
 const removedInvalid=beforeCount-tables.documents.length;
 let repaired=0;
 for(const doc of tables.documents){
  if(!doc.analyzed_at&&doc.title==='default.aspx'){
   const better=titleOf('Read more',new URL(doc.url));if(better!==doc.title){doc.title=better;repaired++;}
  }
  if(doc.analyzed_at||!doc.parsed_at||!doc.raw_text||!/^press release$/i.test(doc.title))continue;
  const header=pdfHeaderMetadata(doc.raw_text,sourceById.get(doc.source_registry_id)?.config);
  if(header.title&&header.title!==doc.title){doc.title=header.title;repaired++;}
  if(!doc.published_at&&header.publishedAt){doc.published_at=header.publishedAt;repaired++;}
 }
 const existing=new Map(tables.documents.filter(row=>row.url).map(row=>[documentKey(row.url),row]));
 const selected=selectSources(registry,date,batch).filter(source=>group==='all'||source.cadence==='daily');
 const stats={checked:0,failed:0,discovered:0,downloaded:0,parsed:0,newDocuments:0,retried:0,removedInvalid,repaired,sourceIds:selected.map(s=>s.id),additions:[],errors:[]};
 let changed=waveMerged>0||removedInvalid>0||repaired>0;
 const attempts={daily:0,rotating:0};
 const budgets={daily:dailyMaxNew,rotating:maxNew};
 for(const source of selected){
  if(!registered.has(source.id)||!companies.has(source.entityName))throw Error(`Unregistered public source: ${source.id}`);
  let found;try{found=await discoverSource(source,fetcher);stats.checked++;}
  catch(error){stats.failed++;stats.errors.push(`${source.id}: ${String(error)}`);continue;}
  let perSource=0;
  const lane=source.cadence==='daily'?'daily':'rotating';
  // Only the newest visible items; do not slowly backfill a source's entire archive.
  const candidates=Math.min(8,Math.max(1,Number(source.config?.maxCandidates)||8));
  for(const candidate of found.slice(0,candidates)){
   if(attempts[lane]>=budgets[lane]||perSource>=Math.min(2,source.maxDocsPerRun||2))break;
   const now=date.toISOString(),company=companies.get(source.entityName);
   const key=documentKey(candidate.url);
   const previous=existing.get(key);
   if(previous&&(previous.entity_id!==company.id||previous.analyzed_at||previous.parsed_at&&previous.raw_text))continue;
   const doc=previous||{id:stableId('document:'+candidate.url),entity_id:company.id,source_registry_id:source.id,title:candidate.title,url:candidate.url,document_type:candidate.documentType,issuer:source.issuer,source_tier:1,verification_status:'verified',ingest_status:'discovered',published_at:candidate.publishedAt,created_at:now,discovered_at:now,downloaded_at:null,parsed_at:null,analyzed_at:null,raw_text:null,pages:null,metadata:{discoveryRank:candidate.rank},acquisition:{method:null,sha256:null,finalUrl:candidate.url}};
   if(previous)stats.retried++;else {existing.set(key,doc);tables.documents.push(doc);stats.discovered++;stats.newDocuments++;changed=true;}
   stats.additions.push({sourceId:source.id,title:candidate.title,url:candidate.url,publishedAt:candidate.publishedAt,retry:!!previous});
   perSource++;attempts[lane]++;
   try{
    const fetched=await fetchOfficial(candidate.url,source,fetcher);
    const sha256=hash(fetched.buffer);
    if(!doc.downloaded_at||doc.acquisition?.sha256!==sha256){
     doc.downloaded_at=now;doc.acquisition={method:'http',sha256,finalUrl:fetched.url.href};changed=true;
    }
    stats.downloaded++;
    const parsed=await parseOfficial(fetched,source,candidate.title);
    doc.raw_text=parsed.rawText;doc.pages=parsed.pages;doc.title=parsed.title;doc.published_at=parsed.publishedAt||candidate.publishedAt||doc.published_at;doc.parsed_at=now;reading[doc.id]=parsed.reading;stats.parsed++;changed=true;
   }catch(error){stats.errors.push(`${source.id} ${candidate.url}: ${String(error)}`);}
  }
 }
 if(stats.failed===selected.length&&selected.length)throw Error(`All discovery sources failed: ${stats.errors.join('; ')}`);
 if(changed&&!dryRun){
  // Do not mark an unchanged catalog fresh. Writes happen only after all validation.
  catalog.collectedAt=nowOr(date);
  if(!Buffer.from(await readFile(path('data/analysis.json'))).equals(originalAnalysis))throw Error('Reviewed analysis changed during acquisition');
  const updates=[['data/official-catalog.json',JSON.stringify(catalog)],['data/reading-content.json',JSON.stringify(reading)]];
  for(const [name,value] of updates){
   if(process.platform==='win32')await writeFile(path(name),value);
   else {await writeFile(path(name+'.tmp'),value);await rename(path(name+'.tmp'),path(name));}
  }
 }
 console.log(JSON.stringify({...stats,dryRun,wrote:changed&&!dryRun}));
 return stats;
}
const nowOr=date=>date.toISOString();
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const args=new Set(process.argv.slice(2));
 const batch=Number(process.argv.find(arg=>arg.startsWith('--batch='))?.slice(8)||12);
 const maxNew=Number(process.argv.find(arg=>arg.startsWith('--max-new='))?.slice(10)||12);
 const group=process.argv.find(arg=>arg.startsWith('--group='))?.slice(8)||'all';
 if(!Number.isInteger(batch)||batch<1||batch>80||!Number.isInteger(maxNew)||maxNew<1||maxNew>40)throw Error('Invalid run limits');
 if(!['all','daily'].includes(group))throw Error('Invalid source group');
 await refresh({batch,maxNew,group,dryRun:args.has('--dry-run')});
}

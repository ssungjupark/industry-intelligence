import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {officialUrl,fetchOfficial,discoverHtml,selectSources,stableId,refresh} from './refresh-official.mjs';

const source={id:'sample-newsroom',entityName:'Sample Inc',issuer:'Sample newsroom',enabled:true,allowedHosts:['example.com'],adapter:'html_links',discoveryUrls:['https://example.com/news'],rules:[{hrefContainsAny:['/press/'],documentType:'other',autoIngest:true}],config:{},maxDocsPerRun:2};
const index='<html><a href="/press/new-release">New release</a><a href="https://attacker.example.net/press/fake">Fake</a></html>';
const article='<html><head><meta property="article:published_time" content="2026-10-31"></head><body><article><h1>New release</h1><h2>Production update</h2><p>This official announcement contains more than two hundred characters of source text. It explains a concrete production update and provides enough material for a document page. The source material remains distinct from any AI analysis or inferred signal.</p></article></body></html>';
const fetcher=async url=>new Response(url.pathname==='/news'?index:article,{status:200,headers:{'content-type':'text/html'}});

test('official-host allowlist blocks lookalikes and redirected offsite pages',async()=>{
 assert.equal(officialUrl('/press/a',source,'https://example.com/news').href,'https://example.com/press/a');
 assert.throws(()=>officialUrl('https://example.com.evil.test/press/a',source));
 assert.throws(()=>officialUrl('http://example.com/press/a',source));
 await assert.rejects(fetchOfficial('https://example.com/news',source,async()=>new Response(null,{status:302,headers:{location:'https://example.com.evil.test/press/a'}})));
 assert.equal(discoverHtml(source,source.discoveryUrls[0],index).length,1);
});

test('daily rotation excludes reference-only sources without hardcoded companies',()=>{
 const sources=Array.from({length:5},(_,i)=>({...source,id:`source-${i}`}));
 sources[2]={...sources[2],config:{discoveryMode:'references'}};
 assert.equal(selectSources(sources,new Date('2026-11-03'),2).length,2);
 assert.equal(new Set([0,1].flatMap(i=>selectSources(sources,new Date(Date.UTC(2026,10,3+i)),2).map(s=>s.id))).size,4);
});

test('refresh adds a parsed official document once and preserves the analysis file byte for byte',async t=>{
 const directory=await mkdtemp(join(tmpdir(),'official-refresh-'));t.after(()=>rm(directory,{recursive:true,force:true}));
 await mkdir(join(directory,'data'));await mkdir(join(directory,'automation'));
 const entity={id:stableId('entity:sample'),name:source.entityName};
 const catalog={collectedAt:'2026-10-18T00:00:00.000Z',tables:{entities:[entity],source_registry:[{id:source.id}],documents:[]}};
 await writeFile(join(directory,'data/official-catalog.json'),JSON.stringify(catalog));
 await writeFile(join(directory,'data/reading-content.json'),'{}');
 const analysis='{"tables":{"signals":[],"evidence_segments":[]}}';
 await writeFile(join(directory,'data/analysis.json'),analysis);
 await writeFile(join(directory,'automation/source-registry.json'),JSON.stringify([source]));
 const first=await refresh({directory,date:new Date('2026-11-03T00:00:00Z'),fetcher});
 assert.deepEqual([first.newDocuments,first.downloaded,first.parsed],[1,1,1]);
 const updated=JSON.parse(await readFile(join(directory,'data/official-catalog.json'),'utf8'));
 assert.equal(updated.tables.documents.length,1);
 assert.equal(updated.tables.documents[0].parsed_at,'2026-11-03T00:00:00.000Z');
 assert.equal(updated.tables.documents[0].analyzed_at,null);
 assert.equal(updated.tables.documents[0].published_at,'2026-10-31T00:00:00.000Z');
 assert.equal((await readFile(join(directory,'data/analysis.json'),'utf8')),analysis);
 const second=await refresh({directory,date:new Date('2026-11-04T00:00:00Z'),fetcher});
 assert.equal(second.newDocuments,0);
 assert.equal(second.parsed,0);
 assert.equal(JSON.parse(await readFile(join(directory,'data/official-catalog.json'),'utf8')).collectedAt,'2026-11-03T00:00:00.000Z');
});

test('failed download stays discovered and retries on next run',async t=>{
 const directory=await mkdtemp(join(tmpdir(),'official-retry-'));t.after(()=>rm(directory,{recursive:true,force:true}));
 await mkdir(join(directory,'data'));await mkdir(join(directory,'automation'));
 await writeFile(join(directory,'data/official-catalog.json'),JSON.stringify({collectedAt:'2026-10-18T00:00:00Z',tables:{entities:[{id:'company-id',name:source.entityName}],source_registry:[{id:source.id}],documents:[]}}));
 await writeFile(join(directory,'data/reading-content.json'),'{}');
 await writeFile(join(directory,'data/analysis.json'),'{}');
 await writeFile(join(directory,'automation/source-registry.json'),JSON.stringify([source]));
 const broken=async url=>url.pathname==='/news'?new Response(index,{status:200,headers:{'content-type':'text/html'}}):new Response('Denied',{status:403});
 const first=await refresh({directory,date:new Date('2026-11-03T00:00:00Z'),fetcher:broken});
 assert.deepEqual([first.discovered,first.downloaded,first.parsed],[1,0,0]);
 const second=await refresh({directory,date:new Date('2026-11-04T00:00:00Z'),fetcher});
 assert.deepEqual([second.newDocuments,second.retried,second.parsed],[0,1,1]);
 const rows=JSON.parse(await readFile(join(directory,'data/official-catalog.json'),'utf8')).tables.documents;
 assert.equal(rows.length,1);assert.ok(rows[0].raw_text.includes('official announcement'));
});

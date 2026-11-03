import dataset from '../data/official-catalog.json';
import readingDataset from '../data/reading-content.json';
import analysisDataset from '../data/analysis.json';
import coverageWave from '../data/coverage-wave.json';
import coverageWaveReading from '../data/coverage-wave-reading.json';
export const productRepositoryConfigured=()=>true;
// Versioned official originals and separately verified derived analysis; no AI credentials.
const base=dataset.tables as unknown as Record<string,Array<Record<string,unknown>>>;
for(const [name,rows] of Object.entries(coverageWave.tables)){
 const target=base[name];if(!target)throw new Error('Unknown coverage table');
 const key=(row:Record<string,unknown>)=>name==='entity_industries'?String(row.entity_id)+'|'+String(row.industry_id):String(row.id);
 const seen=new Set(target.map(key));
 for(const row of rows as Array<Record<string,unknown>>)if(!seen.has(key(row))){target.push(row);seen.add(key(row));}
}
const analysis=analysisDataset.tables as unknown as Record<string,Array<Record<string,unknown>>>;
const patches=new Map(analysis.documents.map(d=>[String(d.id),d]));
const tables={...base,...analysis,documents:base.documents.map(d=>{const patch=patches.get(String(d.id));return patch?{...d,...patch,metadata:{...(d.metadata as Record<string,unknown>),...(patch.metadata as Record<string,unknown>)}}:d;})};
export async function readRows<T>(table:string,filter:Record<string,string>={},scope?:{column:string;ids:string[]},since?:{column:string;value:string},columns='*'):Promise<T[]> {
 if(!Object.hasOwn(tables,table))throw new Error('Unsupported public repository table');
 const rows=(tables as Record<string,Array<Record<string,unknown>>>)[table].filter(r=>Object.entries(filter).every(([key,value])=>String(r[key])===value)&&(!scope||scope.ids.includes(String(r[scope.column])))&&(!since||typeof r[since.column]==='string'&&String(r[since.column])>=since.value));
 return rows.map(r=>columns==='*'?(table==='documents'&&filter.id?{...r,reading_content:(readingDataset as Record<string,unknown>)[String(r.id)]||(coverageWaveReading as Record<string,unknown>)[String(r.id)]||null}:r):Object.fromEntries(columns.split(',').map(key=>[key,r[key]]))) as T[];
}

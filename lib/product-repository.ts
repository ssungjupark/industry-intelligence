import dataset from '../data/official-catalog.json';
export const productRepositoryConfigured=()=>true;
// Immutable official acquisition repository. No credentials, database facade or mutations.
export async function readRows<T>(table:string,filter:Record<string,string>={},scope?:{column:string;ids:string[]},since?:{column:string;value:string},columns='*'):Promise<T[]> {
 const tables=dataset.tables as unknown as Record<string,Array<Record<string,unknown>>>;
 if(!Object.hasOwn(tables,table))throw new Error('Unsupported public repository table');
 const rows=tables[table].filter(r=>Object.entries(filter).every(([key,value])=>String(r[key])===value)&&(!scope||scope.ids.includes(String(r[scope.column])))&&(!since||typeof r[since.column]==='string'&&String(r[since.column])>=since.value));
 return rows.map(r=>columns==='*'?r:Object.fromEntries(columns.split(',').map(key=>[key,r[key]]))) as T[];
}

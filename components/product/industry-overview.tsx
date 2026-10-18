import type {ProductData} from '@/lib/product-data';
import {ChangeFeed} from './changes';
import {CompanyTable} from './company-table';
import {CatalystAgenda} from './catalyst-agenda';
import {SourceDocuments} from './source-documents';

export function IndustryOverview({data}:{data:ProductData}) {
 return <>
  {data.changes.length>0&&<ChangeFeed changes={data.changes} title="Recent Changes"/>}
  <CompanyTable companies={data.members}/>
  <CatalystAgenda companies={data.members}/>
  <SourceDocuments documents={data.documents} companies={data.companies} briefs={data.briefs}/>
 </>;
}

import type {ProductData} from '@/lib/product-data';
import {ChangeFeed} from './changes';
import {CompanyTable} from './company-table';
import {CatalystAgenda} from './catalyst-agenda';
import {SourceDocuments} from './source-documents';
import {PublicationTimeline} from './publication-timeline';

export function IndustryOverview({data}:{data:ProductData}) {
 return <>
  {data.changes.length>0&&<ChangeFeed changes={data.changes}/>}
  <PublicationTimeline documents={data.documents} companies={data.companies}/>
  <CompanyTable companies={data.members}/>
  <CatalystAgenda companies={data.members}/>
  <SourceDocuments context="industry" documents={data.documents} companies={data.companies} briefs={data.briefs}/>
 </>;
}

import type {Metadata} from 'next';
import './globals.css';
import {ProductShell} from '@/components/product/shell';
import catalog from '@/data/official-catalog.json';
import analysis from '@/data/analysis.json';
export const metadata:Metadata={title:'Industry Intelligence',description:'산업별 주요 기업과 공식자료 원문',robots:{index:false,follow:false}};
export default function Layout({children}:{children:React.ReactNode}){const date=catalog.collectedAt?.slice(0,10)||'—';const analyzed=analysis.tables.documents.length;return <html lang="ko"><body><ProductShell workspace={false}><p className="dev-note">공식자료 기준 {date} · {analyzed?`한국어 분석 ${analyzed}건`:'AI 분석 미연결'}</p>{children}</ProductShell></body></html>;}

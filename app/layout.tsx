import type {Metadata} from 'next';
import './globals.css';
import {ProductShell} from '@/components/product/shell';
export const metadata:Metadata={title:'Industry Intelligence',description:'산업별 주요 기업과 공식자료 원문',robots:{index:false,follow:false}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ko"><body><ProductShell workspace={false}><p className="dev-note">공식자료 기준 2026-10-16 · AI 분석 미연결</p>{children}</ProductShell></body></html>;}

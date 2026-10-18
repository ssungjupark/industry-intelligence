"use client";
import Link from "@/lib/site-link";
import { usePathname } from "next/navigation";
export function ProductShell({children,workspace=true}:{children:React.ReactNode;workspace?:boolean}) {
 const path=usePathname();
 return <div className="product-shell"><aside className="product-nav"><Link className="product-brand" href="/">Industry Intelligence</Link><nav>{[["/","Home"],["/industries","Industries"],["/companies","Companies"],["/search","Search"]].map(([href,label])=><Link key={href} href={href} aria-current={(href==="/"?path==="/":path.startsWith(href))?"page":undefined}>{label}</Link>)}</nav>{workspace&&<Link className="workspace-link" href="/admin/sources">Workspace ↗</Link>}</aside><main className="product-main">{process.env.NODE_ENV==="development"&&<small className="dev-note">Development environment</small>}{children}</main></div>;
}


import {Activity,Factory,PackageCheck,ShieldCheck,ShoppingCart,Waves} from 'lucide-react'
import type {ReactNode} from 'react'
import './section-hero.css'

type Section='reception'|'production'|'quality'|'inventory'|'sales'|'neutral'

function normalize(value:string){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
function sectionFor(title:string):Section{
 const value=normalize(title)
 if(value.includes('recep'))return 'reception'
 if(value.includes('produ'))return 'production'
 if(value.includes('regulator')||value.includes('calidad')||value.includes('quality'))return 'quality'
 if(value.includes('invent'))return 'inventory'
 if(value.includes('orden')||value.includes('venta')||value.includes('sales'))return 'sales'
 return 'neutral'
}
function Mark({section}:{section:Section}){
 const Icon=section==='reception'?Activity:section==='production'?Factory:section==='quality'?ShieldCheck:section==='inventory'?PackageCheck:section==='sales'?ShoppingCart:Waves
 return <span className="section-hero-mark" aria-hidden="true"><Icon/></span>
}

export function PageHeader({eyebrow,title,description,actions}:{eyebrow:string;title:string;description:string;actions?:ReactNode}){
 const section=sectionFor(title)
 return <header className="page-header section-hero" data-section={section}>
  <div><span className="overline teal">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>
  <Mark section={section}/>
  {actions?<div className="page-actions">{actions}</div>:null}
 </header>
}

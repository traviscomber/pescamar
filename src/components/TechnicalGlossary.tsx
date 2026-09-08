import {BookOpenText} from 'lucide-react'
import type {Locale} from '../i18n'
import {technicalTerms,type TechnicalTermId} from '../technicalTerms'

export function TechnicalGlossary({locale,terms,title}:{locale:Locale;terms:readonly TechnicalTermId[];title?:string}){
 const en=locale==='en'
 return <section className="panel" aria-label={en?'Technical terms explained':'Términos técnicos explicados'}>
  <div className="section-heading"><div><span className="overline teal">{en?'Plain language':'Lenguaje simple'}</span><h2>{title??(en?'What do these abbreviations mean?':'¿Qué significan estas siglas?')}</h2></div><BookOpenText size={18}/></div>
  <div className="compact-ledger">{terms.map(id=>{const term=technicalTerms[id];return <div className="alert-row static" key={id}><span className="os-module-step">{term.code}</span><div><b>{term.name[locale]}</b><small>{term.plain[locale]}</small><p className="source-note">{term.use[locale]}</p></div></div>})}</div>
 </section>
}

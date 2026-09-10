import {ArrowRight,Sparkles} from 'lucide-react'
import {Link} from 'react-router-dom'
import {useLocale} from '../i18n'

type Props={
  state:string
  action:string
  reason:string
  assistantLabel?:string
  assistantPrompt?:string
  plantId?:string|null
  receptionId?:string|null
  source?:string
}

export function ContextualGuidance({state,action,reason,assistantLabel,assistantPrompt,plantId,receptionId,source}:Props){
  const {locale}=useLocale()
  const isEs=locale==='es'
  const params=new URLSearchParams()
  if(assistantPrompt)params.set('prompt',assistantPrompt)
  if(plantId)params.set('plantId',plantId)
  if(receptionId)params.set('receptionId',receptionId)
  if(source)params.set('source',source)
  const assistantTo=params.size?`/pescamar-ia?${params.toString()}`:'/pescamar-ia'
  const assistantText=assistantLabel??(isEs?'Preguntar por este contexto':'Ask about this context')
  return <section className="contextual-guidance" aria-label={isEs?'Ayuda para continuar':'Guidance to continue'}>
    <div><small>{isEs?'Ahora':'Now'}</small><b>{state}</b></div>
    <div><small>{isEs?'Haz esto':'Do this'}</small><b>{action}</b></div>
    <div><small>{isEs?'Por qué':'Why'}</small><span>{reason}</span></div>
    <Link className="contextual-guidance-ai" to={assistantTo}><Sparkles size={15}/>{assistantText}<ArrowRight size={14}/></Link>
  </section>
}

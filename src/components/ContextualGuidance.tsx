import {ArrowRight,Sparkles} from 'lucide-react'
import {Link} from 'react-router-dom'

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

export function ContextualGuidance({state,action,reason,assistantLabel='Preguntar por este contexto',assistantPrompt,plantId,receptionId,source}:Props){
  const params=new URLSearchParams()
  if(assistantPrompt)params.set('prompt',assistantPrompt)
  if(plantId)params.set('plantId',plantId)
  if(receptionId)params.set('receptionId',receptionId)
  if(source)params.set('source',source)
  const assistantTo=params.size?`/pescamar-ia?${params.toString()}`:'/pescamar-ia'
  return <section className="contextual-guidance" aria-label="Ayuda para continuar">
    <div><small>Ahora</small><b>{state}</b></div>
    <div><small>Haz esto</small><b>{action}</b></div>
    <div><small>Por qué</small><span>{reason}</span></div>
    <Link className="contextual-guidance-ai" to={assistantTo}><Sparkles size={15}/>{assistantLabel}<ArrowRight size={14}/></Link>
  </section>
}

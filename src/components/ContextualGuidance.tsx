import {ArrowRight,Sparkles} from 'lucide-react'
import {Link} from 'react-router-dom'

export function ContextualGuidance({state,action,reason,assistantPrompt,assistantLabel='Preguntar por este contexto'}:{state:string;action:string;reason:string;assistantPrompt?:string;assistantLabel?:string}){
  const assistantTo=assistantPrompt?`/pescamar-ia?prompt=${encodeURIComponent(assistantPrompt)}`:null
  return <section className="contextual-guidance" aria-label="Ayuda para continuar">
    <div><small>Ahora</small><b>{state}</b></div>
    <div><small>Haz esto</small><b>{action}</b></div>
    <div><small>Por qué</small><span>{reason}</span></div>
    {assistantTo?<Link className="contextual-guidance-ai" to={assistantTo}><Sparkles size={15}/>{assistantLabel}<ArrowRight size={14}/></Link>:null}
  </section>
}

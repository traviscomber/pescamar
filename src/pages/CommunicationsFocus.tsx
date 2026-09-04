import {AlertTriangle,CheckCircle2,MessageCircleMore,Sparkles} from 'lucide-react'
import {useEffect,useMemo,useState} from 'react'
import {Link} from 'react-router-dom'
import {PageHeader} from '../components/PageHeader'

type Message={id:string;insight_id:string|null;insight_status:string|null;severity:string|null;summary:string|null;proposed_action:string|null;channel_name:string|null;sender_name:string|null;occurred_at:string}
type Payload={messages?:Message[];error?:string}

export function CommunicationsFocus(){
  const [data,setData]=useState<Payload|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('')
  useEffect(()=>{let live=true;(async()=>{try{const r=await fetch('/api/communications',{cache:'no-store'}),p=await r.json() as Payload;if(!r.ok)throw new Error(p.error??'No fue posible cargar comunicaciones');if(live)setData(p)}catch(e){if(live)setError(e instanceof Error?e.message:'No fue posible cargar comunicaciones')}finally{if(live)setLoading(false)}})();return()=>{live=false}},[])
  const messages=data?.messages??[]
  const pending=useMemo(()=>messages.filter(m=>m.insight_status==='pending'),[messages])
  const raw=useMemo(()=>messages.filter(m=>!m.insight_id),[messages])
  const critical=useMemo(()=>pending.find(m=>m.severity==='critical'||m.severity==='high')??pending[0]??null,[pending])
  const state=error?'Conexión pendiente':critical?'Requiere validación':raw.length?'Mensajes por interpretar':messages.length?'Comunicaciones al día':'Sin mensajes live'
  const title=critical?.summary??(raw.length?`${raw.length} mensaje${raw.length===1?'':'s'} sin interpretar`:messages.length?'No hay decisiones pendientes':'La estructura está lista para recibir mensajes')
  const action=critical?.proposed_action??(raw.length?'Interpretar mensajes pendientes':messages.length?'No necesitas intervenir':'Activar sincronización cuando corresponda')
  return <>
    <PageHeader eyebrow="Comunicaciones" title="Qué requiere atención" description="Sólo muestra mensajes que necesitan una decisión. La evidencia RAW, directorio y canales permanecen disponibles en detalle."/>
    {loading?<div className="system-banner">Sincronizando comunicaciones…</div>:null}
    <section className="panel decision-focus">
      <div className="section-heading"><div><span className="overline">Estado</span><h2>{state}</h2></div>{critical?<AlertTriangle size={22}/>:<CheckCircle2 size={22}/>}</div>
      <div className="decision-copy"><b>{title}</b><p>{action}</p></div>
      <div className="signal-grid compact-signals">
        <article className="signal-card"><span><AlertTriangle size={15}/>Por validar</span><b>{pending.length}</b></article>
        <article className="signal-card"><span><Sparkles size={15}/>Sin interpretar</span><b>{raw.length}</b></article>
        <article className="signal-card"><span><MessageCircleMore size={15}/>Mensajes</span><b>{messages.length}</b></article>
      </div>
      <div className="page-actions">
        <Link className="button primary" to="/comunicaciones/detalle">{critical?'Resolver prioridad':raw.length?'Interpretar':'Ver comunicaciones'}</Link>
        <Link className="button" to="/pescamar-ia">Abrir Inteligencia</Link>
      </div>
      {error?<small className="source-note">Live pendiente: {error}</small>:null}
    </section>
  </>
}

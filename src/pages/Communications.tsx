import {AlertTriangle,Building2,CheckCircle2,MessageCircleMore,RefreshCw,Sparkles,Users} from 'lucide-react'
import {useEffect,useMemo,useState} from 'react'
import {useSearchParams} from 'react-router-dom'
import {communicationPeople,communicationSources} from '../communicationsDirectory'
import {LotModuleContext} from '../components/LotModuleContext'
import {PageHeader} from '../components/PageHeader'

type Channel={id:string;name:string;category:string;plant_id:string|null;counterparty:string|null;message_count:number|string;pending_count:number|string;last_message_at:string|null}
type Message={id:string;channel_name:string|null;channel_category:string|null;plant_id:string|null;sender_name:string|null;direction:'incoming'|'outgoing';message_type:string;text_body:string|null;media:unknown[];occurred_at:string;insight_id:string|null;insight_category:string|null;severity:string|null;summary:string|null;proposed_action:string|null;confidence:number|string|null;insight_status:string|null}
type Payload={channels?:Channel[];messages?:Message[];permissions?:{canReview:boolean};error?:string}
const dt=(v:string)=>new Intl.DateTimeFormat('es-CL',{dateStyle:'medium',timeStyle:'short'}).format(new Date(v))
const title=(value:string)=>value.charAt(0).toUpperCase()+value.slice(1)

export function Communications(){
  const [params]=useSearchParams(),requestedReceptionId=params.get('receptionId')
  const [data,setData]=useState<Payload|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[filter,setFilter]=useState('all'),[busy,setBusy]=useState('')
  async function load(){setLoading(true);try{const r=await fetch('/api/communications',{cache:'no-store'}),p=await r.json() as Payload;if(!r.ok)throw new Error(p.error??'No fue posible cargar comunicaciones');setData(p);setError('')}catch(e){setError(e instanceof Error?e.message:'No fue posible cargar comunicaciones')}finally{setLoading(false)}}
  useEffect(()=>{void load()},[])
  const liveChannels=data?.channels??[],messages=data?.messages??[]
  const channelByName=new Map(liveChannels.map(c=>[c.name.toLowerCase(),c]))
  const sources=communicationSources.map(source=>({source,live:channelByName.get(source.name.toLowerCase())??null}))
  const counterparties=useMemo(()=>Array.from(new Set(communicationSources.map(s=>s.counterparty).filter((v):v is string=>Boolean(v)))).sort((a,b)=>a.localeCompare(b,'es')),[ ])
  const visible=useMemo(()=>filter==='all'?messages:filter==='pending'?messages.filter(m=>m.insight_status==='pending'):messages.filter(m=>(m.insight_category??m.channel_category)===filter),[filter,messages])
  const pending=messages.filter(m=>m.insight_status==='pending').length,newCount=messages.filter(m=>!m.insight_id).length
  async function act(body:Record<string,unknown>,key:string){setBusy(key);try{const r=await fetch('/api/communications',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),p=await r.json() as {error?:string};if(!r.ok)throw new Error(p.error??'No fue posible procesar');await load()}catch(e){setError(e instanceof Error?e.message:'No fue posible procesar')}finally{setBusy('')}}
  return <>
    <PageHeader eyebrow="WhatsApp Intelligence" title="Comunicaciones" description="Red de personas, contrapartes y grupos operacionales. Cada fuente tiene un propósito de inteligencia definido antes de transformar mensajes en datos de la Base Pescamar." actions={<button className="button" onClick={()=>void load()}><RefreshCw size={15}/>Actualizar</button>}/>
    <LotModuleContext current="communications" receptionId={requestedReceptionId} label={requestedReceptionId?'Lote seleccionado':null} detail={requestedReceptionId?'Las comunicaciones vinculadas al lote aparecerán aquí cuando el mensaje tenga referencia verificable de lote, guía o recepción.':null}/>
    {error?<div className="system-banner">Catálogo base disponible · conexión live pendiente: {error}</div>:null}
    {loading?<div className="system-banner">Sincronizando comunicaciones…</div>:null}

    <section className="signal-grid communication-overview">
      <article className="signal-card"><span><MessageCircleMore size={16}/>Grupos mapeados</span><b>{communicationSources.length}</b><small>Fuentes identificadas desde WhatsApp real</small></article>
      <article className="signal-card"><span><Users size={16}/>Personas</span><b>{communicationPeople.length}</b><small>Identificadas por nombre · rol por confirmar</small></article>
      <article className="signal-card"><span><Building2 size={16}/>Contrapartes</span><b>{counterparties.length}</b><small>Clientes, proveedores y socios logísticos</small></article>
      <article className="signal-card"><span><Sparkles size={16}/>Sin interpretar</span><b>{newCount}</b><small>Mensajes RAW pendientes de inteligencia</small></article>
      <article className="signal-card"><span><AlertTriangle size={16}/>Requieren validación</span><b>{pending}</b><small>Insights que todavía no son dato confirmado</small></article>
    </section>

    <section className="communications-directory-grid">
      <article className="panel people-directory">
        <div className="section-heading"><div><span className="overline">Red humana</span><h2>Personas identificadas</h2></div><span>{communicationPeople.length} perfiles base</span></div>
        <div className="people-list">{communicationPeople.map(person=><div className="person-row" key={person.name}><span className="person-avatar">{person.name.split(' ').map(v=>v[0]).slice(0,2).join('').toUpperCase()}</span><div><b>{person.name}</b><small>{person.context}</small><em>{person.source}</em></div><span className="status info">Rol por confirmar</span></div>)}</div>
      </article>
      <article className="panel counterpart-directory">
        <div className="section-heading"><div><span className="overline">Ecosistema</span><h2>Contrapartes detectadas</h2></div><span>{counterparties.length} relaciones</span></div>
        <div className="counterparty-cloud">{counterparties.map(name=><span key={name}>{name}</span>)}</div>
        <p className="source-note">La relación se toma del nombre visible del grupo. Cliente, proveedor o rol contractual se confirma con mensajes y documentos antes de quedar en la Base Pescamar.</p>
      </article>
    </section>

    <section className="panel communications-channels">
      <div className="section-heading"><div><span className="overline">Mapa de fuentes e inteligencia</span><h2>Qué debe entender Pescamar de cada grupo</h2></div><span>{sources.length} grupos clasificados</span></div>
      <div className="intelligence-source-grid">{sources.map(({source,live})=><button key={source.name} className="intelligence-source-card" onClick={()=>setFilter(source.category)}><header><div><b>{source.name}</b><small>{title(source.category)}{source.plantId?` · ${source.plantId}`:''}</small></div><span className={`live-source-dot ${live?'connected':'mapped'}`}>{live?'LIVE':'MAP'}</span></header><p>{source.module}</p>{source.counterparty?<em>{source.counterparty}</em>:null}<div>{source.signals.map(signal=><span key={signal}>{signal}</span>)}</div><footer>{live?`${Number(live.message_count)} mensajes · ${Number(live.pending_count)} pendientes`:'Catálogo listo · esperando sincronización'}</footer></button>)}</div>
    </section>

    <section className="panel communications-inbox">
      <div className="section-heading"><div><span className="overline">Bandeja de inteligencia</span><h2>Interpretación y validación</h2></div><div className="event-kind-tabs">{['all','pending','operacion','produccion','calidad','abastecimiento','comercial','logistica','finanzas','personas'].map(v=><button key={v} className={filter===v?'active':''} onClick={()=>setFilter(v)}>{v==='all'?'Todos':v==='pending'?'Pendientes':title(v)}</button>)}</div></div>
      {visible.length?<div className="communication-list">{visible.map(m=><article key={m.id} className={`communication-row ${m.severity??''}`}><div className="communication-source"><span>{m.direction==='incoming'?'IN':'OUT'}</span><div><b>{m.channel_name??'Canal sin mapear'}</b><small>{m.sender_name??'Remitente'} · {dt(m.occurred_at)}</small></div></div><div className="communication-body"><p>{m.text_body||`Adjunto ${m.message_type}`}</p><small>{Array.isArray(m.media)&&m.media.length?`${m.media.length} adjunto(s) · `:''}{m.plant_id?`Planta ${m.plant_id}`:'Sin planta asignada'}</small>{m.insight_id?<div className="insight-box"><span><Sparkles size={14}/>{m.insight_category}</span><b>{m.summary}</b><small>{m.proposed_action} · confianza {(Number(m.confidence??0)*100).toFixed(0)}%</small></div>:null}</div><div className="communication-actions">{!m.insight_id?<button className="button compact" disabled={busy===m.id} onClick={()=>void act({action:'interpret',messageId:m.id},m.id)}><Sparkles size={14}/>{busy===m.id?'Analizando…':'Interpretar'}</button>:m.insight_status==='pending'&&data?.permissions?.canReview?<><button className="button compact" disabled={!!busy} onClick={()=>void act({action:'review',insightId:m.insight_id,status:'rejected'},`r-${m.id}`)}>Descartar</button><button className="button compact primary" disabled={!!busy} onClick={()=>void act({action:'review',insightId:m.insight_id,status:'confirmed'},`c-${m.id}`)}><CheckCircle2 size={14}/>Confirmar</button></>:<span className={`status ${m.insight_status==='confirmed'?'success':'info'}`}>{m.insight_status??'RAW'}</span>}</div></article>)}</div>:<div className="empty-state"><MessageCircleMore size={28}/><h3>Catálogo listo; todavía no hay mensajes live</h3><p>La estructura de personas, grupos y señales ya está cargada. Al activar GREEN-API, los mensajes se incorporarán a esta bandeja y conservarán su evidencia RAW.</p></div>}
    </section>
  </>
}

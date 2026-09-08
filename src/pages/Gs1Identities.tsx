import {Database,ExternalLink,RefreshCw,ShieldCheck} from 'lucide-react'
import {useCallback,useEffect,useState} from 'react'
import {PageHeader} from '../components/PageHeader'
import {useLocale} from '../i18n'

type Status='candidate'|'confirmed'|'rejected'
type KeyType='gtin'|'gln_location'|'gln_party'|'sscc'
type Identity={id:string;keyType:KeyType;value:string;entityType:string;entityLabel:string|null;status:Status;sourceSystem:string;sourceReference:string;reviewedAt:string|null;reviewNote:string|null;valid:boolean;referenceUri:string|null}
type Payload={schemaReady?:boolean;standardVersion?:string;summary?:Record<string,number>;identities?:Identity[];message?:string;error?:string}
const statusEs:Record<Status,string>={candidate:'Candidato',confirmed:'Confirmado',rejected:'Rechazado'}
const statusEn:Record<Status,string>={candidate:'Candidate',confirmed:'Confirmed',rejected:'Rejected'}
const keyLabel:Record<KeyType,string>={gtin:'GTIN',gln_location:'GLN · ubicación',gln_party:'GLN · parte',sscc:'SSCC'}
const entityEs:Record<string,string>={packing_spec:'Especificación de packing',plant:'Planta',inventory_location:'Ubicación',party:'Proveedor / cliente',pallet:'Pallet'}
const entityEn:Record<string,string>={packing_spec:'Packing specification',plant:'Plant',inventory_location:'Location',party:'Supplier / customer',pallet:'Pallet'}

export function Gs1Identities(){
 const {locale}=useLocale(),en=locale==='en'
 const [payload,setPayload]=useState<Payload>({}),[loading,setLoading]=useState(true),[error,setError]=useState('')
 const load=useCallback(async()=>{setLoading(true);setError('');try{const response=await fetch('/api/gs1-identities',{cache:'no-store'});const body=await response.json() as Payload;if(!response.ok)throw new Error(body.error??(en?'Could not load GS1 identities':'No fue posible cargar identidades GS1'));setPayload(body)}catch(cause){setError(cause instanceof Error?cause.message:(en?'Could not load GS1 identities':'No fue posible cargar identidades GS1'))}finally{setLoading(false)}},[en])
 useEffect(()=>{void load()},[load])
 const identities=payload.identities??[],summary=payload.summary??{},statusLabel=en?statusEn:statusEs,entityLabel=en?entityEn:entityEs
 const rules=en?[
  ['GTIN','AI 01 · 14 digits','Packing specification'],['GLN · physical location','AI 414 · 13 digits','Plant / inventory location'],['GLN · party','AI 417 · 13 digits','Supplier / customer'],['SSCC','AI 00 · 18 digits','Pallet'],
 ]:[
  ['GTIN','AI 01 · 14 dígitos','Especificación de packing'],['GLN · ubicación física','AI 414 · 13 dígitos','Planta / ubicación de inventario'],['GLN · parte','AI 417 · 13 dígitos','Proveedor / cliente'],['SSCC','AI 00 · 18 dígitos','Pallet'],
 ]
 return <>
  <PageHeader eyebrow="Seafood Intelligence OS · GS1" title={en?'GS1 identities':'Identidades GS1'} description={en?'Read-only registry for evidence-backed external identities. Internal IDs are never converted into GS1 identifiers.':'Registro read-only de identidades externas respaldadas por evidencia. Los IDs internos nunca se convierten en identificadores GS1.'} actions={<button className="button secondary" type="button" onClick={()=>void load()} disabled={loading}><RefreshCw size={15}/>{loading?(en?'Refreshing…':'Actualizando…'):(en?'Refresh':'Actualizar')}</button>}/>
  {error?<div className="notice error" role="alert">{error}</div>:null}
  {!payload.schemaReady&&!loading?<div className="notice"><ShieldCheck size={15}/>{en?'Migration 052 is not applied to this database yet. No GS1 identifiers are inferred or generated.':'La migración 052 aún no está aplicada en esta base. No se infieren ni generan identificadores GS1.'}</div>:null}
  <section className="signal-grid"><Metric label={en?'Registered':'Registrados'} value={Number(summary.total??0)}/><Metric label={en?'Confirmed':'Confirmados'} value={Number(summary.confirmed??0)}/><Metric label={en?'Candidates':'Candidatos'} value={Number(summary.candidate??0)}/><Metric label={en?'Rejected':'Rechazados'} value={Number(summary.rejected??0)}/></section>
  <section className="panel"><div className="section-heading"><div><span className="overline teal">GS1 Digital Link {payload.standardVersion??'1.7.0'}</span><h2>{en?'Identity contract':'Contrato de identidad'}</h2></div><span className="status info">read-only foundation</span></div><div className="os-stage-modules">{rules.map(([key,rule,target],index)=><div className="alert-row static" key={key}><span className="os-module-step">{String(index+1).padStart(2,'0')}</span><div><b>{key}</b><small>{rule} · {target}</small></div></div>)}</div><div className="governance-note"><ShieldCheck size={19}/><div><b>{en?'Evidence first. Human confirmation remains authoritative.':'Evidencia primero. La confirmación humana mantiene la autoridad.'}</b><p>{en?'A valid checksum only validates identifier structure; it does not prove ownership, assignment or regulatory validity.':'Un checksum válido sólo valida la estructura del identificador; no demuestra propiedad, asignación ni validez regulatoria.'}</p></div></div></section>
  <section className="panel"><div className="section-heading"><div><span className="overline teal">Registry</span><h2>{en?'External identities':'Identidades externas'}</h2></div><span>{loading?(en?'Checking…':'Verificando…'):`${identities.length} ${en?'records':'registros'}`}</span></div>{!loading&&!identities.length?<div className="empty-state"><Database size={24}/><span>{payload.message??(en?'No real GS1 identifiers have been registered yet.':'Todavía no hay identificadores GS1 reales registrados.')}</span></div>:<div className="table-scroll"><table className="data-table"><thead><tr><th>{en?'Key':'Clave'}</th><th>{en?'Identifier':'Identificador'}</th><th>{en?'Internal entity':'Entidad interna'}</th><th>{en?'Evidence source':'Fuente de evidencia'}</th><th>{en?'Status':'Estado'}</th></tr></thead><tbody>{identities.map(item=><tr key={item.id}><td><b>{keyLabel[item.keyType]}</b><small>{entityLabel[item.entityType]??item.entityType}</small></td><td><b>{item.value}</b>{item.referenceUri?<a href={item.referenceUri} target="_blank" rel="noreferrer">Digital Link <ExternalLink size={12}/></a>:null}</td><td>{item.entityLabel??(en?'Unresolved label':'Etiqueta no resuelta')}</td><td><b>{item.sourceSystem}</b><small>{item.sourceReference}</small></td><td><span className={`status-pill ${item.status}`}>{statusLabel[item.status]}</span></td></tr>)}</tbody></table></div>}</section>
  <div className="notice"><ShieldCheck size={15}/>{en?'This registry does not make Seafood Intelligence OS GDST Capable and does not enable EPCIS writes or a Digital Link Resolver.':'Este registro no convierte Seafood Intelligence OS en GDST Capable ni habilita escrituras EPCIS o un Digital Link Resolver.'}</div>
 </>
}
function Metric({label,value}:{label:string;value:number}){return <article className="signal-card"><span>{label}</span><b>{value.toLocaleString('es-CL')}</b><small>GS1 identity registry</small></article>}

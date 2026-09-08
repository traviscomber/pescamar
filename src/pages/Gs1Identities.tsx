import {Database,ExternalLink,RefreshCw,ShieldCheck} from 'lucide-react'
import {useCallback,useEffect,useState} from 'react'
import {PageHeader} from '../components/PageHeader'
import {TechnicalGlossary} from '../components/TechnicalGlossary'
import {useLocale} from '../i18n'

type Status='candidate'|'confirmed'|'rejected'
type KeyType='gtin'|'gln_location'|'gln_party'|'sscc'
type Identity={id:string;keyType:KeyType;value:string;entityType:string;entityLabel:string|null;status:Status;sourceSystem:string;sourceReference:string;reviewedAt:string|null;reviewNote:string|null;valid:boolean;referenceUri:string|null}
type Payload={schemaReady?:boolean;standardVersion?:string;summary?:Record<string,number>;identities?:Identity[];message?:string;error?:string}
const statusEs:Record<Status,string>={candidate:'Por confirmar',confirmed:'Confirmado',rejected:'Rechazado'}
const statusEn:Record<Status,string>={candidate:'Needs confirmation',confirmed:'Confirmed',rejected:'Rejected'}
const keyLabel:Record<KeyType,string>={gtin:'Producto (GTIN)',gln_location:'Ubicación (GLN)',gln_party:'Empresa / parte (GLN)',sscc:'Pallet / unidad logística (SSCC)'}
const keyLabelEn:Record<KeyType,string>={gtin:'Product (GTIN)',gln_location:'Location (GLN)',gln_party:'Company / party (GLN)',sscc:'Pallet / logistics unit (SSCC)'}
const entityEs:Record<string,string>={packing_spec:'Especificación de packing',plant:'Planta',inventory_location:'Ubicación',party:'Proveedor / cliente',pallet:'Pallet'}
const entityEn:Record<string,string>={packing_spec:'Packing specification',plant:'Plant',inventory_location:'Location',party:'Supplier / customer',pallet:'Pallet'}

export function Gs1Identities(){
 const {locale}=useLocale(),en=locale==='en'
 const [payload,setPayload]=useState<Payload>({}),[loading,setLoading]=useState(true),[error,setError]=useState('')
 const load=useCallback(async()=>{setLoading(true);setError('');try{const response=await fetch('/api/gs1-identities',{cache:'no-store'});const body=await response.json() as Payload;if(!response.ok)throw new Error(body.error??(en?'Could not load GS1 identities':'No fue posible cargar identidades GS1'));setPayload(body)}catch(cause){setError(cause instanceof Error?cause.message:(en?'Could not load GS1 identities':'No fue posible cargar identidades GS1'))}finally{setLoading(false)}},[en])
 useEffect(()=>{void load()},[load])
 const identities=payload.identities??[],summary=payload.summary??{},statusLabel=en?statusEn:statusEs,entityLabel=en?entityEn:entityEs,identityLabel=en?keyLabelEn:keyLabel
 const rules=en?[
  ['Global product code (GTIN)','GS1 application identifier (AI) 01 · 14 digits','Identifies one commercial product or packing specification.'],
  ['Global physical-location code (GLN)','GS1 application identifier (AI) 414 · 13 digits','Identifies a plant or inventory location.'],
  ['Global company / party code (GLN)','GS1 application identifier (AI) 417 · 13 digits','Identifies a supplier, customer or other supply-chain party.'],
  ['Unique logistics-unit code (SSCC)','GS1 application identifier (AI) 00 · 18 digits','Identifies one pallet or logistics unit.'],
 ]:[
  ['Código global de producto (GTIN)','Identificador de aplicación GS1 (AI) 01 · 14 dígitos','Identifica un producto o especificación comercial de packing.'],
  ['Código global de ubicación física (GLN)','Identificador de aplicación GS1 (AI) 414 · 13 dígitos','Identifica una planta o ubicación de inventario.'],
  ['Código global de empresa / parte (GLN)','Identificador de aplicación GS1 (AI) 417 · 13 dígitos','Identifica un proveedor, cliente u otra parte de la cadena.'],
  ['Código único de unidad logística (SSCC)','Identificador de aplicación GS1 (AI) 00 · 18 dígitos','Identifica un pallet o unidad logística individual.'],
 ]
 return <>
  <PageHeader eyebrow="Seafood Intelligence OS · GS1" title={en?'Commercial and logistics identities (GS1)':'Identidades comerciales y logísticas (GS1)'} description={en?'Read-only registry for standard product, location, company and pallet codes backed by real evidence. Internal IDs are never converted into GS1 identifiers.':'Registro de sólo lectura para códigos estándar de producto, ubicación, empresa y pallet respaldados por evidencia real. Los IDs internos nunca se convierten en identificadores GS1.'} actions={<button className="button secondary" type="button" onClick={()=>void load()} disabled={loading}><RefreshCw size={15}/>{loading?(en?'Refreshing…':'Actualizando…'):(en?'Refresh':'Actualizar')}</button>}/>
  {error?<div className="notice error" role="alert">{error}</div>:null}
  {!payload.schemaReady&&!loading?<div className="notice"><ShieldCheck size={15}/>{en?'The GS1 registry database change is not active yet. No GS1 code is inferred or generated.':'La base todavía no tiene activo el registro GS1. No se infiere ni genera ningún código GS1.'}</div>:null}
  <section className="signal-grid"><Metric label={en?'Registered':'Registrados'} value={Number(summary.total??0)} locale={locale}/><Metric label={en?'Confirmed':'Confirmados'} value={Number(summary.confirmed??0)} locale={locale}/><Metric label={en?'Needs confirmation':'Por confirmar'} value={Number(summary.candidate??0)} locale={locale}/><Metric label={en?'Rejected':'Rechazados'} value={Number(summary.rejected??0)} locale={locale}/></section>
  <section className="panel"><div className="section-heading"><div><span className="overline teal">{en?'Standard identity rules':'Reglas de identidad estándar'}</span><h2>{en?'What each code identifies':'Qué identifica cada código'}</h2></div><span className="status info">{en?'read only':'sólo lectura'}</span></div><div className="os-stage-modules">{rules.map(([key,rule,target],index)=><div className="alert-row static" key={key}><span className="os-module-step">{String(index+1).padStart(2,'0')}</span><div><b>{key}</b><small>{target}</small><p className="source-note">{rule}</p></div></div>)}</div><div className="governance-note"><ShieldCheck size={19}/><div><b>{en?'Evidence first. Human confirmation remains authoritative.':'Evidencia primero. La confirmación humana mantiene la autoridad.'}</b><p>{en?'A valid check digit only confirms that the code has the expected structure. It does not prove ownership, assignment or regulatory validity.':'Un dígito de control válido sólo confirma que el código tiene la estructura esperada. No demuestra propiedad, asignación ni validez regulatoria.'}</p></div></div></section>
  <section className="panel"><div className="section-heading"><div><span className="overline teal">{en?'Registered codes':'Códigos registrados'}</span><h2>{en?'External identities linked to real evidence':'Identidades externas vinculadas a evidencia real'}</h2></div><span>{loading?(en?'Checking…':'Verificando…'):`${identities.length} ${en?'records':'registros'}`}</span></div>{!loading&&!identities.length?<div className="empty-state"><Database size={24}/><span>{payload.message??(en?'No real GS1 identifiers have been registered yet.':'Todavía no hay identificadores GS1 reales registrados.')}</span></div>:<div className="table-scroll"><table className="data-table"><thead><tr><th>{en?'What it identifies':'Qué identifica'}</th><th>{en?'Standard code':'Código estándar'}</th><th>{en?'Linked Pescamar record':'Registro Pescamar vinculado'}</th><th>{en?'Evidence source':'Fuente de evidencia'}</th><th>{en?'Review status':'Estado de revisión'}</th></tr></thead><tbody>{identities.map(item=><tr key={item.id}><td><b>{identityLabel[item.keyType]}</b><small>{entityLabel[item.entityType]??item.entityType}</small></td><td><b>{item.value}</b>{item.referenceUri?<a href={item.referenceUri} target="_blank" rel="noreferrer">{en?'GS1 web reference':'Referencia web GS1'} <ExternalLink size={12}/></a>:null}</td><td>{item.entityLabel??(en?'Unresolved label':'Etiqueta no resuelta')}</td><td><b>{item.sourceSystem}</b><small>{item.sourceReference}</small></td><td><span className={`status-pill ${item.status}`}>{statusLabel[item.status]}</span></td></tr>)}</tbody></table></div>}</section>
  <TechnicalGlossary locale={locale} terms={['gs1','gtin','gln','sscc','gs1_ai','digital_link','gdst','epcis']}/>
  <div className="notice"><ShieldCheck size={15}/>{en?'Compatibility note: this registry prepares standard identities, but it does not yet make Seafood Intelligence OS GDST-capable and it does not enable external EPCIS event exchange or a GS1 Digital Link resolver.':'Compatibilidad: este registro prepara identidades estándar, pero todavía no convierte Seafood Intelligence OS en una solución compatible certificada con GDST ni habilita intercambio externo de eventos EPCIS o un resolvedor GS1 Digital Link.'}</div>
 </>
}
function Metric({label,value,locale}:{label:string;value:number;locale:'es'|'en'}){return <article className="signal-card"><span>{label}</span><b>{value.toLocaleString(locale==='en'?'en-US':'es-CL')}</b><small>{locale==='en'?'standard identity registry':'registro de identidades estándar'}</small></article>}

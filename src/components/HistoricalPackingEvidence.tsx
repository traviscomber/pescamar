import {AlertTriangle,Boxes,Link2} from 'lucide-react'
import {useEffect,useState} from 'react'

type PackingRow={pack_format:string;boxes:number|string;kg:number|string;first_date:string|null;last_date:string|null;flagged:number|string}
type Payload={ok?:boolean;status?:'exact'|'ambiguous'|'no_match'|'not_eligible';lotCode?:string;matches?:number;packing?:PackingRow[];summary?:{boxes:number;kg:number;flagged:number};governance?:{rule?:string};reason?:string;error?:string}
const kg=(value:unknown)=>`${Number(value??0).toLocaleString('es-CL',{maximumFractionDigits:1})} kg`
const date=(value:string|null)=>value?new Intl.DateTimeFormat('es-CL',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(`${value}T12:00:00`)):'—'

export function HistoricalPackingEvidence({recordId}:{recordId:string}){
 const [data,setData]=useState<Payload|null>(null)
 useEffect(()=>{let active=true;setData(null);void fetch(`/api/historical-packing-evidence?recordId=${encodeURIComponent(recordId)}`,{cache:'no-store'}).then(async response=>{const payload=await response.json() as Payload;if(active)setData(response.ok?payload:{ok:false,error:payload.error??'No fue posible resolver packing'})}).catch(()=>{if(active)setData({ok:false,error:'No fue posible resolver packing'})});return()=>{active=false}},[recordId])
 if(!data||data.status==='no_match'||data.status==='not_eligible')return null
 if(data.status==='ambiguous')return <section className="lot-section"><div className="lot-section-title"><AlertTriangle size={18}/><h3>Packing no atribuido</h3></div><div className="lot-source-warning"><AlertTriangle size={17}/><div><b>Lote repetido en producción</b><span>{data.reason??'El código no identifica una única fila operacional.'}</span></div></div></section>
 if(data.ok===false)return <section className="lot-section"><div className="lot-section-title"><AlertTriangle size={18}/><h3>Packing canónico</h3></div><p className="source-note">{data.error}</p></section>
 if(data.status!=='exact')return null
 return <section className="lot-section"><div className="lot-section-title"><Boxes size={18}/><h3>Packing vinculado</h3></div><div className="lot-kpis"><div><small>Cajas</small><b>{Number(data.summary?.boxes??0).toLocaleString('es-CL')}</b></div><div><small>Kg packing</small><b>{kg(data.summary?.kg)}</b></div><div><small>Formatos</small><b>{data.packing?.length??0}</b></div><div><small>Observaciones</small><b>{Number(data.summary?.flagged??0)}</b></div></div><div className="grade-grid">{(data.packing??[]).map(row=><div className="grade-card" key={row.pack_format}><span>{row.pack_format}</span><b>{kg(row.kg)}</b><small>{Number(row.boxes).toLocaleString('es-CL')} cajas · {date(row.last_date)}</small></div>)}</div><p className="source-note"><Link2 size={13}/> {data.governance?.rule??'Vínculo exacto por lote único.'}</p></section>
}

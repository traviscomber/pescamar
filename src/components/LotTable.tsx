import { Building2, ChevronRight, FileCheck2, Thermometer } from 'lucide-react'
import {useLocale} from '../i18n'
import { plants } from '../plants'
import type { Lot } from '../types'

const statusClass:Record<Lot['status'],string>={Clasificado:'success',Muestreo:'info',Revisión:'warning','Alerta calibre':'danger'}
const plantNames=new Map(plants.map(plant=>[plant.id,plant.name.replace('Planta ','')]))
const statusLabel=(status:Lot['status'],isEs:boolean)=>isEs?status:status==='Clasificado'?'Classified':status==='Muestreo'?'Sampling':status==='Revisión'?'Review':'Caliber alert'

export function LotTable({ lots, compact=false, onOpen }:{lots:Lot[];compact?:boolean;onOpen?:(lot:Lot)=>void}) {
  const {locale}=useLocale()
  const isEs=locale==='es'
  const c=isEs?{
    lotTime:'Lote / hora',supplier:'Proveedor',plantOrigin:'Planta / origen',guideFolio:'Guía / folio',gross:'Bruto',accepted:'Neto aceptado',guideDiff:'Dif. guía',loss:'Merma',temperature:'T°',status:'Estado',evidence:'Evidencia',noFolio:'Sin folio',noEvidence:'Sin respaldo',action:'Acción',open:'Abrir ficha'
  }:{
    lotTime:'Lot / time',supplier:'Supplier',plantOrigin:'Plant / origin',guideFolio:'Guide / folio',gross:'Gross',accepted:'Accepted net',guideDiff:'Guide diff.',loss:'Loss',temperature:'Temp.',status:'Status',evidence:'Evidence',noFolio:'No folio',noEvidence:'No evidence',action:'Action',open:'Open record'
  }
  const shown=compact?lots.slice(0,5):lots
  return <div className="table-scroll mobile-card-scroll"><table className="data-table mobile-card-table lot-table-responsive"><thead><tr><th>{c.lotTime}</th><th>{c.supplier}</th><th>{c.plantOrigin}</th><th>{c.guideFolio}</th><th className="numeric">{c.gross}</th><th className="numeric">{c.accepted}</th><th className="numeric">{c.guideDiff}</th><th className="numeric">{c.loss}</th>{compact?null:<th className="numeric">{c.temperature}</th>}<th>{c.status}</th><th>{c.evidence}</th>{onOpen?<th></th>:null}</tr></thead><tbody>{shown.map(lot=><tr key={lot.id} onDoubleClick={()=>onOpen?.(lot)}><td data-label={c.lotTime}>{onOpen?<button className="lot-code-button" onClick={()=>onOpen(lot)}>{lot.id}</button>:<b>{lot.id}</b>}<small>{lot.receivedAt}</small></td><td data-label={c.supplier}><div className="supplier"><span>{lot.initials}</span><b>{lot.supplier}</b></div></td><td data-label={c.plantOrigin}><div className="lot-origin"><b><Building2 size={12}/>{plantNames.get(lot.plantId)??lot.plantId}</b><small>{lot.zone}</small></div></td><td data-label={c.guideFolio}><b>{lot.guide.toFixed(1)} kg</b><small>{lot.guideReference||c.noFolio}</small></td><td data-label={c.gross} className="numeric">{lot.gross.toFixed(1)} kg</td><td data-label={c.accepted} className="numeric"><b>{lot.accepted.toFixed(1)} kg</b></td><td data-label={c.guideDiff} className={`numeric ${lot.accepted<lot.guide?'negative':''}`}>{(lot.accepted-lot.guide).toFixed(1)} kg</td><td data-label={c.loss} className={`numeric ${lot.loss>18?'negative':''}`}>{lot.loss.toFixed(1)}%</td>{compact?null:<td data-label={c.temperature} className="numeric"><span className="temperature"><Thermometer size={13}/>{lot.temperature.toFixed(1)}°</span></td>}<td data-label={c.status}><span className={`status ${statusClass[lot.status]}`}>{statusLabel(lot.status,isEs)}</span></td><td data-label={c.evidence}>{lot.evidence.length?<div className="lot-evidence-links">{lot.evidence.slice(0,compact?1:2).map((item,index)=><a href={item.url} target="_blank" rel="noreferrer" key={`${item.url}-${index}`} title={item.label}><FileCheck2 size={13}/>{compact?lot.evidence.length:item.label}</a>)}{!compact&&lot.evidence.length>2?<small>+{lot.evidence.length-2}</small>:null}</div>:<span className="evidence-none">{c.noEvidence}</span>}</td>{onOpen?<td data-label={c.action}><button className="icon-button" onClick={()=>onOpen(lot)} aria-label={`${c.open} ${lot.id}`}><ChevronRight size={17}/></button></td>:null}</tr>)}</tbody></table></div>
}

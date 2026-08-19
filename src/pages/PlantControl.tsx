import { AlertTriangle, ArrowLeft, ArrowRight, Boxes, Building2, CheckCircle2, Clock3, FileSpreadsheet, PackageCheck, Scale, TrendingUp } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { plants, type Plant } from '../plants'

const kg=(value:number)=>`${value.toLocaleString('es-CL')} kg`
export function PlantControl(){
  const {plantId}=useParams()
  const selected=plants.find(plant=>plant.id===plantId)
  if(selected)return <PlantDetail plant={selected}/>
  const totalProduction=plants.reduce((sum,plant)=>sum+plant.productionKg,0)
  const totalInventory=plants.reduce((sum,plant)=>sum+plant.inventoryKg,0)
  const alertCount=plants.reduce((sum,plant)=>sum+plant.alerts.filter(alert=>alert.severity!=='Información').length,0)
  return <><PageHeader eyebrow="Centro de control multiplanta" title="Estado de la operación" description="Seis plantas, múltiples productos y una sola vista para saber dónde actuar primero." actions={<button className="button primary"><FileSpreadsheet size={16}/>Importar planilla</button>}/>
    <section className="plant-summary"><Summary icon={<Building2/>} label="Plantas monitoreadas" value="6" note="2 propias · 4 externas"/><Summary icon={<Scale/>} label="Producción del período" value={kg(totalProduction)} note="92% de cumplimiento global"/><Summary icon={<Boxes/>} label="Inventario informado" value={kg(totalInventory)} note="Materia prima, proceso y terminado"/><Summary icon={<AlertTriangle/>} label="Alertas abiertas" value={String(alertCount)} note="1 crítica · 3 de atención" warning/></section>
    <section className="control-heading"><div><span className="overline teal">Vista ejecutiva</span><h2>Semáforo por planta</h2></div><div className="status-legend"><span><i className="healthy"/>Normal</span><span><i className="attention"/>Atención</span><span><i className="critical"/>Crítica</span><span><i className="offline"/>Sin datos</span></div></section>
    <section className="plant-grid">{plants.map(plant=><PlantCard plant={plant} key={plant.id}/>)}</section>
  </>
}

function PlantCard({plant}:{plant:Plant}){const progress=Math.min(100,Math.round(plant.productionKg/plant.targetKg*100));return <Link className={`panel plant-card status-${plant.status}`} to={`/plantas/${plant.id}`}>
  <header><div className={`plant-signal ${plant.status}`}><span/></div><div><span className="overline">{plant.mode}</span><h2>{plant.name}</h2><small>{plant.location}</small></div><ArrowRight size={18}/></header>
  <div className="plant-status-copy"><b>{plant.statusLabel}</b><span>{plant.statusReason}</span></div>
  <div className="plant-kpis"><div><small>Producción</small><b>{kg(plant.productionKg)}</b></div><div><small>Cumplimiento</small><b>{progress}%</b></div><div><small>Inventario</small><b>{kg(plant.inventoryKg)}</b></div></div>
  <div className="plant-progress"><i style={{width:`${progress}%`}}/></div>
  <div className="product-tags">{plant.products.slice(0,3).map(product=><span key={product}>{product}</span>)}{plant.products.length>3?<span>+{plant.products.length-3}</span>:null}</div>
  <footer><span><Clock3 size={13}/>{plant.updatedAt}</span><span>{plant.alerts.length} alertas</span></footer>
</Link>}

function PlantDetail({plant}:{plant:Plant}){const progress=Math.round(plant.productionKg/plant.targetKg*100);return <>
  <Link to="/" className="back-link"><ArrowLeft size={15}/>Volver al centro de control</Link>
  <PageHeader eyebrow={`${plant.mode} · ${plant.location}`} title={plant.name} description={plant.statusReason} actions={<button className="button secondary"><FileSpreadsheet size={16}/>Ver importación</button>}/>
  <section className={`plant-detail-banner ${plant.status}`}><div className={`plant-signal ${plant.status}`}><span/></div><div><small>Estado actual</small><b>{plant.statusLabel}</b><p>{plant.statusReason}</p></div><div><small>Última actualización</small><b>{plant.updatedAt}</b><span>{plant.source}</span></div></section>
  <section className="metric-grid"><DetailMetric icon={<TrendingUp/>} label="Producción" value={kg(plant.productionKg)} note={`Meta ${kg(plant.targetKg)}`}/><DetailMetric icon={<CheckCircle2/>} label="Cumplimiento" value={`${progress}%`} note={progress>=95?'Dentro de rango':'Bajo objetivo'}/><DetailMetric icon={<Boxes/>} label="Inventario total" value={kg(plant.inventoryKg)} note="Último archivo publicado"/><DetailMetric icon={<PackageCheck/>} label="Producto terminado" value={kg(plant.inventoryFinishedKg)} note={`${Math.round(plant.inventoryFinishedKg/plant.inventoryKg*100)}% del inventario`}/></section>
  <section className="plant-detail-grid"><article className="panel"><header className="panel-header"><h2>Productos monitoreados</h2><span>{plant.products.length} categorías</span></header><div className="product-list">{plant.products.map((product,index)=><div key={product}><span>{String(index+1).padStart(2,'0')}</span><b>{product}</b><em>Incluido en última planilla</em></div>)}</div></article><article className="panel"><header className="panel-header"><h2>Alertas y observaciones</h2><span>{plant.alerts.length} registradas</span></header>{plant.alerts.length?<div className="detail-alerts">{plant.alerts.map(alert=><div key={alert.id} className={alert.severity==='Crítica'?'critical':''}><AlertTriangle size={17}/><span><b>{alert.title}</b><small>{alert.detail}</small></span><em>{alert.severity}</em></div>)}</div>:<div className="plant-empty"><CheckCircle2 size={27}/><b>Sin alertas abiertas</b><span>La operación informada se encuentra dentro de los rangos definidos.</span></div>}</article></section>
</>}

function Summary({icon,label,value,note,warning=false}:{icon:React.ReactNode;label:string;value:string;note:string;warning?:boolean}){return <article className={warning?'warning':''}><span>{icon}</span><div><small>{label}</small><b>{value}</b><em>{note}</em></div></article>}
function DetailMetric({icon,label,value,note}:{icon:React.ReactNode;label:string;value:string;note:string}){return <article className="metric"><div className="metric-icon">{icon}</div><span>{label}</span><strong>{value}</strong><small>{note}</small></article>}

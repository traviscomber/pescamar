import {AlertTriangle,ArrowRight,Database,PackageCheck,RefreshCw,Scale,WalletCards} from 'lucide-react'
import {useCallback,useEffect,useState} from 'react'
import {Link} from 'react-router-dom'

type Intel={production?:{rows:number;guideKg:number;receivedKg:number;differenceKg:number;receptionPct:number|null;flagged:number};packing?:Array<{format:string;boxes:number;kg:number;lots:number;flagged:number}>;stock?:Array<{productFamily:string;rows:number;accumulatedKg:number;lastDate:string|null;flagged:number}>;finance?:null|{transfers:{rows:number;amountClp:number};ledger:{rows:number;inflowClp:number;outflowClp:number;balanceClp:number;flagged:number}};exceptions?:Array<{severity:'warning'|'info';kind:string;title:string;detail:string}>;generatedAt?:string;error?:string}
const nf=new Intl.NumberFormat('es-CL',{maximumFractionDigits:1})
const clp=new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0})

export function PescamarDatabaseSnapshot(){
  const [data,setData]=useState<Intel|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true)
  const load=useCallback(async()=>{setLoading(true);try{const response=await fetch('/api/pescamar-intelligence',{cache:'no-store'});const payload=await response.json() as Intel;if(!response.ok)throw new Error(payload.error??'No fue posible cargar la Base de Datos Pescamar');setData(payload);setError('')}catch(cause){setError(cause instanceof Error?cause.message:'No fue posible cargar la Base de Datos Pescamar')}finally{setLoading(false)}},[])
  useEffect(()=>{void load()},[load])
  if(loading&&!data)return <section className="panel"><div className="empty-inline"><RefreshCw size={20}/><div><b>Sincronizando Base de Datos Pescamar 2026</b><small>Construyendo producción, packing, stock y control financiero.</small></div></div></section>
  if(error&&!data)return <section className="panel"><div className="notice error"><AlertTriangle size={15}/>{error}</div></section>
  const production=data?.production,packing=data?.packing??[],packingKg=packing.reduce((sum,row)=>sum+row.kg,0),packingBoxes=packing.reduce((sum,row)=>sum+row.boxes,0),stockRows=(data?.stock??[]).reduce((sum,row)=>sum+row.rows,0),exceptions=data?.exceptions??[]
  return <section className="panel import-history">
    <div className="section-heading"><div><span className="overline">Base de Datos Pescamar 2026</span><h2>Estado e intelligence de los archivos cargados</h2></div><Link to="/importaciones">Ver detalle <ArrowRight size={14}/></Link></div>
    <div className="signal-grid">
      <Link className="signal-card" to="/recepciones?source=pescamar-2026"><span><Scale size={16}/>Producción importada</span><b>{nf.format(production?.receivedKg??0)} kg</b><small>{production?.receptionPct?.toFixed(1)??'—'}% recibido · {nf.format(production?.rows??0)} registros</small><em>Abrir evidencia histórica <ArrowRight size={13}/></em></Link>
      <Link className="signal-card" to="/inventario?source=pescamar-2026"><span><PackageCheck size={16}/>Packing</span><b>{nf.format(packingKg)} kg</b><small>{nf.format(packingBoxes)} cajas · BLOQUE + IQF</small><em>Revisar packing <ArrowRight size={13}/></em></Link>
      <Link className="signal-card" to="/inventario?source=pescamar-2026"><span><Database size={16}/>Stock</span><b>{nf.format(stockRows)} registros</b><small>Erizo y pulpo preservados como evidencia de stock</small><em>Revisar stock <ArrowRight size={13}/></em></Link>
      {data?.finance?<Link className="signal-card" to="/creditos?source=pescamar-2026"><span><WalletCards size={16}/>Transferencias</span><b>{clp.format(data.finance.transfers.amountClp)}</b><small>{data.finance.transfers.rows} registros fuente</small><em>Revisar evidencia financiera <ArrowRight size={13}/></em></Link>:null}
    </div>
    {data?.finance?<div className="governance-note"><WalletCards size={19}/><div><b>Cuenta corriente</b><p>Entradas {clp.format(data.finance.ledger.inflowClp)} · salidas {clp.format(data.finance.ledger.outflowClp)} · diferencia recalculada {clp.format(data.finance.ledger.balanceClp)}. Se muestra como información de la planilla, no como saldo bancario.</p></div><Link className="source-link compact" to="/importaciones?section=finance">Revisar fuente</Link></div>:null}
    {exceptions.length?<div className="alert-list">{exceptions.slice(0,4).map((item,index)=><Link className="alert-row" to="/importaciones?section=review" key={`${item.kind}-${index}`}><span className={`alert-icon ${item.severity}`}><AlertTriangle size={16}/></span><div><b>{item.title}</b><small>{item.detail}</small></div><ArrowRight size={15}/></Link>)}</div>:null}
    <p className="data-caveat">Esta información proviene de archivos canónicos y permanece separada de recepciones y movimientos vivos hasta que exista una reconciliación verificable.</p>
  </section>
}

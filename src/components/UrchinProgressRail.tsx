import {AlertTriangle,CheckCircle2,FlaskConical} from 'lucide-react'
import {useEffect,useMemo,useState} from 'react'
import {useLocation} from 'react-router-dom'
import './urchin-progress-rail.css'

type Stage={stage:string;sequenceNo:number;status:string}
type Run={reception_id:string;reception_number:string|number;status:string;stages:Stage[]}
type Payload={runs?:Run[]}
const labels:Record<string,string>={pinching:'Pinzado',blanching:'Escaldado',thermal_shock:'Shock',sanitary_break:'Sanitario',dripping:'DRI',draining:'Drenado',molding:'Moldeo',color:'Color',xray:'RX',freezing:'Congelado',packing:'Packing'}

export function UrchinProgressRail(){
 const {pathname,search}=useLocation();const params=useMemo(()=>new URLSearchParams(search),[search]);const receptionId=params.get('receptionId')??'',plantId=params.get('plantId')??'';const [run,setRun]=useState<Run|null>(null)
 useEffect(()=>{if(!pathname.startsWith('/proceso-erizo')||!receptionId){setRun(null);return}let active=true;const q=plantId?`?plantId=${encodeURIComponent(plantId)}`:'';void fetch(`/api/sea-urchin-process${q}`,{cache:'no-store'}).then(r=>r.ok?r.json():null).then((payload:Payload|null)=>{if(active)setRun(payload?.runs?.find(item=>item.reception_id===receptionId)??null)}).catch(()=>{if(active)setRun(null)});return()=>{active=false}},[pathname,receptionId,plantId])
 if(!pathname.startsWith('/proceso-erizo')||!run)return null
 const stages=[...(run.stages??[])].sort((a,b)=>a.sequenceNo-b.sequenceNo),next=stages.find(stage=>!['ok','not_applicable'].includes(stage.status)),done=stages.filter(stage=>['ok','not_applicable'].includes(stage.status)).length,blocked=next?.status==='hold'||next?.status==='deviation'
 return <div className={`urchin-progress-rail ${blocked?'attention':''}`}><div className="urchin-progress-summary"><FlaskConical size={17}/><div><span>REC-{run.reception_number} · proceso erizo</span><b>{next?`${blocked?'Resolver':'Ahora'}: ${labels[next.stage]??next.stage}`:'Proceso técnico completo'}</b><small>{done}/{stages.length} etapas conformes{next?` · ${next.status}`:''}</small></div></div><div className="urchin-step-track" aria-label="Progreso de proceso de erizo">{stages.map(stage=><span key={stage.stage} className={['ok','not_applicable'].includes(stage.status)?'done':stage===next?'current':''} title={`${labels[stage.stage]??stage.stage}: ${stage.status}`}>{['ok','not_applicable'].includes(stage.status)?<CheckCircle2 size={13}/>:stage===next&&blocked?<AlertTriangle size={13}/>:null}<em>{labels[stage.stage]??stage.stage}</em></span>)}</div></div>
}

import {requireOperator} from './_auth.js'
import {buildCanonicalBusinessIntelligence} from './_canonical-business-intelligence.js'

type Request={method?:string;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}

export default async function handler(request:Request,response:Response){
 response.setHeader('Cache-Control','no-store')
 if(request.method!=='GET'){response.setHeader('Allow','GET');return response.status(405).json({ok:false,error:'Método no permitido'})}
 try{
  const operator=await requireOperator(request)
  if(!operator)return response.status(401).json({ok:false,error:'Sesión requerida'})
  const intelligence=await buildCanonicalBusinessIntelligence(operator)
  if(!intelligence)return response.status(403).json({ok:false,error:'Inteligencia canónica disponible sólo para alcance corporativo'})
  const {reception,lineage,packing,stockEvidence,finance,priorities}=intelligence.data
  const top=priorities[0]??null
  const know=`${reception.rows} registros de producción explican ${reception.explainedPct??0}% de los kilos guía; packing registra ${packing.boxes} cajas / ${packing.kg.toLocaleString('es-CL',{maximumFractionDigits:1})} kg.`
  const meaning=packing.missingLotBoxes>0
   ?`${packing.missingLotBoxes} cajas siguen sin lote y ${lineage.chronologyReview} secuencias de fecha requieren revisión. La evidencia es histórica y no representa inventario live.`
   :lineage.chronologyReview>0
    ?`${lineage.chronologyReview} secuencias de fecha requieren revisión antes de elevar esa evidencia a trazabilidad confiable.`
    :`La evidencia canónica disponible está suficientemente reconciliada para análisis histórico, manteniéndose separada de la operación live.`
  const action=top?top.title:'No hay una reconciliación canónica prioritaria abierta.'
  return response.status(200).json({ok:true,generatedAt:new Date().toISOString(),brief:{know,meaning,action,evidencePath:intelligence.source.path,priority:top},signals:{reception,lineage,packing,stockEvidence,finance}})
 }catch(error){const message=error instanceof Error?error.message:'';return response.status(message.includes('DATABASE_URL')?503:500).json({ok:false,error:message.includes('DATABASE_URL')?'Base de datos no conectada':'No fue posible construir el brief canónico'})}
}

import {requireOperator} from './_auth.js'
import {buildSeaUrchinCopilotEvidence} from './_copilot-sea-urchin.js'

type Request={method?:string;query?:Record<string,string|string[]|undefined>;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
const one=(value:string|string[]|undefined)=>Array.isArray(value)?value[0]:value

export default async function handler(req:Request,res:Response){
 res.setHeader('Cache-Control','no-store')
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'Método no permitido'})}
 try{
  const operator=await requireOperator(req)
  if(!operator)return res.status(401).json({ok:false,error:'Sesión requerida'})
  const receptionId=String(one(req.query?.receptionId)??'').trim()
  const evidence=await buildSeaUrchinCopilotEvidence(operator,receptionId)
  if(!evidence)return res.status(404).json({ok:false,error:'Lote de erizo no disponible'})
  const data=evidence.data as Record<string,unknown>
  return res.status(200).json({
   ok:true,
   reception:data.reception??null,
   process:data.process??null,
   diagnosis:data.diagnosis??null,
   summary:data.summary??null,
   source:evidence.source,
  })
 }catch(error){
  console.error('sea_urchin_control_card_error',error instanceof Error?error.message:'unknown')
  return res.status(500).json({ok:false,error:'No fue posible construir el control del lote'})
 }
}

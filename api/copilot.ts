import { gateway, generateText } from 'ai'
import { requireOperator } from './_auth.js'
import { buildCopilotContext, resolveCopilotPlant } from './_copilot-context.js'
import { buildHistoricalLineageEvidence } from './_copilot-historical-lineage.js'
import { buildCanonicalBusinessIntelligence } from './_canonical-business-intelligence.js'
import { buildSeaUrchinCopilotEvidence } from './_copilot-sea-urchin.js'
import { activeOrganization } from './_organization.js'
import { evidenceClassForSource, invalidSourceTags, SEAFOOD_AI_POLICY_VERSION, seafoodAiSystemPrompt } from './_seafood-ai-policy.js'

declare const process:{env:Record<string,string|undefined>}
type Request={method?:string;headers?:Record<string,string|string[]|undefined>;body?:unknown}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type HistoryTurn={question:string;answer:string}
const MODEL='openai/gpt-5.4-mini',MAX_QUESTION=1800,MAX_HISTORY=6

function history(value:unknown):HistoryTurn[]{if(!Array.isArray(value))return[];return value.slice(-MAX_HISTORY).flatMap(item=>{if(!item||typeof item!=='object')return[];const row=item as Record<string,unknown>,question=typeof row.question==='string'?row.question.trim().slice(0,MAX_QUESTION):'',answer=typeof row.answer==='string'?row.answer.trim().slice(0,5000):'';return question&&answer?[{question,answer}]:[]})}

export default async function handler(req:Request,res:Response){
 res.setHeader('Cache-Control','no-store, max-age=0')
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({ok:false,error:'Método no permitido'})}
 const operator=await requireOperator(req)
 if(!operator)return res.status(401).json({ok:false,error:'Sesión requerida'})
 if(operator.organizationId!==activeOrganization.organizationId)return res.status(403).json({ok:false,error:'Organización fuera de alcance'})
 const body=req.body&&typeof req.body==='object'?req.body as Record<string,unknown>:{}
 const question=typeof body.question==='string'?body.question.trim().slice(0,MAX_QUESTION):''
 if(!question)return res.status(400).json({ok:false,error:'Escribe una pregunta operacional'})
 const plantId=resolveCopilotPlant(operator,body.plantId)
 if(plantId===undefined)return res.status(403).json({ok:false,error:'Planta fuera de tu alcance'})
 if(!process.env.AI_GATEWAY_API_KEY&&!process.env.VERCEL_OIDC_TOKEN)return res.status(503).json({ok:false,error:'Pescamar IA aún no está configurado en este entorno'})
 try{
  const [context,historicalLineage,canonicalIntelligence,urchinGraph]=await Promise.all([buildCopilotContext(operator,plantId),buildHistoricalLineageEvidence(operator),buildCanonicalBusinessIntelligence(operator),buildSeaUrchinCopilotEvidence(operator,body.receptionId)])
  const extraSources=[historicalLineage?.source,canonicalIntelligence?.source,urchinGraph?.source].filter((source):source is NonNullable<typeof source>=>Boolean(source))
  const baseSources=[...context.sources,...extraSources]
  const sources=baseSources.map(source=>{const evidenceClass=evidenceClassForSource(source.id);if(!evidenceClass)throw new Error(`unclassified_source:${source.id}`);return {...source,evidenceClass}})
  const extraData={...(historicalLineage?{historical_lineage:historicalLineage.data}:{}),...(canonicalIntelligence?{canonical_intelligence:canonicalIntelligence.data}:{}),...(urchinGraph?{urchin_graph:urchinGraph.data}:{})}
  const scopedContext={...context,scope:{...context.scope,organizationId:operator.organizationId},sources,data:{...context.data,...extraData}}
  const conversation=history(body.history).map((turn,index)=>`TURNO ${index+1}\nPREGUNTA: ${turn.question}\nRESPUESTA: ${turn.answer}`).join('\n\n')||'Sin turnos previos.'
  const sourceLegend=sources.map(source=>`[${source.id}] ${source.label} · class=${source.evidenceClass} · rows=${source.rows} · freshness=${source.freshness??'unknown'}`).join('\n')
  const result=await generateText({
   model:gateway(MODEL),
   system:seafoodAiSystemPrompt(activeOrganization.implementationName),
   prompt:`SOURCES:\n${sourceLegend}\n\nHISTORIAL:\n${conversation}\n\nPREGUNTA:\n${question}\n\nSEAFOOD_SNAPSHOT:\n${JSON.stringify(scopedContext)}`,
   maxOutputTokens:1800,
   providerOptions:{openai:{reasoningEffort:'low'}},
  })
  const answer=result.text.trim()
  if(!answer)throw new Error('empty_answer')
  const invalidTags=invalidSourceTags(answer,new Set(sources.map(source=>source.id)))
  if(invalidTags.length)throw new Error(`invalid_source_tags:${invalidTags.join(',')}`)
  return res.status(200).json({ok:true,answer,engine:'Seafood AI',implementation:activeOrganization.implementationName,policyVersion:SEAFOOD_AI_POLICY_VERSION,model:MODEL,generatedAt:context.generatedAt,scope:scopedContext.scope,sources})
 }catch(error){console.error('copilot_error',error instanceof Error?error.message:'unknown');return res.status(502).json({ok:false,error:'Pescamar IA no pudo responder en este momento'})}
}

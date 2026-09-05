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
type Source={id:string;label:string;path:string;rows:number;freshness:string|null}
const MODEL='openai/gpt-5.4-mini',MAX_QUESTION=1800,MAX_HISTORY=6,MAX_IMAGES=3,MAX_IMAGE_CHARS=1800000

function history(value:unknown):HistoryTurn[]{if(!Array.isArray(value))return[];return value.slice(-MAX_HISTORY).flatMap(item=>{if(!item||typeof item!=='object')return[];const row=item as Record<string,unknown>,question=typeof row.question==='string'?row.question.trim().slice(0,MAX_QUESTION):'',answer=typeof row.answer==='string'?row.answer.trim().slice(0,5000):'';return question&&answer?[{question,answer}]:[]})}
function images(value:unknown){if(!Array.isArray(value))return[] as string[];return value.slice(0,MAX_IMAGES).flatMap(item=>typeof item==='string'&&/^data:image\/(jpeg|png|webp);base64,/i.test(item)&&item.length<=MAX_IMAGE_CHARS?[item]:[])}
function outputText(payload:unknown){if(!payload||typeof payload!=='object')return'';const row=payload as Record<string,unknown>;if(typeof row.output_text==='string')return row.output_text.trim();if(!Array.isArray(row.output))return'';return row.output.flatMap(item=>{if(!item||typeof item!=='object')return[];const content=(item as Record<string,unknown>).content;if(!Array.isArray(content))return[];return content.flatMap(part=>part&&typeof part==='object'&&typeof (part as Record<string,unknown>).text==='string'?[(part as Record<string,unknown>).text as string]:[])}).join('\n').trim()}

async function inspectPhotos(imageData:string[],question:string){
 if(!imageData.length)return null
 const token=process.env.AI_GATEWAY_API_KEY||process.env.VERCEL_OIDC_TOKEN
 if(!token)throw new Error('missing_ai_gateway_token')
 const instruction=`Analiza estas fotos como especialista senior en proceso y calidad de erizo para una planta chilena. Describe sólo lo realmente visible. Busca, cuando corresponda: producto/parte del proceso, apariencia, color, homogeneidad, daños o contaminación visible, presencia de material extraño, condición de packing/etiqueta, texto o códigos legibles y cualquier señal visual útil. No declares inocuidad, temperatura real, Grade definitivo ni aprobación Japón desde una foto. Distingue observación de inferencia y termina con límites de evidencia. Pregunta del usuario: ${question}`
 const response=await fetch('https://ai-gateway.vercel.sh/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({model:MODEL,input:[{role:'user',content:[{type:'input_text',text:instruction},...imageData.map(image_url=>({type:'input_image',image_url,detail:'auto'}))]}],max_output_tokens:900})})
 if(!response.ok)throw new Error(`photo_analysis_${response.status}`)
 const result=outputText(await response.json())
 if(!result)throw new Error('photo_analysis_empty')
 return result
}

export default async function handler(req:Request,res:Response){
 res.setHeader('Cache-Control','no-store, max-age=0')
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({ok:false,error:'Método no permitido'})}
 const operator=await requireOperator(req)
 if(!operator)return res.status(401).json({ok:false,error:'Sesión requerida'})
 if(operator.organizationId!==activeOrganization.organizationId)return res.status(403).json({ok:false,error:'Organización fuera de alcance'})
 const body=req.body&&typeof req.body==='object'?req.body as Record<string,unknown>:{}
 const imageData=images(body.images)
 const question=(typeof body.question==='string'?body.question.trim().slice(0,MAX_QUESTION):'')||(imageData.length?'Analiza estas fotos y dime qué ves, qué significa y qué debería revisar después.':'')
 if(!question)return res.status(400).json({ok:false,error:'Escribe una pregunta o agrega una foto'})
 const seniorUrchin=body.mode==='sea_urchin_senior'
 const plantId=resolveCopilotPlant(operator,body.plantId)
 if(plantId===undefined)return res.status(403).json({ok:false,error:'Planta fuera de tu alcance'})
 if(!process.env.AI_GATEWAY_API_KEY&&!process.env.VERCEL_OIDC_TOKEN)return res.status(503).json({ok:false,error:'Pescamar IA aún no está configurado en este entorno'})
 try{
  const [context,historicalLineage,canonicalIntelligence,urchinGraph,photoObservation]=await Promise.all([buildCopilotContext(operator,plantId),buildHistoricalLineageEvidence(operator),buildCanonicalBusinessIntelligence(operator),buildSeaUrchinCopilotEvidence(operator,body.receptionId),inspectPhotos(imageData,question)])
  const photoSource:Source|null=photoObservation?{id:'photo_observation',label:`Fotos adjuntas · ${imageData.length}`,path:'/proceso-erizo',rows:imageData.length,freshness:new Date().toISOString()}:null
  const extraSources=[historicalLineage?.source,canonicalIntelligence?.source,urchinGraph?.source,photoSource].filter((source):source is Source=>Boolean(source))
  const baseSources=[...context.sources,...extraSources]
  const sources=baseSources.map(source=>{const evidenceClass=evidenceClassForSource(source.id);if(!evidenceClass)throw new Error(`unclassified_source:${source.id}`);return {...source,evidenceClass}})
  const extraData={...(historicalLineage?{historical_lineage:historicalLineage.data}:{}),...(canonicalIntelligence?{canonical_intelligence:canonicalIntelligence.data}:{}),...(urchinGraph?{urchin_graph:urchinGraph.data}:{}),...(photoObservation?{photo_observation:{images:imageData.length,analysis:photoObservation,persistence:'ephemeral_user_attachment',linkedReceptionId:urchinGraph?body.receptionId??null:null}}:{})}
  const scopedContext={...context,scope:{...context.scope,organizationId:operator.organizationId},sources,data:{...context.data,...extraData}}
  const conversation=history(body.history).map((turn,index)=>`TURNO ${index+1}\nPREGUNTA: ${turn.question}\nRESPUESTA: ${turn.answer}`).join('\n\n')||'Sin turnos previos.'
  const sourceLegend=sources.map(source=>`[${source.id}] ${source.label} · class=${source.evidenceClass} · rows=${source.rows} · freshness=${source.freshness??'unknown'}`).join('\n')
  const seniorPrompt=seniorUrchin?(urchinGraph?`\n\nMODO ASISTENTE SENIOR DE ERIZO — LOTE ESPECÍFICO:\n- urchin_graph es la verdad operacional del lote. Usa photo_observation como evidencia visual complementaria, nunca como sustituto de un gate.\n- Responde primero con una conclusión simple y después ofrece detalle sólo si aporta valor.\n- Ante preguntas sobre Japón, usa «APTO JAPÓN» sólo si urchin_graph.japan.releasable es true; en cualquier otro caso usa «NO LIBERADO JAPÓN».\n- Distingue calidad visual, Grade, condición operacional y habilitación regulatoria/exportadora.\n- Si hay fotos, explica qué muestran y si son coherentes o no con el estado registrado, pero no asumas que prueban identidad/procedencia del lote.\n- Prioriza el primer bloqueo determinístico y diagnosis.nextAction.\n- Mantén lectura solamente: puedes recomendar revisión, nunca aprobar, liberar ni cambiar parámetros.`:`\n\nMODO ASISTENTE SENIOR DE ERIZO — VISIÓN GENERAL:\n- La selección de lote es opcional. Si no hay urchin_graph, trabaja con evidencia canónica/histórica/operacional y con photo_observation si existe.\n- Una foto puede analizarse sin lote: describe lo visible, estima sólo de forma prudente y explica qué dato faltaría para una decisión operacional.\n- Si preguntan aprobación Japón sin lote, no la determines; explica que hace falta un Digital Twin específico.\n- Propón de forma natural la siguiente pregunta útil cuando ayude: lote/origen, Grade, Color, Rayos X, frío, documento o Japan Release.\n- Nunca conviertas histórico o foto en aprobación regulatoria.`):''
  const result=await generateText({model:gateway(MODEL),system:seafoodAiSystemPrompt(activeOrganization.implementationName)+seniorPrompt,prompt:`SOURCES:\n${sourceLegend}\n\nHISTORIAL:\n${conversation}\n\nPREGUNTA:\n${question}\n\nSEAFOOD_SNAPSHOT:\n${JSON.stringify(scopedContext)}`,maxOutputTokens:seniorUrchin?2200:1800,providerOptions:{openai:{reasoningEffort:seniorUrchin?'medium':'low'}}})
  const answer=result.text.trim()
  if(!answer)throw new Error('empty_answer')
  const invalidTags=invalidSourceTags(answer,new Set(sources.map(source=>source.id)))
  if(invalidTags.length)throw new Error(`invalid_source_tags:${invalidTags.join(',')}`)
  return res.status(200).json({ok:true,answer,engine:seniorUrchin?'Asistente Senior de Erizo':'Seafood AI',implementation:activeOrganization.implementationName,policyVersion:SEAFOOD_AI_POLICY_VERSION,model:MODEL,generatedAt:context.generatedAt,scope:scopedContext.scope,sources,photoAnalysis:Boolean(photoObservation)})
 }catch(error){console.error('copilot_error',error instanceof Error?error.message:'unknown');return res.status(502).json({ok:false,error:'Pescamar IA no pudo responder en este momento'})}
}

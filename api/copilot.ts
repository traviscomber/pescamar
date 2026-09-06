import { requireOperator } from './_auth.js'
import { resolveCopilotPlant } from './_copilot-context.js'
import { buildCopilotContextWithLot } from './_copilot-context-with-lot.js'
import { buildHistoricalLineageEvidence } from './_copilot-historical-lineage.js'
import { buildCanonicalBusinessIntelligence } from './_canonical-business-intelligence.js'
import { buildSeaUrchinCopilotEvidence } from './_copilot-sea-urchin.js'
import { activeOrganization } from './_organization.js'
import { evidenceClassForSource, invalidSourceTags, SEAFOOD_AI_POLICY_VERSION, seafoodAiSystemPrompt } from './_seafood-ai-policy.js'

declare const process:{env:Record<string,string|undefined>}
declare function fetch(input:string,init?:{method?:string;headers?:Record<string,string>;body?:string}):Promise<{ok:boolean;status:number;json:()=>Promise<unknown>}>

type Request={method?:string;headers?:Record<string,string|string[]|undefined>;body?:unknown}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type HistoryTurn={question:string;answer:string}
type Source={id:string;label:string;path:string;rows:number;freshness:string|null}
type VisualMeasurement={index:number;name:string|null;confidence:'good'|'review';usableRatio:number;borderCandidateRatio:number;lMean:number;aMean:number;bMean:number;dispersion:number;chroma:number;hueDeg:number;pixelCount:number}
type OpenAIContent={type:'input_text';text:string}|{type:'input_image';image_url:string;detail:'auto'}
type OpenAIMessage={role:'developer'|'user';content:OpenAIContent[]}

const MODEL='gpt-5.6-terra',MAX_QUESTION=1800,MAX_HISTORY=6,MAX_IMAGES=3,MAX_IMAGE_CHARS=1800000

function history(value:unknown):HistoryTurn[]{if(!Array.isArray(value))return[];return value.slice(-MAX_HISTORY).flatMap(item=>{if(!item||typeof item!=='object')return[];const row=item as Record<string,unknown>,question=typeof row.question==='string'?row.question.trim().slice(0,MAX_QUESTION):'',answer=typeof row.answer==='string'?row.answer.trim().slice(0,5000):'';return question&&answer?[{question,answer}]:[]})}
function images(value:unknown){if(!Array.isArray(value))return[] as string[];return value.slice(0,MAX_IMAGES).flatMap(item=>typeof item==='string'&&/^data:image\/(jpeg|png|webp);base64,/i.test(item)&&item.length<=MAX_IMAGE_CHARS?[item]:[])}
function suggestedQuestions(text:string){try{const parsed=JSON.parse(text) as unknown;if(!Array.isArray(parsed))return[];return parsed.flatMap(item=>typeof item==='string'?[item.trim().slice(0,140)]:[]).filter(Boolean).slice(0,2)}catch{return[]}}
function record(value:unknown):Record<string,unknown>|null{return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null}
function finite(value:unknown){const parsed=Number(value);return Number.isFinite(parsed)?parsed:null}
function strings(value:unknown){return Array.isArray(value)?value.flatMap(item=>typeof item==='string'&&item.trim()?[item.trim()]:[]):[] as string[]}
function outputText(payload:unknown){if(!payload||typeof payload!=='object')return'';const row=payload as Record<string,unknown>;if(typeof row.output_text==='string')return row.output_text.trim();if(!Array.isArray(row.output))return'';return row.output.flatMap(item=>{if(!item||typeof item!=='object')return[];const content=(item as Record<string,unknown>).content;if(!Array.isArray(content))return[];return content.flatMap(part=>part&&typeof part==='object'&&typeof (part as Record<string,unknown>).text==='string'?[(part as Record<string,unknown>).text as string]:[])}).join('\n').trim()}
function visualMeasurements(value:unknown):VisualMeasurement[]{if(!Array.isArray(value))return[];return value.slice(0,MAX_IMAGES).flatMap(item=>{const row=record(item);if(!row)return[];const index=finite(row.index),usableRatio=finite(row.usableRatio),borderCandidateRatio=finite(row.borderCandidateRatio),lMean=finite(row.lMean),aMean=finite(row.aMean),bMean=finite(row.bMean),dispersion=finite(row.dispersion),chroma=finite(row.chroma),hueDeg=finite(row.hueDeg),pixelCount=finite(row.pixelCount);if(index==null||usableRatio==null||borderCandidateRatio==null||lMean==null||aMean==null||bMean==null||dispersion==null||chroma==null||hueDeg==null||pixelCount==null)return[];return[{index:Math.max(0,Math.min(MAX_IMAGES-1,Math.trunc(index))),name:typeof row.name==='string'?row.name.slice(0,160):null,confidence:row.confidence==='good'?'good':'review',usableRatio:Math.max(0,Math.min(1,usableRatio)),borderCandidateRatio:Math.max(0,Math.min(1,borderCandidateRatio)),lMean,aMean,bMean,dispersion:Math.max(0,dispersion),chroma:Math.max(0,chroma),hueDeg:((hueDeg%360)+360)%360,pixelCount:Math.max(0,Math.trunc(pixelCount))}]})}
function canonicalLotLab(data:Record<string,unknown>|null){const vision=record(data?.vision),latest=record(vision?.latest),lab=record(latest?.lab),l=finite(lab?.l),a=finite(lab?.a),b=finite(lab?.b);return l==null||a==null||b==null?null:{l,a,b}}
function compareVisualToLot(measurements:VisualMeasurement[],data:Record<string,unknown>|null){const canonical=canonicalLotLab(data);if(!canonical)return[];return measurements.map(measurement=>({index:measurement.index,deltaE76:Number(Math.sqrt((measurement.lMean-canonical.l)**2+(measurement.aMean-canonical.a)**2+(measurement.bMean-canonical.b)**2).toFixed(3)),canonicalLab:canonical,interpretation:'distance_only_no_acceptance_threshold'}))}
function fmt(value:number,digits=1){return value.toLocaleString('es-CL',{maximumFractionDigits:digits})}

async function openAI(messages:OpenAIMessage[],maxOutputTokens:number,effort:'low'|'medium'){
 const apiKey=process.env.OPENAI_API_KEY?.trim()
 if(!apiKey)throw new Error('missing_openai_api_key')
 const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:MODEL,input:messages,max_output_tokens:maxOutputTokens,reasoning:{effort},store:false})})
 if(!response.ok)throw new Error(`openai_responses_${response.status}`)
 const text=outputText(await response.json())
 if(!text)throw new Error('openai_empty_response')
 return text
}

async function inspectPhotos(imageData:string[],question:string){
 if(!imageData.length)return null
 const instruction=`Analiza estas fotos como especialista senior en proceso y calidad de erizo para una planta chilena. Describe sólo lo realmente visible. Busca, cuando corresponda: producto/parte del proceso, apariencia, color, homogeneidad, daños o contaminación visible, presencia de material extraño, condición de packing/etiqueta, texto o códigos legibles y cualquier señal visual útil. No declares inocuidad, temperatura real, Grade definitivo ni aprobación Japón desde una foto. Distingue observación de inferencia. Resume primero en 2 o 3 observaciones útiles y termina con el principal límite de evidencia. Pregunta del usuario: ${question}`
 return openAI([{role:'user',content:[{type:'input_text',text:instruction},...imageData.map(image_url=>({type:'input_image' as const,image_url,detail:'auto' as const}))]}],700,'low')
}

async function buildSuggestions(answer:string,question:string,hasLot:boolean,hasPhotos:boolean){
 try{return suggestedQuestions(await openAI([
  {role:'developer',content:[{type:'input_text',text:'Genera exactamente 2 preguntas de seguimiento muy breves en español de Chile. Deben ser útiles para un operador de planta de erizo, no repetir la pregunta anterior, no inventar hechos y no sugerir acciones que impliquen liberar o aprobar producto. Devuelve SOLO un JSON array de 2 strings, sin markdown.'}]},
  {role:'user',content:[{type:'input_text',text:`Pregunta previa: ${question}\nRespuesta: ${answer.slice(0,3200)}\nContexto: lote seleccionado=${hasLot}; fotos adjuntas=${hasPhotos}. Prioriza sólo las dos dudas operacionales de mayor valor: evidencia, calidad, proceso, frío, Japón o trazabilidad según corresponda.`}]},
 ],160,'low'))}catch{return[]}
}

function fallbackSuggestions(hasLot:boolean,hasPhotos:boolean){if(hasLot&&hasPhotos)return['¿Qué bloquea este lote ahora?','¿Qué falta para Japón?'];if(hasLot)return['¿Qué lo bloquea ahora?','¿Cuál es la siguiente acción?'];if(hasPhotos)return['¿Qué dato falta para decidir?','¿Debo vincular un lote?'];return['¿Qué requiere atención?','¿Qué evidencia falta?']}

function deterministicAnswer(question:string,lotControl:Record<string,unknown>|null,graph:Record<string,unknown>|null,measurements:VisualMeasurement[],comparison:Array<{index:number;deltaE76:number}>,seniorUrchin:boolean){
 const q=question.toLocaleLowerCase('es-CL'),state=record(lotControl?.state),diagnosis=record(lotControl?.diagnosis),signals=record(lotControl?.signals),quality=record(signals?.quality),balance=record(signals?.balance),release=record(signals?.release),blockers=strings(diagnosis?.blockers),nextAction=typeof diagnosis?.nextAction==='string'?diagnosis.nextAction:'',asksJapan=/jap[oó]n|export|liberad|apto/.test(q),asksPhoto=/foto|fotograf|imagen|visual|color|lab|homogene/.test(q)
 if(lotControl){const lines:string[]=[];lines.push(String(state?.label??(blockers.length?'REQUIERE ATENCIÓN':'LOTE EN CURSO')));if(seniorUrchin&&graph){const processData=record(graph.process);lines.push(`Grade ${String(processData?.grade??'—')} · Color ${String(processData?.colorStatus??'pendiente')} · RX ${String(processData?.xrayStatus??'pendiente')}.`)}else{const yieldPct=finite(balance?.yieldPct);lines.push(`Calidad ${String(quality?.label??'—')}${yieldPct==null?'':` · Yield ${fmt(yieldPct)}%`}${release?.label!=null?` · ${release?.kind==='japan'?'Japón':'Evidencia'} ${String(release.label)}`:''}.`)}if(measurements.length&&(asksPhoto||seniorUrchin)){const m=measurements[0];lines.push(`Visual Twin: LAB ${fmt(m.lMean)} / ${fmt(m.aMean)} / ${fmt(m.bMean)} · dispersión ${fmt(m.dispersion)}${comparison[0]?` · ΔE76 ${fmt(comparison[0].deltaE76,2)}`:''}.`)}if(blockers[0])lines.push(`Bloqueo: ${blockers[0]}.`);if(nextAction)lines.push(`Siguiente: ${nextAction}`);return lines.slice(0,5).join('\n')}
 if(seniorUrchin&&asksJapan)return 'JAPÓN NO EVALUABLE SIN LOTE\nPara verificar un embarque hay que vincular el Digital Twin del lote.'
 if(seniorUrchin&&measurements.length){const m=measurements[0];return `VISUAL TWIN DISPONIBLE\nLAB ${fmt(m.lMean)} / ${fmt(m.aMean)} / ${fmt(m.bMean)} · dispersión ${fmt(m.dispersion)}.\nSiguiente: vincula un lote para cruzarlo con la operación.`}
 return 'SEAFOOD AI OPERATIVA\nNo hay un lote seleccionado para construir una decisión determinística.\nSiguiente: selecciona un lote o pregunta por la operación agregada.'
}

export default async function handler(req:Request,res:Response){
 res.setHeader('Cache-Control','no-store, max-age=0')
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({ok:false,error:'Método no permitido'})}
 const operator=await requireOperator(req);if(!operator)return res.status(401).json({ok:false,error:'Sesión requerida'});if(operator.organizationId!==activeOrganization.organizationId)return res.status(403).json({ok:false,error:'Organización fuera de alcance'})
 const body=req.body&&typeof req.body==='object'?req.body as Record<string,unknown>:{},imageData=images(body.images),visualTwinMeasurements=visualMeasurements(body.visualMeasurements),question=(typeof body.question==='string'?body.question.trim().slice(0,MAX_QUESTION):'')||(imageData.length?'Analiza estas fotos y dime qué ves, qué significa y qué debería revisar después.':'')
 if(!question)return res.status(400).json({ok:false,error:'Escribe una pregunta o agrega una foto'})
 const seniorUrchin=body.mode==='sea_urchin_senior',plantId=resolveCopilotPlant(operator,body.plantId);if(plantId===undefined)return res.status(403).json({ok:false,error:'Planta fuera de tu alcance'})
 try{
  const [context,historicalLineage,canonicalIntelligence,urchinGraph,photoObservation]=await Promise.all([buildCopilotContextWithLot(operator,plantId,body.receptionId),buildHistoricalLineageEvidence(operator),buildCanonicalBusinessIntelligence(operator),buildSeaUrchinCopilotEvidence(operator,body.receptionId),inspectPhotos(imageData,question).catch(error=>{console.error('copilot_photo_degraded',error instanceof Error?error.message:'unknown');return null})])
  const lotControl=record(context.data.lot_control),graphData=urchinGraph?.data??null,visualComparison=compareVisualToLot(visualTwinMeasurements,graphData),hasPhotoEvidence=imageData.length>0||visualTwinMeasurements.length>0
  const photoSource:Source|null=hasPhotoEvidence?{id:'photo_observation',label:visualTwinMeasurements.length?`Visual Twin · ${Math.max(imageData.length,visualTwinMeasurements.length)} foto${Math.max(imageData.length,visualTwinMeasurements.length)===1?'':'s'}`:`Fotos adjuntas · ${imageData.length}`,path:'/proceso-erizo',rows:Math.max(imageData.length,visualTwinMeasurements.length),freshness:new Date().toISOString()}:null
  const extraSources=[historicalLineage?.source,canonicalIntelligence?.source,urchinGraph?.source,photoSource].filter((source):source is Source=>Boolean(source)),baseSources=[...context.sources,...extraSources],sources=baseSources.map(source=>{const evidenceClass=evidenceClassForSource(source.id);if(!evidenceClass)throw new Error(`unclassified_source:${source.id}`);return {...source,evidenceClass}})
  const extraData={...(historicalLineage?{historical_lineage:historicalLineage.data}:{}),...(canonicalIntelligence?{canonical_intelligence:canonicalIntelligence.data}:{}),...(urchinGraph?{urchin_graph:urchinGraph.data}:{}),...(hasPhotoEvidence?{photo_observation:{images:imageData.length,analysis:photoObservation,persistence:'ephemeral_user_attachment',linkedReceptionId:lotControl?body.receptionId??null:null,visualTwin:{method:'univision_cielab_v1',measurements:visualTwinMeasurements,comparisonToCanonicalLot:visualComparison,rule:'descriptive_only_no_grade_or_acceptance_threshold'}}}:{})},scopedContext={...context,scope:{...context.scope,organizationId:operator.organizationId},sources,data:{...context.data,...extraData}}
  const conversation=history(body.history).map((turn,index)=>`TURNO ${index+1}\nPREGUNTA: ${turn.question}\nRESPUESTA: ${turn.answer}`).join('\n\n')||'Sin turnos previos.',sourceLegend=sources.map(source=>`[${source.id}] ${source.label} · class=${source.evidenceClass} · rows=${source.rows} · freshness=${source.freshness??'unknown'}`).join('\n')
  const seniorPrompt=seniorUrchin?(urchinGraph?`\n\nMODO ASISTENTE SENIOR DE ERIZO — LOTE ESPECÍFICO:\n- lot_control es la decisión operacional determinística primaria: estado, bloqueos y siguiente acción.\n- urchin_graph amplía esa decisión con proceso, Color/Grade, RX, packing, frío, regulación y Japón.\n- Usa photo_observation como evidencia visual complementaria, nunca como sustituto de un gate.\n- Si photo_observation.visualTwin.measurements existe, es una medición cuantitativa CIELAB y homogeneidad descriptiva.\n- Si visualTwin.comparisonToCanonicalLot contiene deltaE76, úsalo sólo como distancia objetiva; no existe umbral PASS/FAIL.\n- Tu salida normal debe ser una ficha operacional de máximo 5 líneas: estado, señal, bloqueo, siguiente acción y límite si aporta valor.\n- Para Japón usa «APTO JAPÓN» sólo si urchin_graph.japan.releasable es true; en cualquier otro caso «NO LIBERADO JAPÓN».\n- Nunca reemplaces lot_control.nextAction por una acción más agresiva.`:`\n\nMODO ASISTENTE SENIOR DE ERIZO — VISIÓN GENERAL:\n- La selección de lote es opcional. Sin lote, una foto sólo permite descripción prudente.\n- Si preguntan aprobación Japón sin lote, responde «JAPÓN NO EVALUABLE SIN LOTE».\n- No inventes Grade, umbrales ni aprobación regulatoria.`):''
  try{
   const answer=await openAI([{role:'developer',content:[{type:'input_text',text:seafoodAiSystemPrompt(activeOrganization.implementationName)+seniorPrompt}]},{role:'user',content:[{type:'input_text',text:`SOURCES:\n${sourceLegend}\n\nHISTORIAL:\n${conversation}\n\nPREGUNTA:\n${question}\n\nSEAFOOD_SNAPSHOT:\n${JSON.stringify(scopedContext)}`}]}],seniorUrchin?900:1800,seniorUrchin?'medium':'low')
   const invalidTags=invalidSourceTags(answer,new Set(sources.map(source=>source.id)));if(invalidTags.length)throw new Error(`invalid_source_tags:${invalidTags.join(',')}`)
   const suggestions=seniorUrchin?await buildSuggestions(answer,question,Boolean(lotControl),hasPhotoEvidence):[]
   return res.status(200).json({ok:true,answer,suggestedQuestions:suggestions,engine:seniorUrchin?'Asistente Senior de Erizo':'Seafood AI',implementation:activeOrganization.implementationName,policyVersion:SEAFOOD_AI_POLICY_VERSION,model:MODEL,generatedAt:context.generatedAt,scope:scopedContext.scope,sources,photoAnalysis:Boolean(photoObservation),visualTwin:visualTwinMeasurements.length>0,degraded:false,provider:'openai-direct'})
  }catch(modelError){console.error('copilot_model_degraded',modelError instanceof Error?modelError.message:'unknown');const answer=deterministicAnswer(question,lotControl,graphData,visualTwinMeasurements,visualComparison,seniorUrchin);return res.status(200).json({ok:true,answer,suggestedQuestions:fallbackSuggestions(Boolean(lotControl),hasPhotoEvidence),engine:seniorUrchin?'IA Erizo · modo canónico':'Seafood AI · modo canónico',implementation:activeOrganization.implementationName,policyVersion:SEAFOOD_AI_POLICY_VERSION,model:'deterministic-canonical-fallback',generatedAt:context.generatedAt,scope:scopedContext.scope,sources,photoAnalysis:Boolean(photoObservation),visualTwin:visualTwinMeasurements.length>0,degraded:true,provider:'canonical-fallback'})}
 }catch(error){console.error('copilot_error',error instanceof Error?error.message:'unknown');return res.status(502).json({ok:false,error:'Pescamar IA no pudo responder en este momento'})}
}

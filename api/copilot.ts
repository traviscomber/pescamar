import { generateText } from 'ai'
import { requireOperator } from './_auth.js'
import { buildCopilotContext, resolveCopilotPlant } from './_copilot-context.js'
import { buildHistoricalLineageEvidence } from './_copilot-historical-lineage.js'
import { buildCanonicalBusinessIntelligence } from './_canonical-business-intelligence.js'
import { buildSeaUrchinCopilotEvidence } from './_copilot-sea-urchin.js'
import { activeOrganization } from './_organization.js'
import { evidenceClassForSource, invalidSourceTags, SEAFOOD_AI_POLICY_VERSION, seafoodAiSystemPrompt } from './_seafood-ai-policy.js'

type Request={method?:string;headers?:Record<string,string|string[]|undefined>;body?:unknown}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type HistoryTurn={question:string;answer:string}
type Source={id:string;label:string;path:string;rows:number;freshness:string|null}
type VisualMeasurement={index:number;name:string|null;confidence:'good'|'review';usableRatio:number;borderCandidateRatio:number;lMean:number;aMean:number;bMean:number;dispersion:number;chroma:number;hueDeg:number;pixelCount:number}
const MODEL='openai/gpt-5.4-mini',MAX_QUESTION=1800,MAX_HISTORY=6,MAX_IMAGES=3,MAX_IMAGE_CHARS=1800000

function history(value:unknown):HistoryTurn[]{if(!Array.isArray(value))return[];return value.slice(-MAX_HISTORY).flatMap(item=>{if(!item||typeof item!=='object')return[];const row=item as Record<string,unknown>,question=typeof row.question==='string'?row.question.trim().slice(0,MAX_QUESTION):'',answer=typeof row.answer==='string'?row.answer.trim().slice(0,5000):'';return question&&answer?[{question,answer}]:[]})}
function images(value:unknown){if(!Array.isArray(value))return[] as string[];return value.slice(0,MAX_IMAGES).flatMap(item=>typeof item==='string'&&/^data:image\/(jpeg|png|webp);base64,/i.test(item)&&item.length<=MAX_IMAGE_CHARS?[item]:[])}
function suggestedQuestions(text:string){try{const parsed=JSON.parse(text) as unknown;if(!Array.isArray(parsed))return[];return parsed.flatMap(item=>typeof item==='string'?[item.trim().slice(0,140)]:[]).filter(Boolean).slice(0,2)}catch{return[]}}
function record(value:unknown):Record<string,unknown>|null{return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null}
function finite(value:unknown){const parsed=Number(value);return Number.isFinite(parsed)?parsed:null}
function strings(value:unknown){return Array.isArray(value)?value.flatMap(item=>typeof item==='string'&&item.trim()?[item.trim()]:[]):[] as string[]}
function visualMeasurements(value:unknown):VisualMeasurement[]{if(!Array.isArray(value))return[];return value.slice(0,MAX_IMAGES).flatMap(item=>{const row=record(item);if(!row)return[];const index=finite(row.index),usableRatio=finite(row.usableRatio),borderCandidateRatio=finite(row.borderCandidateRatio),lMean=finite(row.lMean),aMean=finite(row.aMean),bMean=finite(row.bMean),dispersion=finite(row.dispersion),chroma=finite(row.chroma),hueDeg=finite(row.hueDeg),pixelCount=finite(row.pixelCount);if(index==null||usableRatio==null||borderCandidateRatio==null||lMean==null||aMean==null||bMean==null||dispersion==null||chroma==null||hueDeg==null||pixelCount==null)return[];return[{index:Math.max(0,Math.min(MAX_IMAGES-1,Math.trunc(index))),name:typeof row.name==='string'?row.name.slice(0,160):null,confidence:row.confidence==='good'?'good':'review',usableRatio:Math.max(0,Math.min(1,usableRatio)),borderCandidateRatio:Math.max(0,Math.min(1,borderCandidateRatio)),lMean,aMean,bMean,dispersion:Math.max(0,dispersion),chroma:Math.max(0,chroma),hueDeg:((hueDeg%360)+360)%360,pixelCount:Math.max(0,Math.trunc(pixelCount))}]})}
function canonicalLotLab(data:Record<string,unknown>|null){const vision=record(data?.vision),latest=record(vision?.latest),lab=record(latest?.lab),l=finite(lab?.l),a=finite(lab?.a),b=finite(lab?.b);return l==null||a==null||b==null?null:{l,a,b}}
function compareVisualToLot(measurements:VisualMeasurement[],data:Record<string,unknown>|null){const canonical=canonicalLotLab(data);if(!canonical)return[];return measurements.map(measurement=>({index:measurement.index,deltaE76:Number(Math.sqrt((measurement.lMean-canonical.l)**2+(measurement.aMean-canonical.a)**2+(measurement.bMean-canonical.b)**2).toFixed(3)),canonicalLab:canonical,interpretation:'distance_only_no_acceptance_threshold'}))}
function fmt(value:number,digits=1){return value.toLocaleString('es-CL',{maximumFractionDigits:digits})}

async function inspectPhotos(imageData:string[],question:string){
 if(!imageData.length)return null
 const instruction=`Analiza estas fotos como especialista senior en proceso y calidad de erizo para una planta chilena. Describe sólo lo realmente visible. Busca, cuando corresponda: producto/parte del proceso, apariencia, color, homogeneidad, daños o contaminación visible, presencia de material extraño, condición de packing/etiqueta, texto o códigos legibles y cualquier señal visual útil. No declares inocuidad, temperatura real, Grade definitivo ni aprobación Japón desde una foto. Distingue observación de inferencia. Resume primero en 2 o 3 observaciones útiles y termina con el principal límite de evidencia. Pregunta del usuario: ${question}`
 const result=await generateText({model:MODEL,messages:[{role:'user',content:[{type:'text',text:instruction},...imageData.map(image=>({type:'image' as const,image}))]}],maxOutputTokens:700,providerOptions:{openai:{reasoningEffort:'low'}}})
 return result.text.trim()||null
}

async function buildSuggestions(answer:string,question:string,hasLot:boolean,hasPhotos:boolean){
 try{
  const result=await generateText({
   model:MODEL,
   system:'Genera exactamente 2 preguntas de seguimiento muy breves en español de Chile. Deben ser útiles para un operador de planta de erizo, no repetir la pregunta anterior, no inventar hechos y no sugerir acciones que impliquen liberar o aprobar producto. Devuelve SOLO un JSON array de 2 strings, sin markdown.',
   prompt:`Pregunta previa: ${question}\nRespuesta: ${answer.slice(0,3200)}\nContexto: lote seleccionado=${hasLot}; fotos adjuntas=${hasPhotos}. Prioriza sólo las dos dudas operacionales de mayor valor: evidencia, calidad, proceso, frío, Japón o trazabilidad según corresponda.`,
   maxOutputTokens:160,
   providerOptions:{openai:{reasoningEffort:'low'}},
  })
  return suggestedQuestions(result.text.trim())
 }catch{return[]}
}

function fallbackSuggestions(hasLot:boolean,hasPhotos:boolean){
 if(hasLot&&hasPhotos)return['¿Qué bloquea este lote ahora?','¿Qué falta para Japón?']
 if(hasLot)return['¿Qué lo bloquea ahora?','¿Está listo para Japón?']
 if(hasPhotos)return['¿Qué dato falta para decidir?','¿Debo vincular un lote?']
 return['¿Qué exige Japón?','¿Qué debería fotografiar?']
}

function deterministicUrchinAnswer(question:string,graph:Record<string,unknown>|null,measurements:VisualMeasurement[],comparison:Array<{index:number;deltaE76:number}>){
 const q=question.toLocaleLowerCase('es-CL'),processData=record(graph?.process),diagnosis=record(graph?.diagnosis),japan=record(graph?.japan),blockers=strings(diagnosis?.blockers),nextAction=typeof diagnosis?.nextAction==='string'?diagnosis.nextAction:''
 const asksJapan=/jap[oó]n|export|liberad|apto/.test(q),asksPhoto=/foto|fotograf|imagen|visual|color|lab|homogene/.test(q),asksBlock=/bloque|falta|pendiente|prioridad/.test(q)
 if(graph){
  const lines:string[]=[]
  if(asksJapan)lines.push(japan?.releasable===true?'APTO JAPÓN':'NO LIBERADO JAPÓN')
  else lines.push(blockers.length?'ATENCIÓN OPERACIONAL':'SIN BLOQUEO OBSERVABLE')
  const grade=String(processData?.grade??'—'),color=String(processData?.colorStatus??'pendiente'),xray=String(processData?.xrayStatus??'pendiente')
  lines.push(`Grade ${grade} · Color ${color} · RX ${xray}.`)
  if(measurements.length&&(asksPhoto||!blockers.length)){const m=measurements[0];lines.push(`Visual Twin: LAB ${fmt(m.lMean)} / ${fmt(m.aMean)} / ${fmt(m.bMean)} · dispersión ${fmt(m.dispersion)} · roe ${Math.round(m.usableRatio*100)}%${m.confidence==='review'?' · revisar captura':''}.`);if(comparison[0])lines.push(`Distancia vs evidencia canónica: ΔE76 ${fmt(comparison[0].deltaE76,2)} · descriptivo, sin umbral PASS/FAIL.`)}
  if(blockers.length&&(asksBlock||asksJapan||lines.length<4))lines.push(`Bloqueo: ${blockers[0]}.`)
  if(nextAction)lines.push(`Siguiente: ${nextAction}`)
  return lines.slice(0,5).join('\n')
 }
 if(asksJapan){return 'JAPÓN NO EVALUABLE SIN LOTE\nPara verificar un embarque hay que vincular el Digital Twin del lote.\nEl gate considera proceso completo, Color / Grade confirmado, RX, packing y etiquetas, frío, evidencia regulatoria y Japan Release.\nSiguiente: agrega el lote que quieres evaluar.'}
 if(/qu[eé].*fotograf|deber[ií]a.*fotograf/.test(q)){return 'FOTO RECOMENDADA\nUsa una muestra representativa de roe, luz uniforme, fondo neutro y sin reflejos fuertes.\nDeja algo de fondo visible para que Visual Twin pueda segmentar el producto.\nLa foto mide CIELAB y homogeneidad; Grade y Japón siguen requiriendo lote y confirmación humana.'}
 if(measurements.length){const m=measurements[0];return `VISUAL TWIN DISPONIBLE\nLAB ${fmt(m.lMean)} / ${fmt(m.aMean)} / ${fmt(m.bMean)} · dispersión ${fmt(m.dispersion)} · roe ${Math.round(m.usableRatio*100)}%.\n${m.confidence==='review'?'La captura necesita repetirse antes de usar la medición para comparar.':'La medición objetiva es estable para descripción.'}\nSiguiente: vincula un lote si quieres cruzarla con Grade, RX, frío y Japón.`}
 return 'IA ERIZO OPERATIVA\nPuedo revisar proceso, calidad, trazabilidad, Color / Grade, RX, frío y Japan Release con evidencia canónica.\nPara una decisión sobre un caso específico, vincula un lote; para calidad visual, agrega una foto.'
}

export default async function handler(req:Request,res:Response){
 res.setHeader('Cache-Control','no-store, max-age=0')
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({ok:false,error:'Método no permitido'})}
 const operator=await requireOperator(req)
 if(!operator)return res.status(401).json({ok:false,error:'Sesión requerida'})
 if(operator.organizationId!==activeOrganization.organizationId)return res.status(403).json({ok:false,error:'Organización fuera de alcance'})
 const body=req.body&&typeof req.body==='object'?req.body as Record<string,unknown>:{}
 const imageData=images(body.images),visualTwinMeasurements=visualMeasurements(body.visualMeasurements)
 const question=(typeof body.question==='string'?body.question.trim().slice(0,MAX_QUESTION):'')||(imageData.length?'Analiza estas fotos y dime qué ves, qué significa y qué debería revisar después.':'')
 if(!question)return res.status(400).json({ok:false,error:'Escribe una pregunta o agrega una foto'})
 const seniorUrchin=body.mode==='sea_urchin_senior'
 const plantId=resolveCopilotPlant(operator,body.plantId)
 if(plantId===undefined)return res.status(403).json({ok:false,error:'Planta fuera de tu alcance'})
 try{
  const [context,historicalLineage,canonicalIntelligence,urchinGraph,photoObservation]=await Promise.all([
   buildCopilotContext(operator,plantId),
   buildHistoricalLineageEvidence(operator),
   buildCanonicalBusinessIntelligence(operator),
   buildSeaUrchinCopilotEvidence(operator,body.receptionId),
   inspectPhotos(imageData,question).catch(error=>{console.warn('copilot_photo_degraded',error instanceof Error?error.message:'unknown');return null}),
  ])
  const graphData=urchinGraph?.data??null,visualComparison=compareVisualToLot(visualTwinMeasurements,graphData)
  const hasPhotoEvidence=imageData.length>0||visualTwinMeasurements.length>0
  const photoSource:Source|null=hasPhotoEvidence?{id:'photo_observation',label:visualTwinMeasurements.length?`Visual Twin · ${Math.max(imageData.length,visualTwinMeasurements.length)} foto${Math.max(imageData.length,visualTwinMeasurements.length)===1?'':'s'}`:`Fotos adjuntas · ${imageData.length}`,path:'/proceso-erizo',rows:Math.max(imageData.length,visualTwinMeasurements.length),freshness:new Date().toISOString()}:null
  const extraSources=[historicalLineage?.source,canonicalIntelligence?.source,urchinGraph?.source,photoSource].filter((source):source is Source=>Boolean(source))
  const baseSources=[...context.sources,...extraSources]
  const sources=baseSources.map(source=>{const evidenceClass=evidenceClassForSource(source.id);if(!evidenceClass)throw new Error(`unclassified_source:${source.id}`);return {...source,evidenceClass}})
  const extraData={...(historicalLineage?{historical_lineage:historicalLineage.data}:{}),...(canonicalIntelligence?{canonical_intelligence:canonicalIntelligence.data}:{}),...(urchinGraph?{urchin_graph:urchinGraph.data}:{}),...(hasPhotoEvidence?{photo_observation:{images:imageData.length,analysis:photoObservation,persistence:'ephemeral_user_attachment',linkedReceptionId:urchinGraph?body.receptionId??null:null,visualTwin:{method:'univision_cielab_v1',measurements:visualTwinMeasurements,comparisonToCanonicalLot:visualComparison,rule:'descriptive_only_no_grade_or_acceptance_threshold'}}}:{})}
  const scopedContext={...context,scope:{...context.scope,organizationId:operator.organizationId},sources,data:{...context.data,...extraData}}
  const conversation=history(body.history).map((turn,index)=>`TURNO ${index+1}\nPREGUNTA: ${turn.question}\nRESPUESTA: ${turn.answer}`).join('\n\n')||'Sin turnos previos.'
  const sourceLegend=sources.map(source=>`[${source.id}] ${source.label} · class=${source.evidenceClass} · rows=${source.rows} · freshness=${source.freshness??'unknown'}`).join('\n')
  const seniorPrompt=seniorUrchin?(urchinGraph?`\n\nMODO ASISTENTE SENIOR DE ERIZO — LOTE ESPECÍFICO:\n- urchin_graph es la verdad operacional del lote. Usa photo_observation como evidencia visual complementaria, nunca como sustituto de un gate.\n- Si photo_observation.visualTwin.measurements existe, es una medición cuantitativa CIELAB y homogeneidad calculada con segmentación determinística de roe en el navegador. Es evidencia descriptiva efímera, no una aprobación.\n- Si visualTwin.comparisonToCanonicalLot contiene deltaE76, úsalo sólo como distancia objetiva respecto de la última captura canónica del lote. NO existe todavía un umbral de aceptación; nunca conviertas ese ΔE en PASS/FAIL ni Grade.\n- Si confidence=review, prioriza recomendar repetir la captura antes de sacar conclusiones cuantitativas.\n- Tu salida normal debe parecer una ficha operacional, no un informe. Máximo 5 líneas o bloques muy breves salvo que el usuario pida detalle.\n- Primera línea: estado decisivo. Para Japón, usa exactamente «APTO JAPÓN» sólo si urchin_graph.japan.releasable es true; en cualquier otro caso «NO LIBERADO JAPÓN».\n- Segunda línea: resume Grade, Color, RX y/o calidad visual sólo si están observados.\n- Tercera línea: principal bloqueo o dato faltante.\n- Cuarta línea, si aporta valor: «Siguiente: …» usando diagnosis.nextAction.\n- Quinta línea opcional: límite de evidencia.\n- No repitas antecedentes ni enumeres todos los gates salvo que el usuario lo solicite.\n- Distingue calidad visual, Grade, condición operacional y habilitación regulatoria/exportadora.\n- Si hay fotos, explica en una frase qué muestran y cómo se relaciona la huella objetiva con el estado registrado, sin asumir identidad/procedencia del lote.\n- Mantén lectura solamente: puedes recomendar revisión, nunca aprobar, liberar ni cambiar parámetros.`:`\n\nMODO ASISTENTE SENIOR DE ERIZO — VISIÓN GENERAL:\n- La selección de lote es opcional. Si no hay urchin_graph, trabaja con evidencia canónica/histórica/operacional y con photo_observation si existe.\n- Si photo_observation.visualTwin.measurements existe, puedes citar LAB, dispersión, proporción de roe y calidad de segmentación como mediciones objetivas. No inventes Grade ni umbrales.\n- Tu salida normal debe ser muy breve: 3 a 5 líneas. Empieza por la conclusión útil, luego evidencia visible/medida, luego el dato que falta o la siguiente acción segura.\n- Una foto puede analizarse sin lote: describe lo visible con prudencia. No declares inocuidad, Grade final ni aprobación Japón desde imagen.\n- Si preguntan aprobación Japón sin lote, responde «JAPÓN NO EVALUABLE SIN LOTE» y explica en una sola frase que hace falta asociar el Digital Twin.\n- No conviertas histórico o foto en aprobación regulatoria.\n- Ofrece detalle sólo cuando el usuario lo pida.`):''
  try{
   const result=await generateText({model:MODEL,system:seafoodAiSystemPrompt(activeOrganization.implementationName)+seniorPrompt,prompt:`SOURCES:\n${sourceLegend}\n\nHISTORIAL:\n${conversation}\n\nPREGUNTA:\n${question}\n\nSEAFOOD_SNAPSHOT:\n${JSON.stringify(scopedContext)}`,maxOutputTokens:seniorUrchin?900:1800,providerOptions:{openai:{reasoningEffort:seniorUrchin?'medium':'low'}}})
   const answer=result.text.trim()
   if(!answer)throw new Error('empty_answer')
   const invalidTags=invalidSourceTags(answer,new Set(sources.map(source=>source.id)))
   if(invalidTags.length)throw new Error(`invalid_source_tags:${invalidTags.join(',')}`)
   const suggestions=seniorUrchin?await buildSuggestions(answer,question,Boolean(urchinGraph),Boolean(hasPhotoEvidence)):[]
   return res.status(200).json({ok:true,answer,suggestedQuestions:suggestions,engine:seniorUrchin?'Asistente Senior de Erizo':'Seafood AI',implementation:activeOrganization.implementationName,policyVersion:SEAFOOD_AI_POLICY_VERSION,model:MODEL,generatedAt:context.generatedAt,scope:scopedContext.scope,sources,photoAnalysis:Boolean(photoObservation),visualTwin:visualTwinMeasurements.length>0,degraded:false})
  }catch(modelError){
   console.warn('copilot_model_degraded',modelError instanceof Error?modelError.message:'unknown')
   const answer=deterministicUrchinAnswer(question,graphData,visualTwinMeasurements,visualComparison)
   return res.status(200).json({ok:true,answer,suggestedQuestions:fallbackSuggestions(Boolean(urchinGraph),hasPhotoEvidence),engine:seniorUrchin?'IA Erizo · modo canónico':'Seafood AI · modo canónico',implementation:activeOrganization.implementationName,policyVersion:SEAFOOD_AI_POLICY_VERSION,model:'deterministic-canonical-fallback',generatedAt:context.generatedAt,scope:scopedContext.scope,sources,photoAnalysis:Boolean(photoObservation),visualTwin:visualTwinMeasurements.length>0,degraded:true})
  }
 }catch(error){console.error('copilot_error',error instanceof Error?error.message:'unknown');return res.status(502).json({ok:false,error:'Pescamar IA no pudo responder en este momento'})}
}

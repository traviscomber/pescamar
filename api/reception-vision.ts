import { requireOperator } from "./_auth.js";
import { getSql } from "./_db.js";

declare const process:{env:Record<string,string|undefined>};
declare const fetch:(input:string,init?:Record<string,unknown>)=>Promise<{ok:boolean;status:number;json:()=>Promise<unknown>}>;
declare const Buffer:{from:(input:string,encoding?:string)=>{length:number}};

type Request={method?:string;body?:unknown;headers?:Record<string,string|string[]|undefined>};
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void};
type Input={fileName?:unknown;mimeType?:unknown;dataBase64?:unknown};
type VisionResult={supplier:string|null;guideReference:string|null;zone:string|null;species:string|null;guide:number|null;gross:number|null;tare:number|null;drained:number|null;temperature:number|null;occurredAt:string|null;documentType:string|null;ocrText:string;confidence:number};

const allowedMime=new Set(["image/jpeg","image/png","image/webp"]);
const clean=(value:unknown,max=180)=>String(value??"").trim().replace(/\s+/g," ").slice(0,max);
const visionPrompt=`Analiza esta fotografía de un documento o respaldo de recepción pesquera chilena. Extrae únicamente valores visibles y legibles; nunca infieras ni completes datos ausentes. Devuelve SOLO JSON válido, sin markdown, con exactamente estas claves: supplier, guideReference, zone, species, guide, gross, tare, drained, temperature, occurredAt, documentType, ocrText, confidence. supplier, guideReference, zone, documentType y occurredAt son string o null. species debe ser exactamente Erizo, Loco, Jaiba, Centolla, Pulpo, Pescado o Algas si es inequívoco; si no, null. guide, gross, tare, drained y temperature son number o null. Pesos en kg sin unidad y temperatura en °C. occurredAt en ISO 8601 únicamente si fecha y hora son explícitas; si falta hora, null. ocrText es una transcripción breve de los campos relevantes visibles. confidence es un número entre 0 y 1.`;

function header(request:Request,name:string){const entry=Object.entries(request.headers??{}).find(([key])=>key.toLowerCase()===name.toLowerCase())?.[1];return Array.isArray(entry)?entry[0]:entry}
function chatOutput(payload:unknown){const data=payload as {choices?:Array<{message?:{content?:string}}>};return data.choices?.[0]?.message?.content??""}
function parseVision(text:string):VisionResult{
  const normalized=text.trim().replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/,"");
  const raw=JSON.parse(normalized) as Record<string,unknown>;
  const nullableText=(key:string)=>typeof raw[key]==="string"&&String(raw[key]).trim()?clean(raw[key],500):null;
  const nullableNumber=(key:string)=>typeof raw[key]==="number"&&Number.isFinite(raw[key])?Number(raw[key]):null;
  const species=nullableText("species");
  const allowedSpecies=new Set(["Erizo","Loco","Jaiba","Centolla","Pulpo","Pescado","Algas"]);
  return {supplier:nullableText("supplier"),guideReference:nullableText("guideReference"),zone:nullableText("zone"),species:species&&allowedSpecies.has(species)?species:null,guide:nullableNumber("guide"),gross:nullableNumber("gross"),tare:nullableNumber("tare"),drained:nullableNumber("drained"),temperature:nullableNumber("temperature"),occurredAt:nullableText("occurredAt"),documentType:nullableText("documentType"),ocrText:typeof raw.ocrText==="string"?clean(raw.ocrText,2000):"",confidence:typeof raw.confidence==="number"&&Number.isFinite(raw.confidence)?Math.max(0,Math.min(1,raw.confidence)):0};
}

export default async function handler(request:Request,response:Response){
  response.setHeader("Cache-Control","no-store");
  const operator=await requireOperator(request);
  if(!operator)return response.status(401).json({ok:false,error:"Sesión requerida"});
  const apiKey=process.env.OPENAI_API_KEY;
  const model=process.env.OPENAI_VISION_MODEL||"gpt-4o-mini";
  if(request.method==="GET")return response.status(200).json({ok:true,configured:Boolean(apiKey),provider:"openai",model});
  if(request.method!=="POST"){response.setHeader("Allow","GET, POST");return response.status(405).json({ok:false,error:"Método no permitido"})}
  if(!["admin","operations","quality"].includes(operator.role))return response.status(403).json({ok:false,error:"Tu rol no puede registrar evidencia"});

  const input=(request.body??{}) as Input;
  const fileName=clean(input.fileName,180)||"evidencia.jpg";
  const mimeType=clean(input.mimeType,80).toLowerCase();
  const dataBase64=String(input.dataBase64??"").replace(/^data:[^;]+;base64,/,"").trim();
  if(!allowedMime.has(mimeType)||!dataBase64)return response.status(400).json({ok:false,error:"Usa una fotografía JPG, PNG o WebP"});
  const bytes=Buffer.from(dataBase64,"base64").length;
  if(bytes<100||bytes>3*1024*1024)return response.status(400).json({ok:false,error:"La fotografía procesada no puede superar 3 MB"});

  const sql=getSql();
  const stored=await sql`insert into reception_evidence_files(file_name,mime_type,data_base64,byte_size,created_by) values(${fileName},${mimeType},${dataBase64},${bytes},${operator.fullName}) returning id` as Array<Record<string,unknown>>;
  const id=String(stored[0]?.id??"");
  const host=header(request,"x-forwarded-host")||header(request,"host")||"pescamar-three.vercel.app";
  const evidenceUrl=`https://${host}/api/reception-evidence-file?id=${encodeURIComponent(id)}`;
  const evidence={kind:"photo",label:fileName,url:evidenceUrl,note:"Fotografía de recepción"};

  if(!apiKey)return response.status(200).json({ok:true,evidence,vision:null,warning:"La foto quedó guardada. Agrega OPENAI_API_KEY en Vercel para activar Vision"});

  try{
    const ai=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json"},body:JSON.stringify({model,temperature:0,messages:[{role:"user",content:[{type:"text",text:visionPrompt},{type:"image_url",image_url:{url:`data:${mimeType};base64,${dataBase64}`,detail:"high"}}]}]})});
    if(!ai.ok){await ai.json();return response.status(200).json({ok:true,evidence,vision:null,warning:`La foto quedó guardada, pero OpenAI Vision respondió ${ai.status}`})}
    const payload=await ai.json();const vision=parseVision(chatOutput(payload));
    return response.status(200).json({ok:true,evidence:{...evidence,note:vision.guideReference?`IA: ${vision.guideReference}`:"Analizada con Vision"},vision,provider:"openai",model});
  }catch{
    return response.status(200).json({ok:true,evidence,vision:null,warning:"La foto quedó guardada, pero no fue posible completar el análisis Vision"});
  }
}

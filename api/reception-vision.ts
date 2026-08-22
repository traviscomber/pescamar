import { requireOperator } from "./_auth.js";
import { getSql } from "./_db.js";
import { ensureReceptionSchema } from "./_reception-schema.js";

declare const process:{env:Record<string,string|undefined>};
declare const fetch:(input:string,init?:Record<string,unknown>)=>Promise<{ok:boolean;status:number;json:()=>Promise<unknown>}>;
declare const Buffer:{from:(input:string,encoding?:string)=>{length:number}};

type Request={method?:string;body?:unknown;headers?:Record<string,string|string[]|undefined>};
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void};
type Input={fileName?:unknown;mimeType?:unknown;dataBase64?:unknown};
type VisionResult={supplier:string|null;guideReference:string|null;zone:string|null;species:string|null;guide:number|null;gross:number|null;tare:number|null;drained:number|null;temperature:number|null;occurredAt:string|null;documentType:string|null;ocrText:string;confidence:number};

const allowedMime=new Set(["image/jpeg","image/png","image/webp"]);
const clean=(value:unknown,max=180)=>String(value??"").trim().replace(/\s+/g," ").slice(0,max);

function header(request:Request,name:string){const value=request.headers?.[name]??request.headers?.[name.toLowerCase()];return Array.isArray(value)?value[0]:value}
function outputText(payload:unknown){const data=payload as {choices?:Array<{message?:{content?:string}}>};return data.choices?.[0]?.message?.content??""}

export default async function handler(request:Request,response:Response){
  response.setHeader("Cache-Control","no-store");
  const operator=await requireOperator(request);
  if(!operator)return response.status(401).json({ok:false,error:"Sesión requerida"});
  if(request.method!=="POST"){response.setHeader("Allow","POST");return response.status(405).json({ok:false,error:"Método no permitido"})}
  if(!["admin","operations","quality"].includes(operator.role))return response.status(403).json({ok:false,error:"Tu rol no puede registrar evidencia"});

  const input=(request.body??{}) as Input;
  const fileName=clean(input.fileName,180)||"evidencia.jpg";
  const mimeType=clean(input.mimeType,80).toLowerCase();
  const dataBase64=String(input.dataBase64??"").replace(/^data:[^;]+;base64,/,"").trim();
  if(!allowedMime.has(mimeType)||!dataBase64)return response.status(400).json({ok:false,error:"Usa una fotografía JPG, PNG o WebP"});
  const bytes=Buffer.from(dataBase64,"base64").length;
  if(bytes<100||bytes>8*1024*1024)return response.status(400).json({ok:false,error:"La fotografía debe pesar entre 100 bytes y 8 MB"});

  await ensureReceptionSchema();
  const sql=getSql();
  const stored=await sql`insert into reception_evidence_files(file_name,mime_type,data_base64,byte_size,created_by) values(${fileName},${mimeType},${dataBase64},${bytes},${operator.fullName}) returning id` as Array<Record<string,unknown>>;
  const id=String(stored[0]?.id??"");
  const host=header(request,"x-forwarded-host")||header(request,"host")||"pescamar-three.vercel.app";
  const evidenceUrl=`https://${host}/api/reception-evidence-file?id=${encodeURIComponent(id)}`;

  const apiKey=process.env.OPENAI_API_KEY;
  if(!apiKey)return response.status(200).json({ok:true,evidence:{kind:"photo",label:fileName,url:evidenceUrl,note:"Fotografía de recepción"},vision:null,warning:"La foto quedó guardada, pero Vision requiere OPENAI_API_KEY en Vercel"});

  const schema={
    type:"object",additionalProperties:false,
    properties:{
      supplier:{type:["string","null"]},guideReference:{type:["string","null"]},zone:{type:["string","null"]},species:{type:["string","null"]},
      guide:{type:["number","null"]},gross:{type:["number","null"]},tare:{type:["number","null"]},drained:{type:["number","null"]},temperature:{type:["number","null"]},
      occurredAt:{type:["string","null"]},documentType:{type:["string","null"]},ocrText:{type:"string"},confidence:{type:"number",minimum:0,maximum:1}
    },
    required:["supplier","guideReference","zone","species","guide","gross","tare","drained","temperature","occurredAt","documentType","ocrText","confidence"]
  };
  const prompt="Analiza esta fotografía de un documento o respaldo de recepción pesquera chilena. Extrae únicamente valores que sean visibles y legibles. No infieras ni completes datos ausentes. Para species usa, si corresponde claramente, uno de: Erizo, Loco, Jaiba, Centolla, Pulpo, Pescado, Algas; si no, null. Los pesos deben ser números en kg sin unidad. temperature en °C. occurredAt debe ser ISO 8601 sólo si la fecha y hora son explícitas; si falta hora, usa null. guideReference es folio, número de guía o documento. ocrText debe contener una transcripción breve de los campos relevantes visibles. confidence resume la confianza global entre 0 y 1.";

  try{
    const ai=await fetch("https://api.openai.com/v1/chat/completions",{
      method:"POST",
      headers:{"Authorization":`Bearer ${apiKey}`,"Content-Type":"application/json"},
      body:JSON.stringify({
        model:process.env.OPENAI_VISION_MODEL||"gpt-4o-mini",
        temperature:0,
        messages:[{role:"user",content:[{type:"text",text:prompt},{type:"image_url",image_url:{url:`data:${mimeType};base64,${dataBase64}`,detail:"high"}}]}],
        response_format:{type:"json_schema",json_schema:{name:"pescamar_reception_document",strict:true,schema}}
      })
    });
    if(!ai.ok){const detail=await ai.json();return response.status(200).json({ok:true,evidence:{kind:"photo",label:fileName,url:evidenceUrl,note:"Fotografía de recepción"},vision:null,warning:`La foto quedó guardada, pero Vision respondió ${ai.status}`,detail})}
    const parsed=await ai.json();
    const text=outputText(parsed);
    const vision=JSON.parse(text) as VisionResult;
    return response.status(200).json({ok:true,evidence:{kind:"photo",label:fileName,url:evidenceUrl,note:vision.guideReference?`IA: ${vision.guideReference}`:"Analizada con Vision"},vision});
  }catch{
    return response.status(200).json({ok:true,evidence:{kind:"photo",label:fileName,url:evidenceUrl,note:"Fotografía de recepción"},vision:null,warning:"La foto quedó guardada, pero no fue posible completar el análisis Vision"});
  }
}

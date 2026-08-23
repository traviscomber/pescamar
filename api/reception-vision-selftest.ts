import { requireOperator } from "./_auth.js";

declare const process:{env:Record<string,string|undefined>};
declare const fetch:(input:string,init?:Record<string,unknown>)=>Promise<{ok:boolean;status:number;json:()=>Promise<unknown>}>;

type Request={method?:string;headers?:Record<string,string|string[]|undefined>};
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void};
type VisionResult={supplier:string|null;guideReference:string|null;zone:string|null;species:string|null;guide:number|null;gross:number|null;tare:number|null;drained:number|null;temperature:number|null;occurredAt:string|null;documentType:string|null;ocrText:string;confidence:number};

const clean=(value:unknown,max=180)=>String(value??"").trim().replace(/\s+/g," ").slice(0,max);
const prompt=`Analiza esta imagen de prueba de un documento de recepción pesquera chilena. Extrae únicamente valores visibles y legibles; nunca infieras ni completes datos ausentes. Devuelve SOLO JSON válido, sin markdown, con exactamente estas claves: supplier, guideReference, zone, species, guide, gross, tare, drained, temperature, occurredAt, documentType, ocrText, confidence. supplier, guideReference, zone, documentType y occurredAt son string o null. species debe ser exactamente Erizo, Loco, Jaiba, Centolla, Pulpo, Pescado o Algas si es inequívoco; si no, null. guide, gross, tare, drained y temperature son number o null. Pesos en kg sin unidad y temperatura en °C. occurredAt en ISO 8601 únicamente si fecha y hora son explícitas. ocrText es una transcripción breve de los campos relevantes visibles. confidence es un número entre 0 y 1.`;
const expected={supplier:"Mar Austral SpA",guideReference:"G-2026-00421",zone:"Quellon",species:"Erizo",guide:100,gross:108,tare:8,drained:96,temperature:4.2,occurredAt:"2026-08-22T15:30:00",documentType:"Guia de despacho"};
const imageUrl="https://placehold.co/1200x800/FFFFFF/000000/png?text=GUIA%20RECEPCION%20PESCAMAR%0AProveedor%3A%20Mar%20Austral%20SpA%0AFolio%3A%20G-2026-00421%0AZona%3A%20Quellon%0AEspecie%3A%20Erizo%0APeso%20guia%3A%20100.0%20kg%0APeso%20bruto%3A%20108.0%20kg%0ATara%3A%208.0%20kg%0APeso%20escurrido%3A%2096.0%20kg%0ATemperatura%3A%204.2%20C%0AFecha%20y%20hora%3A%2022%2F08%2F2026%2015%3A30%0ADocumento%3A%20Guia%20de%20despacho";

function outputText(payload:unknown){const data=payload as {choices?:Array<{message?:{content?:string}}>};return data.choices?.[0]?.message?.content??""}
function parseVision(text:string):VisionResult{
  const normalized=text.trim().replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/,"");
  const raw=JSON.parse(normalized) as Record<string,unknown>;
  const nullableText=(key:string)=>typeof raw[key]==="string"&&String(raw[key]).trim()?clean(raw[key],500):null;
  const nullableNumber=(key:string)=>typeof raw[key]==="number"&&Number.isFinite(raw[key])?Number(raw[key]):null;
  const species=nullableText("species");
  const allowedSpecies=new Set(["Erizo","Loco","Jaiba","Centolla","Pulpo","Pescado","Algas"]);
  return {supplier:nullableText("supplier"),guideReference:nullableText("guideReference"),zone:nullableText("zone"),species:species&&allowedSpecies.has(species)?species:null,guide:nullableNumber("guide"),gross:nullableNumber("gross"),tare:nullableNumber("tare"),drained:nullableNumber("drained"),temperature:nullableNumber("temperature"),occurredAt:nullableText("occurredAt"),documentType:nullableText("documentType"),ocrText:typeof raw.ocrText==="string"?clean(raw.ocrText,2000):"",confidence:typeof raw.confidence==="number"&&Number.isFinite(raw.confidence)?Math.max(0,Math.min(1,raw.confidence)):0};
}
function norm(value:unknown){return String(value??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9.:-]/g,"")}
function same(key:string,actual:unknown,expectedValue:unknown){
  if(typeof expectedValue==="number")return typeof actual==="number"&&Math.abs(actual-expectedValue)<0.01;
  if(key==="occurredAt"){const a=Date.parse(String(actual??""));const e=Date.parse(String(expectedValue));return Number.isFinite(a)&&Number.isFinite(e)&&Math.abs(a-e)<60000;}
  return norm(actual)===norm(expectedValue);
}

export default async function handler(request:Request,response:Response){
  response.setHeader("Cache-Control","no-store");
  const operator=await requireOperator(request);
  if(!operator)return response.status(401).json({ok:false,error:"Sesión requerida"});
  if(request.method!=="GET")return response.status(405).json({ok:false,error:"Método no permitido"});
  const apiKey=process.env.OPENAI_API_KEY;
  if(!apiKey)return response.status(503).json({ok:false,configured:false,score:0,error:"OPENAI_API_KEY no disponible"});
  const model=process.env.OPENAI_VISION_MODEL||"gpt-4o-mini";
  try{
    const ai=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json"},body:JSON.stringify({model,temperature:0,messages:[{role:"user",content:[{type:"text",text:prompt},{type:"image_url",image_url:{url:imageUrl,detail:"high"}}]}]})});
    if(!ai.ok)return response.status(502).json({ok:false,configured:true,score:0,error:`OpenAI ${ai.status}`});
    const payload=await ai.json();
    const vision=parseVision(outputText(payload));
    const keys=Object.keys(expected) as Array<keyof typeof expected>;
    const checks=keys.map((key)=>({field:key,expected:expected[key],actual:vision[key],pass:same(String(key),vision[key],expected[key])}));
    const passed=checks.filter((item)=>item.pass).length;
    const extractionScore=Math.round((passed/checks.length)*100);
    const confidenceScore=Math.round(vision.confidence*100);
    const score=Math.round(extractionScore*0.85+confidenceScore*0.15);
    return response.status(200).json({ok:true,configured:true,model,imageSource:"synthetic-nonpersistent",fields:checks.length,passed,extractionScore,confidenceScore,score,checks,ocrText:vision.ocrText});
  }catch(error){return response.status(500).json({ok:false,configured:true,score:0,error:error instanceof Error?error.message:"Self-test falló"});}
}

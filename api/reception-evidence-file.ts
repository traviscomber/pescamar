import { requireOperator } from "./_auth.js";
import { getSql } from "./_db.js";
import { hasPlantAccess } from "./_plants.js";

declare const Buffer:{from:(input:string,encoding?:string)=>{length:number}};
type Binary={length:number};
type Request = { method?: string; query?: Record<string,string|string[]|undefined>; headers?: Record<string,string|string[]|undefined> };
type Response = { status:(code:number)=>Response; setHeader:(name:string,value:string)=>void; end:(body?:Binary|string)=>void; json:(body:unknown)=>void };

const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function handler(request:Request,response:Response){
  response.setHeader("Cache-Control","private, no-store, max-age=0");
  const operator=await requireOperator(request);
  if(!operator)return response.status(401).json({ok:false,error:"Sesión requerida"});
  if(request.method!=="GET"){response.setHeader("Allow","GET");return response.status(405).json({ok:false,error:"Método no permitido"})}
  const id=Array.isArray(request.query?.id)?request.query?.id[0]:request.query?.id;
  if(!id||!uuidPattern.test(id))return response.status(400).json({ok:false,error:"Archivo inválido"});

  const rows=await getSql()`
    select f.file_name,f.mime_type,f.data_base64,f.created_by,
      e.reception_id,r.plant_id
    from reception_evidence_files f
    left join reception_evidence e on e.url like ('%id=' || f.id::text || '%')
    left join receptions r on r.id=e.reception_id
    where f.id=${id}::uuid
    order by e.created_at desc nulls last
    limit 1` as Array<Record<string,unknown>>;
  const row=rows[0];
  if(!row)return response.status(404).json({ok:false,error:"Evidencia no encontrada"});

  const receptionId=row.reception_id?String(row.reception_id):null;
  const plantId=row.plant_id?String(row.plant_id):null;
  const uploadedBy=String(row.created_by??"");
  const mayAccess=operator.role==="admin"
    || (receptionId!==null&&plantId!==null&&hasPlantAccess(operator,plantId))
    || (receptionId===null&&uploadedBy===operator.fullName);
  if(!mayAccess)return response.status(403).json({ok:false,error:"No tienes acceso a esta evidencia"});

  const mime=String(row.mime_type??"application/octet-stream");
  const fileName=String(row.file_name??"evidencia").replace(/[\r\n"\\]/g,"_");
  const data=Buffer.from(String(row.data_base64??""),"base64");
  response.setHeader("Content-Type",mime);
  response.setHeader("Content-Length",String(data.length));
  response.setHeader("Content-Disposition",`inline; filename="${fileName}"`);
  response.setHeader("X-Content-Type-Options","nosniff");
  return response.status(200).end(data);
}

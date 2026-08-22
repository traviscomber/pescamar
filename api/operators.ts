import { hashPassword, requireOperator } from "./_auth.js";
import { getSql } from "./_db.js";
import { isAdminAuthorized, isAdminConfigured } from "./_admin.js";

type Request={method?:string;body?:unknown;headers?:Record<string,string|string[]|undefined>};
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void};
type OperatorInput={name?:unknown;email?:unknown;role?:unknown;password?:unknown;plantIds?:unknown};
const roles=new Set(["admin","operations","finance","quality","viewer"]);
const emailPattern=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(request:Request,response:Response){
  response.setHeader("Cache-Control","no-store");
  try{
    const admin=await requireOperator(request,["admin"]);
    const bootstrap=isAdminConfigured()&&isAdminAuthorized(request);
    if(!admin&&!bootstrap)return response.status(401).json({ok:false,error:"Sesión de administrador requerida"});
    if(request.method==="GET"){
      const rows=await getSql()`select id,full_name,email,role,active,plant_ids,created_at,(password_hash is not null) as credentials_ready from operators order by active desc,full_name asc`;
      return response.status(200).json({ok:true,operators:rows,bootstrap:!admin&&bootstrap});
    }
    if(request.method==="POST"){
      const input=(request.body??{}) as OperatorInput;
      const name=String(input.name??"").trim(),email=String(input.email??"").trim().toLowerCase(),role=String(input.role??""),password=String(input.password??"");
      const plantIds=Array.isArray(input.plantIds)?input.plantIds.map(String).map(value=>value.trim()).filter(Boolean):[];
      if(name.length<2||name.length>120||!emailPattern.test(email)||email.length>254||!roles.has(role)||password.length<12)return response.status(400).json({ok:false,error:"Nombre, correo, rol y contraseña de al menos 12 caracteres son obligatorios"});
      const passwordHash=hashPassword(password);
      const rows=await getSql()`insert into operators (full_name,email,role,password_hash,plant_ids) values (${name},${email},${role},${passwordHash},${plantIds}) on conflict (lower(email)) do update set full_name=excluded.full_name,role=excluded.role,password_hash=excluded.password_hash,plant_ids=excluded.plant_ids,active=true,updated_at=now() returning id,full_name,email,role,active,plant_ids,created_at,true as credentials_ready`;
      return response.status(201).json({ok:true,operator:Array.isArray(rows)?rows[0]:null});
    }
    response.setHeader("Allow","GET, POST");
    return response.status(405).json({ok:false,error:"Método no permitido"});
  }catch(error){
    const configuration=error instanceof Error&&error.message.includes("DATABASE_URL");
    const migration=error instanceof Error&&(error.message.includes("password_hash")||error.message.includes("operator_sessions"));
    return response.status(configuration||migration?503:500).json({ok:false,error:configuration?"Base de datos no conectada":migration?"Falta aplicar la migración 003_operator_auth.sql":"No fue posible administrar operadores"});
  }
}

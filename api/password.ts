import { hashPassword, requireOperator, verifyPassword } from "./_auth.js";
import { recordAuthEvent } from "./_auth-security.js";
import { getSql } from "./_db.js";
import { allowClientIp } from "./_rate-limit.js";

type Request={method?:string;body?:unknown;headers?:Record<string,string|string[]>};
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void};
type PasswordInput={currentPassword?:unknown;newPassword?:unknown};

// Self-service password change with a live session. This is the only way to
// clear operators.must_change_password, so accounts created or reset by
// management with a temporary password cannot reach the application until the
// operator chooses their own credential. Current password is verified against
// the stored scrypt hash and the rotation is audit-logged.

export default async function handler(request:Request,response:Response){
  response.setHeader("Cache-Control","no-store");
  try{
    if(request.method!=="POST"){
      response.setHeader("Allow","POST");
      return response.status(405).json({ok:false,error:"Método no permitido"});
    }
    if(!allowClientIp(request,60_000,10))return response.status(429).json({ok:false,error:"Demasiados cambios de contraseña por minuto"});
    const operator=await requireOperator(request);
    if(!operator)return response.status(401).json({ok:false,error:"Sesión requerida"});
    const input=(request.body??{}) as PasswordInput;
    const currentPassword=String(input.currentPassword??"");
    const newPassword=String(input.newPassword??"");
    if(currentPassword.length<8||currentPassword.length>256||newPassword.length<12||newPassword.length>256)
      return response.status(400).json({ok:false,error:"La contraseña actual y una nueva de 12 a 256 caracteres son obligatorias"});
    if(currentPassword===newPassword)return response.status(400).json({ok:false,error:"La nueva contraseña debe ser distinta de la temporal"});
    const rows=await getSql()`select password_hash from operators where id=${operator.id}::uuid limit 1`;
    const stored=Array.isArray(rows)?(rows[0] as {password_hash?:string|null}|undefined)?.password_hash??null:null;
    if(!verifyPassword(currentPassword,stored))return response.status(403).json({ok:false,error:"La contraseña actual no es válida"});
    await getSql()`update operators set password_hash=${hashPassword(newPassword)},must_change_password=false,updated_at=now() where id=${operator.id}::uuid`;
    await recordAuthEvent("password_changed",request,operator.email,operator.id,{role:operator.role});
    return response.status(200).json({ok:true});
  }catch(error){
    const message=error instanceof Error?error.message:"";
    const configuration=message.includes("DATABASE_URL");
    const migration=message.includes("password_hash")||message.includes("must_change_password");
    return response.status(configuration||migration?503:500).json({ok:false,error:configuration?"Base de datos no conectada":migration?"Faltan migraciones de credenciales":"No fue posible cambiar la contraseña"});
  }
}

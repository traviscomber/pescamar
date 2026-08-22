import { createSession, clearSessionCookie, destroySession, requireOperator, sessionCookie, verifyPassword } from "./_auth.js";
import { getSql } from "./_db.js";

type Request={method?:string;body?:unknown;headers?:Record<string,string|string[]|undefined>};
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void};
type LoginInput={email?:unknown;password?:unknown};

export default async function handler(request:Request,response:Response){
  response.setHeader("Cache-Control","no-store");
  try{
    if(request.method==="GET"){
      const operator=await requireOperator(request);
      if(!operator)return response.status(401).json({ok:false,error:"Sesión requerida"});
      return response.status(200).json({ok:true,operator});
    }
    if(request.method==="POST"){
      const input=(request.body??{}) as LoginInput;
      const email=String(input.email??"").trim().toLowerCase(),password=String(input.password??"");
      if(!email||password.length<10)return response.status(400).json({ok:false,error:"Correo o contraseña inválidos"});
      const rows=await getSql()`select id,full_name,email,role,password_hash,plant_ids from operators where lower(email)=${email} and active=true limit 1`;
      const row=Array.isArray(rows)?rows[0] as {id:string;full_name:string;email:string;role:string;password_hash:string|null;plant_ids:string[]}|undefined:undefined;
      if(!row||!verifyPassword(password,row.password_hash))return response.status(401).json({ok:false,error:"Correo o contraseña inválidos"});
      await getSql()`delete from operator_sessions where expires_at<=now()`;
      const session=await createSession(row.id);
      response.setHeader("Set-Cookie",sessionCookie(session.token,session.maxAge));
      return response.status(200).json({ok:true,operator:{id:row.id,fullName:row.full_name,email:row.email,role:row.role,plantIds:row.plant_ids??[]}});
    }
    if(request.method==="DELETE"){
      await destroySession(request);
      response.setHeader("Set-Cookie",clearSessionCookie());
      return response.status(200).json({ok:true});
    }
    response.setHeader("Allow","GET, POST, DELETE");
    return response.status(405).json({ok:false,error:"Método no permitido"});
  }catch(error){
    const configuration=error instanceof Error&&error.message.includes("DATABASE_URL");
    const migration=error instanceof Error&&(error.message.includes("operator_sessions")||error.message.includes("password_hash"));
    return response.status(configuration||migration?503:500).json({ok:false,error:configuration?"Base de datos no conectada":migration?"Falta aplicar la migración 003_operator_auth.sql":"No fue posible autenticar"});
  }
}

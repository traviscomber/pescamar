import { createSession, clearSessionCookie, destroySession, requireOperator, sessionCookie, verifyPassword } from "./_auth.js";
import { clearSuccessfulPair, loginRateState, recordAuthEvent, recordLoginFailure } from "./_auth-security.js";
import { getSql } from "./_db.js";
import { activeOrganization, resolveRequestOrganization } from "./_organization.js";

type Request={method?:string;body?:unknown;headers?:Record<string,string|string[]|undefined>};
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void};
type LoginInput={email?:unknown;password?:unknown};
const emailPattern=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(request:Request,response:Response){
  response.setHeader("Cache-Control","no-store");
  try{
    const organization=resolveRequestOrganization(request.headers,activeOrganization.organizationId);
    if(!organization)return response.status(409).json({ok:false,code:"ORGANIZATION_CONTEXT_UNSUPPORTED",error:"La organización solicitada no está habilitada en esta implementación"});

    if(request.method==="GET"){
      const operator=await requireOperator(request);
      if(!operator)return response.status(401).json({ok:false,error:"Sesión requerida"});
      return response.status(200).json({ok:true,operator});
    }
    if(request.method==="POST"){
      const input=(request.body??{}) as LoginInput;
      const email=String(input.email??"").trim().toLowerCase(),password=String(input.password??"");
      if(!emailPattern.test(email)||email.length>254||password.length<8||password.length>256)
        return response.status(400).json({ok:false,error:"Correo o contraseña inválidos"});

      const rate=await loginRateState(request,email);
      if(rate.blocked){
        const retryAfter=Math.max(1,rate.retryAfter);
        response.setHeader("Retry-After",String(retryAfter));
        return response.status(429).json({ok:false,error:"Demasiados intentos. Intenta nuevamente más tarde."});
      }

      const rows=await getSql()`select id,full_name,email,role,password_hash,plant_ids from operators where lower(email)=${email} and active=true limit 1`;
      const row=Array.isArray(rows)?rows[0] as {id:string;full_name:string;email:string;role:string;password_hash:string|null;plant_ids:string[]}|undefined:undefined;
      if(!row||!verifyPassword(password,row.password_hash)){
        await recordLoginFailure(request,email);
        return response.status(401).json({ok:false,error:"Correo o contraseña inválidos"});
      }

      await getSql()`delete from operator_sessions where expires_at<=now()`;
      await destroySession(request);
      const session=await createSession(row.id);
      await Promise.all([
        clearSuccessfulPair(request,email),
        recordAuthEvent("login_success",request,email,row.id,{role:row.role,organizationId:organization.organizationId}),
      ]);
      response.setHeader("Set-Cookie",sessionCookie(session.token,session.maxAge));
      return response.status(200).json({ok:true,operator:{id:row.id,fullName:row.full_name,email:row.email,role:row.role,plantIds:row.plant_ids??[],organizationId:organization.organizationId}});
    }
    if(request.method==="DELETE"){
      const operator=await requireOperator(request);
      await destroySession(request);
      response.setHeader("Set-Cookie",clearSessionCookie());
      if(operator){
        await recordAuthEvent("logout",request,operator.email,operator.id,{role:operator.role,organizationId:operator.organizationId});
      }
      return response.status(200).json({ok:true});
    }
    response.setHeader("Allow","GET, POST, DELETE");
    return response.status(405).json({ok:false,error:"Método no permitido"});
  }catch(error){
    const message=error instanceof Error?error.message:"";
    const configuration=message.includes("DATABASE_URL");
    const migration=message.includes("operator_sessions")||message.includes("password_hash")||message.includes("auth_login_limits")||message.includes("auth_events");
    return response.status(configuration||migration?503:500).json({ok:false,error:configuration?"Base de datos no conectada":migration?"Faltan migraciones de autenticación":"No fue posible autenticar"});
  }
}
import { requireOperator } from "./_auth.js";
import { getSql } from "./_db.js";

type Request={method?:string;headers?:Record<string,string|string[]|undefined>};
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void};

export default async function handler(request:Request,response:Response){
  response.setHeader("Cache-Control","no-store");
  try{
    if(request.method!=="GET"){
      response.setHeader("Allow","GET");
      return response.status(405).json({ok:false,error:"Método no permitido"});
    }
    const admin=await requireOperator(request,["admin"]);
    if(!admin)return response.status(401).json({ok:false,error:"Sesión de administrador requerida"});
    const sql=getSql();
    const [summaryRows,eventRows]=await Promise.all([
      sql`select
        count(*) filter(where event_type='login_success' and occurred_at>=now()-interval '24 hours')::int as successful_logins,
        count(*) filter(where event_type='login_failure' and occurred_at>=now()-interval '24 hours')::int as failed_logins,
        count(*) filter(where event_type='logout' and occurred_at>=now()-interval '24 hours')::int as logouts,
        (select count(*)::int from auth_login_limits where blocked_until>now()) as active_blocks
        from auth_events`,
      sql`select e.event_type,e.occurred_at,o.full_name as operator_name,e.metadata
        from auth_events e left join operators o on o.id=e.operator_id
        order by e.occurred_at desc limit 20`,
    ]);
    const summary=Array.isArray(summaryRows)?summaryRows[0]:null;
    return response.status(200).json({ok:true,summary:summary??{successful_logins:0,failed_logins:0,logouts:0,active_blocks:0},events:eventRows});
  }catch(error){
    const message=error instanceof Error?error.message:"";
    const configuration=message.includes("DATABASE_URL");
    const migration=message.includes("auth_events")||message.includes("auth_login_limits");
    return response.status(configuration||migration?503:500).json({ok:false,error:configuration?"Base de datos no conectada":migration?"Falta aplicar la migración de auditoría de acceso":"No fue posible consultar la auditoría de acceso"});
  }
}

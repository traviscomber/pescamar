import {requireOperator} from './_auth.js'
import {getSql} from './_db.js'

type Request={method?:string;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}

type RouteRow={path:string;visits_7d:number;operators_7d:number;visits_30d:number;operators_30d:number}
type DailyRow={day:string;operators:number}
type EventRow={created_at:string|Date;operator_id:string;operator_name:string|null;role:string;event:string;path:string}
type FeedbackTotals={total:number;up:number;down:number}
type DownRow={created_at:string|Date;operator_name:string|null;comment:string|null;question:string;answer:string}

export default async function handler(request:Request,response:Response){
 response.setHeader('Cache-Control','no-store')
 if(request.method!=='GET'){response.setHeader('Allow','GET');return response.status(405).json({ok:false,error:'Método no permitido'})}
 try{
  const operator=await requireOperator(request)
  if(!operator)return response.status(401).json({ok:false,error:'Sesión requerida'})
  if(operator.role!=='admin')return response.status(403).json({ok:false,error:'Sólo administración puede leer la telemetría de pilotaje'})
  const sql=getSql()
  const [routeRaw,dailyRaw,eventRaw,feedbackRaw,downsRaw]=await Promise.all([
   sql`select path,
     count(*) filter (where created_at>=now()-interval '7 days')::int visits_7d,
     count(distinct operator_id) filter (where created_at>=now()-interval '7 days')::int operators_7d,
     count(*)::int visits_30d,
     count(distinct operator_id)::int operators_30d
    from pilot_events
    where event='route_visited' and created_at>=now()-interval '30 days'
    group by path
    order by visits_30d desc,path asc
    limit 12`,
   sql`select to_char(created_at::date,'YYYY-MM-DD') "day",count(distinct operator_id)::int operators
    from pilot_events
    where created_at>=now()-interval '14 days'
    group by created_at::date
    order by created_at::date asc`,
   sql`select e.created_at,e.operator_id,o.full_name operator_name,e.role,e.event,e.path
    from pilot_events e left join operators o on o.id=e.operator_id
    order by e.id desc
    limit 50`,
   sql`select count(*)::int total,
     count(*) filter (where rating='good')::int up,
     count(*) filter (where rating='bad')::int down
    from ml_feedback`,
   sql`select f.created_at,o.full_name operator_name,left(f.comment,300) comment,left(f.question,220) question,left(f.answer,400) answer
    from ml_feedback f left join operators o on o.id=f.operator_id
    where f.rating='bad'
    order by f.id desc
    limit 10`
  ])
  const totals=((Array.isArray(feedbackRaw)?feedbackRaw[0]:null)??{total:0,up:0,down:0}) as FeedbackTotals
  return response.status(200).json({
   ok:true,
   generatedAt:new Date().toISOString(),
   routes:(Array.isArray(routeRaw)?routeRaw:[]) as RouteRow[],
   dailyActive:(Array.isArray(dailyRaw)?dailyRaw:[]) as DailyRow[],
   latestEvents:(Array.isArray(eventRaw)?eventRaw:[]) as EventRow[],
   feedback:{total:totals.total,up:totals.up,down:totals.down,pctUp:totals.total?Math.round(totals.up*1000/totals.total)/10:0,recentDowns:(Array.isArray(downsRaw)?downsRaw:[]) as DownRow[]},
   governance:{readsOperationalState:false,writesDatabase:false,roleFromSession:true,queryStringsStored:false}
  })
 }catch(error){
  const message=error instanceof Error?error.message:''
  if(message.includes('DATABASE_URL'))return response.status(503).json({ok:false,error:'Base de datos no conectada'})
  console.error('pilot_insights_failed',message||'unknown')
  return response.status(500).json({ok:false,error:'No fue posible calcular los insights de pilotaje'})
 }
}

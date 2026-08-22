import { isAdminAuthorized, isAdminConfigured } from "./_admin.js";
import { getSql } from "./_db.js";

type Request={method?:string;body?:unknown;headers?:Record<string,string|string[]|undefined>};
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void};
type Input={id?:unknown;name?:unknown;family?:unknown;formats?:unknown;route?:unknown;yieldTarget?:unknown;destination?:unknown;status?:unknown};
const clean=(value:unknown,max:number)=>String(value??"").trim().slice(0,max);
const list=(value:unknown)=>Array.isArray(value)?value.map(item=>clean(item,80)).filter(Boolean).slice(0,16):[];
const map=(row:Record<string,unknown>)=>({id:row.id,name:row.name,family:row.family,formats:row.formats,route:row.route,yieldTarget:row.yield_target,destination:row.destination,status:row.status});

export default async function handler(request:Request,response:Response){
  response.setHeader("Cache-Control","no-store");
  try{
    const sql=getSql();
    await sql`create table if not exists production_lines (id text primary key,name text not null,family text not null,formats text[] not null default '{}',route text[] not null default '{}',yield_target text not null,destination text not null,status text not null check(status in ('Activa','Configurar')),updated_at timestamptz not null default now())`;
    await sql`insert into production_lines (id,name,family,formats,route,yield_target,destination,status) values ('LIN-ER','Erizo','Equinodermos',array['Gónada congelada','Fresco'],array['Recepción','Lavado','Apertura','Extracción','Clasificación IA','Congelado'],'9–12% gónada','Japón','Activa'),('LIN-MO','Moluscos','Loco · Pulpo · bivalvos',array['Cocido congelado','Media concha','Entero'],array['Recepción','Depuración','Cocción','Desconche','Calibrado','Congelado'],'Por especie y calibre','Asia / nacional','Activa'),('LIN-CR','Crustáceos','Jaiba · Centolla',array['Carne cocida','Secciones','Entero'],array['Recepción','Cocción','Enfriado','Extracción','Envasado','Congelado'],'Carne recuperada','Asia','Configurar'),('LIN-PE','Pescados','Demersales y pelágicos',array['Filete','Porción','Entero HG'],array['Recepción','Lavado','Eviscerado','Fileteado','Calibrado','Congelado'],'Filete / materia prima','Exportación / nacional','Configurar'),('LIN-AL','Algas','Luga y otras',array['Seca','Prensada','Materia prima'],array['Recepción','Selección','Lavado','Secado','Prensado','Despacho'],'Humedad y materia útil','Industrial','Configurar') on conflict(id) do nothing`;
    if(request.method==="GET"){const rows=await sql`select id,name,family,formats,route,yield_target,destination,status from production_lines order by name`;return response.status(200).json({ok:true,lines:Array.isArray(rows)?rows.map(row=>map(row as Record<string,unknown>)):[]})}
    if(request.method==="POST"){
      if(!isAdminConfigured())return response.status(503).json({ok:false,error:"Administración pendiente de activar"});
      if(!isAdminAuthorized(request))return response.status(401).json({ok:false,error:"Clave administrativa inválida"});
      const input=(request.body??{}) as Input,name=clean(input.name,80),family=clean(input.family,140),destination=clean(input.destination,100),yieldTarget=clean(input.yieldTarget,120),formats=list(input.formats),route=list(input.route),status=clean(input.status,20);
      const id=clean(input.id,30)||`LIN-${name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,20).toUpperCase()}`;
      if(!id||name.length<2||!family||!destination||!yieldTarget||!formats.length||route.length<2||!["Activa","Configurar"].includes(status))return response.status(400).json({ok:false,error:"Completa los campos y registra al menos dos etapas"});
      const rows=await sql`insert into production_lines (id,name,family,formats,route,yield_target,destination,status) values (${id},${name},${family},${formats},${route},${yieldTarget},${destination},${status}) on conflict(id) do update set name=excluded.name,family=excluded.family,formats=excluded.formats,route=excluded.route,yield_target=excluded.yield_target,destination=excluded.destination,status=excluded.status,updated_at=now() returning id,name,family,formats,route,yield_target,destination,status`;
      const row=Array.isArray(rows)?rows[0] as Record<string,unknown>|undefined:undefined;return response.status(200).json({ok:true,line:row?map(row):null});
    }
    response.setHeader("Allow","GET, POST");return response.status(405).json({ok:false,error:"Método no permitido"});
  }catch(error){const configuration=error instanceof Error&&error.message.includes("DATABASE_URL");return response.status(configuration?503:500).json({ok:false,error:configuration?"Base de datos no conectada":"No fue posible administrar las líneas"})}
}

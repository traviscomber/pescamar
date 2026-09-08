import {requireOperator} from './_auth.js'
import {getSql} from './_db.js'
import {gs1IdentityContract,validateGs1Identity,type Gs1EntityType,type Gs1KeyType} from './_gs1-identity.js'
import {resolveRequestOrganization} from './_organization.js'

type Request={method?:string;headers?:Record<string,string|string[]|undefined>}
type Response={status:(code:number)=>Response;setHeader:(name:string,value:string)=>void;json:(body:unknown)=>void}
type Row={id:string;key_type:Gs1KeyType;gs1_value:string;entity_type:Gs1EntityType;link_status:'candidate'|'confirmed'|'rejected';source_system:string;source_reference:string;evidence:Record<string,unknown>;reviewed_at:string|null;review_note:string|null;entity_label:string|null}
type ReadinessRow={ready?:boolean}

export default async function handler(request:Request,response:Response){
 response.setHeader('Cache-Control','no-store')
 if(request.method!=='GET'){response.setHeader('Allow','GET');return response.status(405).json({ok:false,error:'Método no permitido'})}
 try{
  const operator=await requireOperator(request,['admin','operations'])
  if(!operator)return response.status(401).json({ok:false,error:'Sesión o rol requerido'})
  const organization=resolveRequestOrganization(request.headers,operator.organizationId)
  if(!organization)return response.status(409).json({ok:false,code:'ORGANIZATION_CONTEXT_UNSUPPORTED',error:'La organización solicitada no está habilitada en esta implementación'})
  const sql=getSql()
  const readiness=await sql`select to_regclass('public.gs1_identity_links') is not null ready`
  const readinessRows=(Array.isArray(readiness)?readiness:[]) as ReadinessRow[]
  const schemaReady=Boolean(readinessRows[0]?.ready)
  if(!schemaReady)return response.status(200).json({ok:true,schemaVersion:gs1IdentityContract.schemaVersion,standardVersion:gs1IdentityContract.digitalLinkVersion,schemaReady:false,summary:{total:0,candidate:0,confirmed:0,rejected:0,gtin:0,gln_location:0,gln_party:0,sscc:0},identities:[],contract:gs1IdentityContract,message:'La migración 052 aún no está aplicada en esta base. No se inventan ni derivan identificadores GS1.'})
  const raw=await sql`
   select g.id,g.key_type,g.gs1_value,g.entity_type,g.link_status,g.source_system,g.source_reference,g.evidence,g.reviewed_at,g.review_note,
    case
     when g.entity_type='party' then p.legal_name
     when g.entity_type='plant' then g.plant_id
     when g.entity_type='inventory_location' then il.plant_id||' · '||il.name
     when g.entity_type='packing_spec' then ps.code||' v'||ps.version||' · '||ps.product
     when g.entity_type='pallet' then pal.pallet_code
    end entity_label
   from gs1_identity_links g
   left join parties p on p.id=g.party_id
   left join inventory_locations il on il.id=g.inventory_location_id
   left join packing_specs ps on ps.id=g.packing_spec_id
   left join pallets pal on pal.id=g.pallet_id
   where g.organization_id=${organization.organizationId}
   order by case g.link_status when 'candidate' then 0 when 'confirmed' then 1 else 2 end,g.key_type,g.gs1_value`
  const rows=(Array.isArray(raw)?raw:[]) as Row[]
  const identities=rows.map(row=>{const validation=validateGs1Identity(row.key_type,row.gs1_value,row.entity_type);return {id:row.id,keyType:row.key_type,value:row.gs1_value,entityType:row.entity_type,entityLabel:row.entity_label,status:row.link_status,sourceSystem:row.source_system,sourceReference:row.source_reference,evidence:row.evidence??{},reviewedAt:row.reviewed_at,reviewNote:row.review_note,valid:validation.valid,referenceUri:validation.referenceUri}})
  const summary=identities.reduce((acc,item)=>{acc.total++;acc[item.status]++;acc[item.keyType]++;return acc},{total:0,candidate:0,confirmed:0,rejected:0,gtin:0,gln_location:0,gln_party:0,sscc:0} as Record<string,number>)
  return response.status(200).json({ok:true,schemaVersion:gs1IdentityContract.schemaVersion,standardVersion:gs1IdentityContract.digitalLinkVersion,schemaReady:true,summary,identities,contract:gs1IdentityContract,message:identities.length?'Registro GS1 verificado contra el esquema; los estados siguen sujetos a evidencia y revisión humana.':'No hay identificadores GS1 registrados. Este estado es correcto hasta recibir evidencia real.'})
 }catch(error){const message=error instanceof Error?error.message:'';return response.status(message.includes('DATABASE_URL')?503:500).json({ok:false,error:message.includes('DATABASE_URL')?'Base de datos no conectada':'No fue posible cargar identidades GS1'})}
}

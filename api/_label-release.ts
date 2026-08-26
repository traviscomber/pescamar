import {getSql} from './_db.js'

export type LabelReleaseState={controlled:boolean;releasable:boolean;reasons:string[];total:number;validated:number;blocked:number;missingEvidence:number}

export async function getLabelReleaseState(receptionId:string):Promise<LabelReleaseState>{
 const sql=getSql();
 const rows=await sql`select count(*)::int total,count(*) filter(where status='validated')::int validated,count(*) filter(where status in ('pending','mismatch','blocked'))::int blocked,count(*) filter(where status='validated' and source_message_id is null and nullif(trim(source_document_url),'') is null)::int missing_evidence from product_labels where reception_id=${receptionId}::uuid`;
 const row=Array.isArray(rows)&&rows[0]?rows[0] as Record<string,unknown>:{};
 const total=Number(row.total??0),validated=Number(row.validated??0),blocked=Number(row.blocked??0),missingEvidence=Number(row.missing_evidence??0),controlled=total>0;
 const reasons:string[]=[];
 if(controlled&&validated===0)reasons.push('Sin etiquetas validadas');
 if(blocked>0)reasons.push('Etiqueta pendiente, bloqueada o no coincide');
 if(missingEvidence>0)reasons.push('Etiqueta validada sin evidencia');
 return {controlled,releasable:!controlled||reasons.length===0,reasons,total,validated,blocked,missingEvidence};
}

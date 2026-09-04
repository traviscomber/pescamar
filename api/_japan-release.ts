import {getSql} from './_db.js'
import {getLabelReleaseState} from './_label-release.js'
import {getRegulatoryReleaseState} from './_regulatory-release.js'

export const JAPAN_MANUAL_GATES=[
 'plant_japan_authorized','pac_japan_scope','origin_legal','lab_release','cold_chain_release','neppex_approved','health_certificate','japan_importer_ready','japan_label_compliance','final_quality_release'
] as const
export type JapanManualGateCode=typeof JAPAN_MANUAL_GATES[number]
export type JapanGate={code:string;label:string;status:'pass'|'fail'|'missing';source:'computed'|'manual';detail:string}
export type JapanReleaseState={releasable:boolean;gates:JapanGate[];missing:string[];failed:string[]}

const labels:Record<string,string>={
 process_release:'Proceso Erizo',labels_release:'Etiquetas',regulatory_release:'Holds regulatorios',
 plant_japan_authorized:'Planta habilitada Japón',pac_japan_scope:'PAC / alcance Japón',origin_legal:'Origen legal',lab_release:'Laboratorio / inocuidad',cold_chain_release:'Cadena de frío',neppex_approved:'NEPPEX',health_certificate:'Certificado sanitario',japan_importer_ready:'Importador Japón / MHLW',japan_label_compliance:'Etiqueta y composición Japón',final_quality_release:'Liberación final Calidad'
}

export async function getJapanReleaseState(receptionId:string):Promise<JapanReleaseState>{
 const sql=getSql()
 const [processRows,evidenceRows,labelState,regulatoryState]=await Promise.all([
  sql`select u.id,u.status,u.grade,u.color_status,u.xray_status from sea_urchin_process_runs u where u.reception_id=${receptionId}::uuid order by u.updated_at desc limit 1`,
  sql`select distinct on (gate_code) gate_code,status,document_ref,evidence_url,note,valid_until,verified_at from japan_export_release_evidence where reception_id=${receptionId}::uuid order by gate_code,verified_at desc`,
  getLabelReleaseState(receptionId),
  getRegulatoryReleaseState(receptionId)
 ])
 const process=Array.isArray(processRows)?processRows[0] as Record<string,unknown>|undefined:undefined
 const processOk=Boolean(process&&['ready_for_packing','closed'].includes(String(process.status??''))&&process.grade&&process.color_status==='accepted'&&process.xray_status==='passed')
 const gates:JapanGate[]=[
  {code:'process_release',label:labels.process_release,status:processOk?'pass':'fail',source:'computed',detail:processOk?`Grade ${String(process?.grade??'')} · color aceptado · rayos X aprobado`:'El lote debe estar listo/cerrado con Grade, color aceptado y rayos X aprobado'},
  {code:'labels_release',label:labels.labels_release,status:labelState.controlled&&labelState.releasable?'pass':'fail',source:'computed',detail:labelState.controlled?(labelState.releasable?'Etiquetas validadas con evidencia':labelState.reasons.join(' · ')):'Japón requiere etiquetado explícitamente controlado; no hay etiquetas registradas'},
  {code:'regulatory_release',label:labels.regulatory_release,status:regulatoryState.releasable?'pass':'fail',source:'computed',detail:regulatoryState.releasable?'Sin holds regulatorios vigentes':regulatoryState.reasons.join(' · ')}
 ]
 const evidence=new Map<string,Record<string,unknown>>()
 for(const row of Array.isArray(evidenceRows)?evidenceRows:[])evidence.set(String((row as Record<string,unknown>).gate_code??''),row as Record<string,unknown>)
 const today=new Date();today.setUTCHours(0,0,0,0)
 for(const code of JAPAN_MANUAL_GATES){
  const row=evidence.get(code),validUntil=row?.valid_until?new Date(String(row.valid_until)):null,expired=Boolean(validUntil&&!Number.isNaN(validUntil.getTime())&&validUntil.getTime()<today.getTime()),status=String(row?.status??'')
  const passed=status==='approved'&&!expired
  gates.push({code,label:labels[code]??code,status:passed?'pass':status==='rejected'||expired?'fail':'missing',source:'manual',detail:passed?String(row?.document_ref??row?.evidence_url??'Evidencia aprobada'):expired?'Evidencia expirada':status==='rejected'?String(row?.note??'Evidencia rechazada'):'Falta evidencia aprobada'})
 }
 const failed=gates.filter(g=>g.status==='fail').map(g=>g.label),missing=gates.filter(g=>g.status==='missing').map(g=>g.label)
 return {releasable:failed.length===0&&missing.length===0,gates,missing,failed}
}

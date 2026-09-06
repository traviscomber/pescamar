import type {SeafoodEvent} from './_seafood-event.js'

export const OPERATIONAL_INTELLIGENCE_SCHEMA='seafood.operational-intelligence.v1' as const

export type OperationalSignal={
  priority:1|2|3
  kind:string
  title:string
  detail:string
  confidence:'observed'|'derived'
  action:string
  evidenceEventIds:string[]
  blockers:string[]
}

export type OperationalIntelligence={
  schemaVersion:typeof OPERATIONAL_INTELLIGENCE_SCHEMA
  mode:'live'
  lotId:string|null
  organizationId:string|null
  generatedFromEvents:number
  highestPriority:1|2|3|null
  counts:{p1:number;p2:number;p3:number}
  signals:OperationalSignal[]
  boundary:{writesOperationalState:false;rule:string}
}

const numberOrNull=(value:unknown)=>{const parsed=Number(value);return Number.isFinite(parsed)?parsed:null}
const textOrNull=(value:unknown)=>value==null?null:String(value).trim()||null
const byType=(events:SeafoodEvent[],type:SeafoodEvent['type'])=>events.filter(event=>event.type===type)

export function buildOperationalIntelligence(events:SeafoodEvent[]):OperationalIntelligence{
  const signals:OperationalSignal[]=[]
  const lotIds=[...new Set(events.map(event=>event.lotId).filter(Boolean))]
  const organizationIds=[...new Set(events.map(event=>event.organizationId).filter(Boolean))]
  const push=(signal:OperationalSignal)=>signals.push(signal)

  if(lotIds.length>1||organizationIds.length>1){
    push({priority:1,kind:'graph-boundary',title:'Revisar integridad del Event Graph',detail:'La colección contiene más de un lote u organización. No debe emitirse una recomendación operacional hasta reconciliar el límite de evidencia.',confidence:'observed',action:'Bloquear decisión automática y revisar provenance.',evidenceEventIds:events.map(event=>event.id),blockers:['event_graph_boundary_mismatch']})
  }

  const reception=byType(events,'reception')[0]
  if(reception){
    const gross=numberOrNull(reception.metrics.grossKg),accepted=numberOrNull(reception.metrics.acceptedKg),guide=numberOrNull(reception.metrics.guideKg)
    if(accepted!=null&&accepted<0){
      push({priority:1,kind:'reception-weight',title:'Peso aceptado inválido',detail:`El evento de recepción registra ${accepted} kg aceptados.`,confidence:'observed',action:'Revisar el pesaje fuente antes de continuar.',evidenceEventIds:[reception.id],blockers:['invalid_accepted_weight']})
    }
    if(gross!=null&&accepted!=null&&accepted>gross){
      push({priority:1,kind:'reception-weight',title:'Aceptado supera peso bruto',detail:`Peso aceptado ${accepted} kg > peso bruto ${gross} kg.`,confidence:'derived',action:'Reconciliar pesajes y tara con evidencia primaria.',evidenceEventIds:[reception.id],blockers:['weight_sequence_inconsistent']})
    }
    if(guide!=null&&gross!=null&&guide>0){
      const variancePct=Math.abs(gross-guide)/guide*100
      if(variancePct>=10)push({priority:2,kind:'reception-variance',title:'Variación material guía vs recepción',detail:`La diferencia observada entre guía (${guide} kg) y bruto (${gross} kg) es ${variancePct.toFixed(1)}%.`,confidence:'derived',action:'Validar pesaje, merma esperada y documento de origen.',evidenceEventIds:[reception.id],blockers:[]})
    }
  }

  for(const event of byType(events,'production')){
    const input=numberOrNull(event.metrics.inputKg),output=numberOrNull(event.metrics.outputKg)
    if(input!=null&&output!=null&&input>=0&&output>input){
      push({priority:1,kind:'production-mass-balance',title:'Salida de producción supera entrada',detail:`El evento registra ${output} kg de salida sobre ${input} kg de entrada.`,confidence:'derived',action:'Revisar medición, unidad y consolidación del evento.',evidenceEventIds:[event.id],blockers:['mass_balance_inconsistent']})
    }
  }

  for(const event of byType(events,'inventory')){
    const moved=numberOrNull(event.metrics.movedKg)
    if(moved!=null&&moved<=0){
      push({priority:1,kind:'inventory-movement',title:'Movimiento de inventario inválido',detail:`El movimiento registra ${moved} kg.`,confidence:'observed',action:'Revisar el movimiento antes de usarlo para disponibilidad.',evidenceEventIds:[event.id],blockers:['invalid_inventory_movement']})
    }
  }

  for(const event of byType(events,'vision')){
    const suggested=textOrNull(event.metrics.suggestedGrade),operator=textOrNull(event.metrics.operatorGrade),decision=textOrNull(event.metrics.decision),confirmedBy=textOrNull(event.metrics.confirmedBy)
    if(suggested&&operator&&suggested!==operator&&!decision&&!confirmedBy){
      push({priority:2,kind:'vision-review',title:'Vision y operador difieren sin cierre',detail:`Vision sugiere ${suggested} y el operador registra ${operator}; no existe decisión confirmada en el evento.`,confidence:'observed',action:'Solicitar validación humana y registrar decisión atribuible.',evidenceEventIds:[event.id],blockers:['vision_human_review_pending']})
    }
  }

  const commitments=byType(events,'commercial_commitment'),dispatches=byType(events,'dispatch'),sales=byType(events,'sale'),inventory=byType(events,'inventory')
  if(dispatches.length&&!commitments.length){
    push({priority:2,kind:'commercial-lineage',title:'Despacho sin compromiso comercial visible',detail:'El Event Graph contiene despacho pero no un compromiso comercial atribuible dentro de la evidencia disponible.',confidence:'observed',action:'Verificar orden/asignación comercial; no asumir que no existe fuera del alcance visible.',evidenceEventIds:dispatches.map(event=>event.id),blockers:['commercial_commitment_evidence_missing']})
  }
  if(sales.length&&!dispatches.length){
    push({priority:1,kind:'commercial-lineage',title:'Venta sin despacho visible',detail:'Existe una venta atribuible sin evento de despacho en la evidencia del lote.',confidence:'observed',action:'Reconciliar venta, despacho y documento antes de cierre comercial.',evidenceEventIds:sales.map(event=>event.id),blockers:['dispatch_evidence_missing']})
  }
  if(commitments.length&&!inventory.length){
    push({priority:2,kind:'availability-evidence',title:'Compromiso sin inventario observado',detail:'Hay asignación comercial, pero el Event Graph no contiene movimientos de inventario para demostrar disponibilidad.',confidence:'observed',action:'Confirmar disponibilidad con evidencia de inventario antes de prometer despacho.',evidenceEventIds:commitments.map(event=>event.id),blockers:['inventory_evidence_missing']})
  }

  const missingDates=events.filter(event=>!event.occurredAt)
  if(missingDates.length){
    push({priority:3,kind:'event-time',title:'Eventos sin fecha atribuible',detail:`${missingDates.length} evento(s) no tienen occurredAt; el orden temporal no puede considerarse completo.`,confidence:'observed',action:'Completar fecha sólo desde evidencia fuente.',evidenceEventIds:missingDates.map(event=>event.id),blockers:['event_time_missing']})
  }

  if(reception&&!byType(events,'evidence').length){
    push({priority:3,kind:'evidence-coverage',title:'Recepción sin evidencia documental visible',detail:'La recepción existe en el Event Graph, pero no hay eventos documentales asociados en el alcance actual.',confidence:'observed',action:'Adjuntar o vincular evidencia primaria disponible.',evidenceEventIds:[reception.id],blockers:[]})
  }

  signals.sort((a,b)=>a.priority-b.priority||a.kind.localeCompare(b.kind)||a.title.localeCompare(b.title))
  const counts={p1:signals.filter(signal=>signal.priority===1).length,p2:signals.filter(signal=>signal.priority===2).length,p3:signals.filter(signal=>signal.priority===3).length}
  return {schemaVersion:OPERATIONAL_INTELLIGENCE_SCHEMA,mode:'live',lotId:lotIds.length===1?lotIds[0]:null,organizationId:organizationIds.length===1?organizationIds[0]:null,generatedFromEvents:events.length,highestPriority:counts.p1?1:counts.p2?2:counts.p3?3:null,counts,signals,boundary:{writesOperationalState:false,rule:'Las señales derivan sólo de Seafood Event Graph; orientan revisión y acción humana, no escriben ni completan estado operacional.'}}
}

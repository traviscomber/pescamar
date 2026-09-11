import type {AppRole} from './access'
import type {Locale} from './i18n'

type Localized={es:string;en:string}
export type RoleExperience={
 mission:Localized
 valueRule:Localized
 primaryPaths:string[]
 assistantPrompts:{es:string[];en:string[]}
}
export type OperatorExperienceIdentity={id:string;fullName:string;email:string;role:AppRole}

const CEO_OPERATOR_EMAIL='rene.anania@pescamarchile.cl'

export const ceoExperience:RoleExperience={
 mission:{es:'Dirigir Pescamar desde resultados, riesgo y decisiones que requieren intervención ejecutiva.',en:'Lead Pescamar through outcomes, risk and decisions that require executive intervention.'},
 valueRule:{es:'Mostrar máximo tres asuntos materiales: qué cambió, impacto conocido, riesgo y decisión requerida. Ocultar detalle operativo salvo que René lo solicite.',en:'Show at most three material issues: what changed, known impact, risk and required decision. Hide operational detail unless René asks for it.'},
 primaryPaths:['/','/pescamar-ia','/rentabilidad','/ordenes-venta'],
 assistantPrompts:{es:['Resumen ejecutivo de hoy','¿Qué requiere mi decisión?','¿Dónde está el mayor riesgo?'],en:["Today's executive summary",'What requires my decision?','Where is the greatest risk?']},
}

export const roleExperiences:Record<AppRole,RoleExperience>={
 admin:{
  mission:{es:'Mantener Pescamar operativo, confiable y gobernado.',en:'Keep Pescamar operational, reliable and governed.'},
  valueRule:{es:'Mostrar salud, excepciones y decisiones administrativas; evitar ruido operacional que no requiere intervención.',en:'Show health, exceptions and administrative decisions; avoid operational noise that does not require intervention.'},
  primaryPaths:['/','/pescamar-ia','/modulos','/observabilidad','/auditoria'],
  assistantPrompts:{es:['¿Qué requiere intervención del sistema?','¿Dónde hay datos incompletos?','¿Qué está bloqueando la operación?','¿Qué debería revisar primero?'],en:['What requires system intervention?','Where is data incomplete?','What is blocking operations?','What should I review first?']},
 },
 operations:{
  mission:{es:'Coordinar la operación y mover primero lo que más impacta el día.',en:'Coordinate operations and move first what most affects the day.'},
  valueRule:{es:'Mismo trabajo, más contexto: prioridad, impacto, bloqueo y siguiente acción.',en:'Same job, more context: priority, impact, blocker and next action.'},
  primaryPaths:['/','/pescamar-ia','/recepciones','/lineas','/inventario','/ordenes-venta'],
  assistantPrompts:{es:['Prioridades de hoy','¿Qué requiere atención?','Comparar plantas','¿Qué está bloqueado?','¿Qué falta para cerrar?'],en:['Today’s priorities','What requires attention?','Compare plants','What is blocked?','What is missing to close?']},
 },
 finance:{
  mission:{es:'Cerrar brechas económicas y administrativas sin reconstruir la operación manualmente.',en:'Close financial and administrative gaps without manually reconstructing operations.'},
  valueRule:{es:'Mostrar sólo importes conocidos, faltantes, exposición y la siguiente conciliación útil.',en:'Show only known amounts, missing evidence, exposure and the next useful reconciliation.'},
  primaryPaths:['/','/pescamar-ia','/ordenes-venta','/despachos-ventas','/liquidaciones','/creditos','/rentabilidad'],
  assistantPrompts:{es:['¿Qué falta por liquidar?','¿Dónde faltan costos?','¿Qué ventas tienen evidencia incompleta?','¿Qué requiere conciliación hoy?'],en:['What is still pending settlement?','Where are costs missing?','Which sales have incomplete evidence?','What needs reconciliation today?']},
 },
 quality:{
  mission:{es:'Detectar y resolver excepciones de calidad con evidencia antes de que bloqueen el flujo.',en:'Detect and resolve quality exceptions with evidence before they block flow.'},
  valueRule:{es:'Priorizar holds, evidencia faltante y siguiente revisión segura; nunca convertir ausencia de datos en aprobación.',en:'Prioritize holds, missing evidence and the next safe review; never turn missing data into approval.'},
  primaryPaths:['/','/pescamar-ia','/recepciones','/control-regulatorio','/proceso','/frio','/pallets'],
  assistantPrompts:{es:['¿Qué lotes requieren revisión?','¿Qué evidencia de calidad falta?','¿Qué está bloqueado por calidad?','¿Qué debería revisar primero?'],en:['Which lots require review?','What quality evidence is missing?','What is blocked by quality?','What should I review first?']},
 },
 viewer:{
  mission:{es:'Entender el estado real sin ejecutar cambios.',en:'Understand the real state without executing changes.'},
  valueRule:{es:'Explicar estado, evidencia y límites con la menor complejidad posible.',en:'Explain status, evidence and limits with the least possible complexity.'},
  primaryPaths:['/','/pescamar-ia','/lineage'],
  assistantPrompts:{es:['¿Qué está pasando ahora?','¿Qué requiere atención?','¿Qué cambió?','¿Qué evidencia respalda este estado?'],en:['What is happening now?','What requires attention?','What changed?','What evidence supports this status?']},
 },
}

export function isCeoOperator(operator:OperatorExperienceIdentity|null|undefined){return Boolean(operator&&operator.role==='admin'&&operator.email.trim().toLowerCase()===CEO_OPERATOR_EMAIL)}
export function getRoleExperience(role:AppRole){return roleExperiences[role]}
export function getOperatorExperience(operator:OperatorExperienceIdentity){return isCeoOperator(operator)?ceoExperience:roleExperiences[operator.role]}
export function roleCopy(role:AppRole,locale:Locale){const experience=roleExperiences[role];return {mission:experience.mission[locale],valueRule:experience.valueRule[locale],assistantPrompts:experience.assistantPrompts[locale]}}
export function operatorCopy(operator:OperatorExperienceIdentity,locale:Locale){const experience=getOperatorExperience(operator);return {mission:experience.mission[locale],valueRule:experience.valueRule[locale],assistantPrompts:experience.assistantPrompts[locale]}}
export function isPrimaryRolePath(role:AppRole,path:string){return roleExperiences[role].primaryPaths.some(primary=>primary==='/'?path==='/':path===primary||path.startsWith(`${primary}/`))}
export function isPrimaryOperatorPath(operator:OperatorExperienceIdentity,path:string){return getOperatorExperience(operator).primaryPaths.some(primary=>primary==='/'?path==='/':path===primary||path.startsWith(`${primary}/`))}

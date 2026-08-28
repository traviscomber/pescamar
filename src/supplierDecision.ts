export type SupplierDecisionScore={score:number|null;coverage:number;confidence:'alta'|'media'|'baja';components?:Array<{key:string;weight:number;score:number|null}>}
export type SupplierDecisionEconomics={score:number|null}|undefined
export type SupplierDecisionSupport={exceptions:number}|undefined
export type SupplierSupportStatus='ready'|'not_imported'|'migration_required'|undefined
export type PurchaseDecisionLevel='positive'|'informational'|'warning'|'danger'|'neutral'
export type PurchaseDecision={label:string;detail:string;level:PurchaseDecisionLevel}

export function normalizeSupplier(value:string){return value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').replace(/[^a-z0-9]/g,'')}

export function purchaseScoreFor(supplier:SupplierDecisionScore,economics:SupplierDecisionEconomics){
 const components=(supplier.components??[]).filter(item=>item.key!=='profitability'&&item.score!=null)
 const legacyEconomic=supplier.components?.find(item=>item.key==='profitability')?.score??null
 const economicScore=economics?.score??legacyEconomic
 if(!components.length){
  if(supplier.score==null)return economicScore
  return economicScore==null?supplier.score:Number(((supplier.score*90+economicScore*10)/100).toFixed(1))
 }
 const weighted=components.reduce((sum,item)=>sum+(item.score??0)*item.weight,0)+(economicScore==null?0:economicScore*10)
 const coverage=components.reduce((sum,item)=>sum+item.weight,0)+(economicScore==null?0:10)
 return coverage?Number((weighted/coverage).toFixed(1)):supplier.score
}

export function purchaseDecisionFor({supplier,economics,support,supportStatus,relativePricePct}:{supplier:SupplierDecisionScore;economics:SupplierDecisionEconomics;support:SupplierDecisionSupport;supportStatus:SupplierSupportStatus;relativePricePct?:number|null}):PurchaseDecision{
 const purchaseScore=purchaseScoreFor(supplier,economics)
 if(purchaseScore==null||supplier.coverage<40)return {label:'Evidencia insuficiente',detail:'Todavía no existe base suficiente para una decisión de compra fuerte. Registrar nueva evidencia sin forzar prioridad.',level:'neutral'}
 if(supportStatus==='ready'&&support&&support.exceptions>0)return {label:'Revisar trazabilidad',detail:`Hay ${support.exceptions} ${support.exceptions===1?'cadena física sin conciliación':'cadenas físicas sin conciliación'}. Resolver evidencia antes de aumentar exposición con este proveedor.`,level:'warning'}
 if(supplier.confidence==='baja'||supplier.coverage<50)return {label:'Revisar próxima recepción',detail:'El desempeño existe, pero la cobertura o la confianza todavía no justifican priorizar compra sin control adicional.',level:'warning'}
 if(economics?.score!=null&&economics.score<35)return {label:'Negociar antes de comprar',detail:'La economía de compra está débil frente a proveedores comparables, aunque la calidad pueda ser utilizable.',level:'warning'}
 if(economics?.score==null&&relativePricePct!=null&&relativePricePct>15)return {label:'Negociar antes de comprar',detail:'Aún no hay economía Grade A suficiente y el precio histórico está alto frente a pares comparables.',level:'warning'}
 if(purchaseScore>=85&&economics?.score!=null&&economics.score>=50)return {label:'Priorizar compra',detail:'Desempeño fuerte, economía competitiva y evidencia suficiente. Mantener control normal de recepción.',level:'positive'}
 if(purchaseScore>=75)return {label:'Preferir',detail:economics?.score==null?'Buen desempeño relativo. Es una alternativa prioritaria, con economía de compra todavía pendiente.':'Buen desempeño relativo y economía utilizable. Priorizar cuando especie, zona y condición comercial sean comparables.',level:'informational'}
 if(purchaseScore>=60)return {label:'Mantener con control',detail:'Proveedor utilizable; reforzar calidad, rendimiento y condición económica en la siguiente recepción.',level:'warning'}
 return {label:'Calidad antes de comprar',detail:'El desempeño observado no justifica aumentar compra sin revisión de Calidad y evidencia del próximo lote.',level:'danger'}
}

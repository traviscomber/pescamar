export type CommercialReadinessInput={plantOrders:number;dispatches:number;sales:number;linkedEndToEndReceptions:number}
export type CommercialReadinessResult={complete:boolean;aggregateSignals:number;detail:string}

export function assessCommercialReadiness(input:CommercialReadinessInput):CommercialReadinessResult{
 const aggregateSignals=Math.max(0,input.plantOrders)+Math.max(0,input.dispatches)+Math.max(0,input.sales)
 if(aggregateSignals>0)return{complete:true,aggregateSignals,detail:`${aggregateSignals} eventos/órdenes vigentes`}
 if(input.linkedEndToEndReceptions>0)return{complete:true,aggregateSignals,detail:`${input.linkedEndToEndReceptions} lote(s) con señal comercial vigente enlazada`}
 return{complete:false,aggregateSignals,detail:'Sin orden vigente, asignación enlazada, despacho ni venta'}
}

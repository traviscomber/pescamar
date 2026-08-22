export type LotStatus = 'Clasificado' | 'Muestreo' | 'Revisión' | 'Alerta calibre'
export type Species = 'Erizo' | 'Loco' | 'Jaiba' | 'Centolla' | 'Pulpo' | 'Pescado' | 'Algas'
export type ReceptionEvidence = { id?:string; kind:'document'|'photo'|'certificate'|'other'; label:string; url:string; note?:string; createdBy?:string; createdAt?:string }
export type Lot = { receptionId?:string; id:string; plantId:string; species:Species; supplier:string; initials:string; zone:string; guide:number; guideReference?:string; gross:number; tare:number; drained:number; accepted:number; loss:number; gonadYield:number|null; premiumYield:number|null; temperature:number; status:LotStatus; receivedAt:string; occurredAt?:string; evidenceCount:number; evidence:ReceptionEvidence[] }
export type ColorStandard = { id:string; name:string; pantone:string; hex:string; l:number; a:number; b:number; tolerance:number; use:string }
export type ProductionLine = { id:string; name:string; family:string; formats:string[]; route:string[]; yieldTarget:string; destination:string; status:'Activa'|'Configurar' }

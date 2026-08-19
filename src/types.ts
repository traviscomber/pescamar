export type LotStatus = 'Clasificado' | 'Muestreo' | 'Revisión' | 'Alerta calibre'
export type Species = 'Erizo' | 'Loco' | 'Jaiba' | 'Centolla' | 'Pulpo' | 'Pescado' | 'Algas'
export type Lot = { id:string; species:Species; supplier:string; initials:string; zone:string; gross:number; tare:number; drained:number; accepted:number; loss:number; gonadYield:number|null; premiumYield:number|null; temperature:number; status:LotStatus; receivedAt:string; evidenceCount:number }
export type ColorStandard = { id:string; name:string; pantone:string; hex:string; l:number; a:number; b:number; tolerance:number; use:string }
export type ProductionLine = { id:string; name:string; family:string; formats:string[]; route:string[]; yieldTarget:string; destination:string; status:'Activa'|'Configurar' }

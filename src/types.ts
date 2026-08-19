export type LotStatus = 'Clasificado' | 'Muestreo' | 'Revisión' | 'Alerta calibre'
export type Lot = { id:string; supplier:string; initials:string; zone:string; gross:number; tare:number; drained:number; accepted:number; loss:number; gonadYield:number|null; premiumYield:number|null; temperature:number; status:LotStatus; receivedAt:string; evidenceCount:number }
export type ColorStandard = { id:string; name:string; pantone:string; hex:string; l:number; a:number; b:number; tolerance:number; use:string }

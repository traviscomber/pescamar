import type { ColorStandard, Lot } from './types'
export const initialLots: Lot[] = [
  { id:'ER-260819-04', supplier:'Juan Rain', initials:'JR', zone:'Bahía de Ancud', gross:312, tare:8, drained:286, accepted:278, loss:10.9, gonadYield:10.4, premiumYield:72.1, temperature:4.1, status:'Clasificado', receivedAt:'10:18', evidenceCount:4 },
  { id:'ER-260819-03', supplier:'María Catrilef', initials:'MC', zone:'Canal de Chacao', gross:284, tare:7, drained:256, accepted:249, loss:12.3, gonadYield:11.1, premiumYield:76.4, temperature:3.8, status:'Clasificado', receivedAt:'09:42', evidenceCount:4 },
  { id:'ER-260819-02', supplier:'Alexis Paillán', initials:'AP', zone:'Quemchi', gross:365, tare:10, drained:297, accepted:287, loss:21.4, gonadYield:7.8, premiumYield:41.8, temperature:5.6, status:'Revisión', receivedAt:'08:57', evidenceCount:2 },
  { id:'ER-260819-01', supplier:'Cooperativa Lliuco', initials:'CL', zone:'Quinchao', gross:279, tare:6, drained:240, accepted:234, loss:16.1, gonadYield:9.9, premiumYield:63.2, temperature:4.4, status:'Alerta calibre', receivedAt:'08:15', evidenceCount:4 }
]
export const standards: ColorStandard[] = [
  { id:'JPN-A04', name:'Japón Premium', pantone:'15-1245 TCX', hex:'#E9964D', l:67.4, a:19.8, b:48.2, tolerance:4.0, use:'Omakase y sushi premium' },
  { id:'JPN-A07', name:'Japón A', pantone:'14-1045 TCX', hex:'#F2B35E', l:74.8, a:13.2, b:45.6, tolerance:5.5, use:'Sushi y retail especializado' },
  { id:'JPN-B03', name:'Japón B', pantone:'13-0942 TCX', hex:'#F4C978', l:81.1, a:7.8, b:38.7, tolerance:7.0, use:'Procesados y food service' }
]

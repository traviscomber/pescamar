export type PlantStatus = 'healthy' | 'attention' | 'critical' | 'offline'

export type PlantAlert = {
  id: string
  severity: 'Atención' | 'Crítica' | 'Información'
  title: string
  detail: string
}

export type Plant = {
  id: string
  name: string
  location: string
  mode: 'Propia' | 'Maquila' | 'Maquila y producto terminado' | 'Producto terminado'
  status: PlantStatus
  statusLabel: string
  statusReason: string
  products: string[]
  productionKg: number
  targetKg: number
  inventoryKg: number
  inventoryFinishedKg: number
  updatedAt: string
  source: string
  alerts: PlantAlert[]
}

export const plants: Plant[] = [
  {id:'ancud',name:'Planta Ancud',location:'Ancud · Chiloé',mode:'Propia',status:'healthy',statusLabel:'Operación normal',statusReason:'Producción dentro de meta y datos vigentes.',products:['Erizo congelado'],productionKg:18420,targetKg:18000,inventoryKg:6250,inventoryFinishedKg:3120,updatedAt:'Hoy · 08:45',source:'Producción_Ancud_S33.xlsx',alerts:[]},
  {id:'quellon',name:'Planta Quellón',location:'Quellón · Chiloé',mode:'Propia',status:'healthy',statusLabel:'Operación normal',statusReason:'Cumplimiento de 96% sin alertas críticas.',products:['Desconche de erizo','Erizo terminado','Pulpo','Centolla','Jaiba'],productionKg:26880,targetKg:28000,inventoryKg:9340,inventoryFinishedKg:4820,updatedAt:'Hoy · 09:10',source:'Control_Quellon_S33.xlsx',alerts:[{id:'Q-1',severity:'Información',title:'Pulpo próximo a meta',detail:'Cumplimiento acumulado de 94%.'}]},
  {id:'iquique',name:'Planta Iquique',location:'Iquique · Sotomayor',mode:'Maquila',status:'attention',statusLabel:'Requiere atención',statusReason:'Rendimiento de erizo fresco 6 puntos bajo objetivo.',products:['Pulpo','Erizo congelado','Erizo fresco','Palometa'],productionKg:14760,targetKg:18000,inventoryKg:7100,inventoryFinishedKg:2350,updatedAt:'Ayer · 17:30',source:'Sotomayor_Agosto.xlsx',alerts:[{id:'I-1',severity:'Atención',title:'Rendimiento bajo objetivo',detail:'Erizo fresco registra 22%; objetivo 28%.'}]},
  {id:'piedra-azul',name:'Planta Piedra Azul',location:'Puerto Montt · Los Lagos',mode:'Maquila y producto terminado',status:'attention',statusLabel:'Requiere atención',statusReason:'Centolla presenta caída de rendimiento respecto de la semana anterior.',products:['Centolla','Salmón Chinook','Corvina'],productionKg:21600,targetKg:25000,inventoryKg:12840,inventoryFinishedKg:6940,updatedAt:'Hoy · 07:55',source:'Piedra_Azul_S33.xlsx',alerts:[{id:'P-1',severity:'Atención',title:'Desviación de centolla',detail:'Rendimiento cayó de 28% a 21%.'}]},
  {id:'aqua-austral',name:'Planta Aqua Austral',location:'Región de Aysén',mode:'Producto terminado',status:'healthy',statusLabel:'Operación normal',statusReason:'Inventario y producto terminado dentro de rango.',products:['Merluza austral','Congrio','Salmón de cultivo'],productionKg:32450,targetKg:33000,inventoryKg:15620,inventoryFinishedKg:11300,updatedAt:'Hoy · 08:20',source:'Aqua_Austral_S33.xlsx',alerts:[]},
  {id:'natales',name:'Planta Natales',location:'Puerto Natales · Magallanes',mode:'Producto terminado',status:'critical',statusLabel:'Estado crítico',statusReason:'Planilla sin actualizar y producto terminado sin movimiento.',products:['Erizos','Centolla','Centollón','Ostiones'],productionKg:9800,targetKg:16000,inventoryKg:11920,inventoryFinishedKg:9410,updatedAt:'Hace 3 días',source:'Natales_S32.xlsx',alerts:[{id:'N-1',severity:'Crítica',title:'Información desactualizada',detail:'No se recibe planilla desde hace 3 días.'},{id:'N-2',severity:'Atención',title:'Inventario inmovilizado',detail:'9.410 kg de producto terminado sin movimiento.'}]}
]

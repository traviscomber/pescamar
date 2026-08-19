import type { Lot, ProductionLine } from './types'

// No se precargan recepciones: se muestran únicamente registros ingresados por el usuario.
export const initialLots: Lot[] = []

export const productionLines: ProductionLine[] = [
  {id:'LIN-ER',name:'Erizo',family:'Equinodermos',formats:['Gónada congelada','Fresco'],route:['Recepción','Lavado','Apertura','Extracción','Clasificación IA','Congelado'],yieldTarget:'9–12% gónada',destination:'Japón',status:'Activa'},
  {id:'LIN-MO',name:'Moluscos',family:'Loco · Pulpo · bivalvos',formats:['Cocido congelado','Media concha','Entero'],route:['Recepción','Depuración','Cocción','Desconche','Calibrado','Congelado'],yieldTarget:'Por especie y calibre',destination:'Asia / nacional',status:'Activa'},
  {id:'LIN-CR',name:'Crustáceos',family:'Jaiba · Centolla',formats:['Carne cocida','Secciones','Entero'],route:['Recepción','Cocción','Enfriado','Extracción','Envasado','Congelado'],yieldTarget:'Carne recuperada',destination:'Asia',status:'Configurar'},
  {id:'LIN-PE',name:'Pescados',family:'Demersales y pelágicos',formats:['Filete','Porción','Entero HG'],route:['Recepción','Lavado','Eviscerado','Fileteado','Calibrado','Congelado'],yieldTarget:'Filete / materia prima',destination:'Exportación / nacional',status:'Configurar'},
  {id:'LIN-AL',name:'Algas',family:'Luga y otras',formats:['Seca','Prensada','Materia prima'],route:['Recepción','Selección','Lavado','Secado','Prensado','Despacho'],yieldTarget:'Humedad y materia útil',destination:'Industrial',status:'Configurar'}
]

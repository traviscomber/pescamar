import type { Plant } from './plants'
import { readWorkbook } from './workbook'

export type PlantStatus='healthy'|'attention'|'critical'|'offline'
export type PlantAlert={id:string;severity:'Atención'|'Crítica'|'Información';title:string;detail:string}
export type OperationalPlant=Plant&{sourceStatus:'linked';status:PlantStatus;statusLabel:string;statusReason:string;productionKg:number;targetKg:number;inventoryKg:number;inventoryFinishedKg:number;updatedAt:string;source:string;alerts:PlantAlert[]}
export type PlantState=Plant|OperationalPlant
export const isOperationalPlant=(plant:PlantState):plant is OperationalPlant=>plant.sourceStatus==='linked'

export type ImportRow = {
  plantId: string
  period: string
  productionKg: number
  targetKg: number
  inventoryKg: number
  inventoryFinishedKg: number
  updatedAt: string
  observation: string
  source: string
}

export type ValidatedImport = ImportRow & {
  rowNumber: number
  plant?: Plant
  errors: string[]
}

export type ImportBatch = {
  id: string
  fileName: string
  periods: string[]
  plantIds: string[]
  rowCount: number
  publishedAt: string
  publishedBy: string
  previousPlants: PlantState[]
  resultingPlants: PlantState[]
  revertedAt?: string
}

export function createImportBatch(current: PlantState[], rows: ValidatedImport[], publishedBy='Sesión ejecutiva'): ImportBatch {
  const resultingPlants=applyImports(current,rows)
  return {
    id:`IMP-${Date.now().toString(36).toUpperCase()}`,
    fileName:rows[0]?.source??'Planilla sin nombre',
    periods:[...new Set(rows.map(row=>row.period))],
    plantIds:[...new Set(rows.flatMap(row=>row.plant?[row.plant.id]:[]))],
    rowCount:rows.length,
    publishedAt:new Date().toISOString(),
    publishedBy,
    previousPlants:current,
    resultingPlants,
  }
}

const aliases: Record<string, keyof ImportRow> = {
  planta: 'plantId', plantid: 'plantId', idplanta: 'plantId',
  periodo: 'period', period: 'period',
  produccionkg: 'productionKg', produccion: 'productionKg',
  metakg: 'targetKg', meta: 'targetKg',
  inventariokg: 'inventoryKg', inventario: 'inventoryKg',
  productoterminadokg: 'inventoryFinishedKg', productoterminado: 'inventoryFinishedKg',
  fechaactualizacion: 'updatedAt', actualizado: 'updatedAt',
  observacion: 'observation', observaciones: 'observation',
}

const normalize=(value:unknown)=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'')
const numberValue=(value:unknown)=>{
  if(typeof value==='number')return value
  const text=String(value??'').trim()
  return text?Number(text.replace(/\./g,'').replace(',','.')):Number.NaN
}

export async function readPlantWorkbook(file: File, plants: Plant[]): Promise<ValidatedImport[]> {
  const workbook=await readWorkbook(file)
  const [headers=[],...dataRows]=workbook.rows
  const raw=dataRows.map(values=>Object.fromEntries(headers.map((header,index)=>[String(header??''),values[index]??''])))
  const rows=raw.map((record,index)=>{
    const mapped: Partial<ImportRow>={source:file.name}
    Object.entries(record).forEach(([header,value])=>{
      const key=aliases[normalize(header)]
      if(key) Object.assign(mapped,{[key]:value})
    })
    const plant=plants.find(candidate=>normalize(candidate.id)===normalize(mapped.plantId)||normalize(candidate.name)===normalize(mapped.plantId))
    const row: ImportRow={
      plantId: plant?.id??String(mapped.plantId??''), period:String(mapped.period??''),
      productionKg:numberValue(mapped.productionKg), targetKg:numberValue(mapped.targetKg),
      inventoryKg:numberValue(mapped.inventoryKg), inventoryFinishedKg:numberValue(mapped.inventoryFinishedKg),
      updatedAt: (mapped.updatedAt as unknown) instanceof Date?(mapped.updatedAt as unknown as Date).toISOString():String(mapped.updatedAt??''),
      observation:String(mapped.observation??''), source:file.name,
    }
    const errors:string[]=[]
    if(!plant)errors.push('Planta no reconocida')
    if(!row.period)errors.push('Período obligatorio')
    ;(['productionKg','targetKg','inventoryKg','inventoryFinishedKg'] as const).forEach(key=>{
      if(!Number.isFinite(row[key])||row[key]<0)errors.push(`${key} debe ser un número igual o mayor que cero`)
    })
    if(row.targetKg===0)errors.push('meta_kg debe ser mayor que cero')
    if(row.inventoryFinishedKg>row.inventoryKg)errors.push('Producto terminado supera inventario total')
    if(!row.updatedAt||Number.isNaN(new Date(row.updatedAt).getTime()))errors.push('Fecha de actualización inválida')
    return {...row,rowNumber:index+2,plant,errors}
  })
  const counts=new Map<string,number>()
  rows.forEach(row=>{if(row.plant)counts.set(row.plant.id,(counts.get(row.plant.id)??0)+1)})
  return rows.map(row=>counts.get(row.plant?.id??'')!>1?{...row,errors:[...row.errors,'La planta aparece más de una vez en el archivo']}:row)
}

export function applyImports(current: PlantState[], rows: ValidatedImport[]): PlantState[] {
  return current.map(plant=>{
    const row=rows.find(candidate=>candidate.plant?.id===plant.id)
    if(!row||row.errors.length)return plant
    const progress=row.targetKg?row.productionKg/row.targetKg:0
    const ageDays=(Date.now()-new Date(row.updatedAt).getTime())/86400000
    let status:PlantStatus='healthy'
    let statusLabel='Operación normal'
    let statusReason='Producción dentro de meta y datos vigentes.'
    const alerts:PlantAlert[]=[]
    if(ageDays>3){status='offline';statusLabel='Sin datos vigentes';statusReason='La planilla tiene más de tres días de antigüedad.';alerts.push({id:`${plant.id}-vigencia`,severity:'Crítica',title:'Información desactualizada',detail:statusReason})}
    else if(progress<.7){status='critical';statusLabel='Estado crítico';statusReason=`Cumplimiento de ${Math.round(progress*100)}%, bajo el umbral crítico de 70%.`;alerts.push({id:`${plant.id}-meta`,severity:'Crítica',title:'Producción bajo umbral crítico',detail:statusReason})}
    else if(progress<.9){status='attention';statusLabel='Requiere atención';statusReason=`Cumplimiento de ${Math.round(progress*100)}%, bajo el objetivo de 90%.`;alerts.push({id:`${plant.id}-meta`,severity:'Atención',title:'Producción bajo objetivo',detail:statusReason})}
    if(row.observation)alerts.push({id:`${plant.id}-nota`,severity:'Información',title:'Observación de planta',detail:row.observation})
    return {...plant,sourceStatus:'linked' as const,productionKg:row.productionKg,targetKg:row.targetKg,inventoryKg:row.inventoryKg,inventoryFinishedKg:row.inventoryFinishedKg,updatedAt:new Date(row.updatedAt).toLocaleString('es-CL',{dateStyle:'short',timeStyle:'short'}),source:row.source,status,statusLabel,statusReason,alerts}
  })
}

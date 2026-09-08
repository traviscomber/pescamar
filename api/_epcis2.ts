import {GDST2_EPCIS_CONTEXT,gdst2EventMappings} from './_gdst2.js'
import type {SeafoodEvent} from './_seafood-event.js'

export const EPCIS2_SERIALIZER_SCHEMA='seafood.epcis2-serializer.v1' as const
export const EPCIS2_VERSION='2.0' as const

export type EpcisIdentityContext={
 productClassUri?:string|null
 inputProductClassUri?:string|null
 outputProductClassUri?:string|null
 bizLocationUri?:string|null
 readPointUri?:string|null
 sourcePartyUri?:string|null
 destinationPartyUri?:string|null
}

export type EpcisSerializationDiagnostic={
 eventId:string
 seafoodEventType:SeafoodEvent['type']
 candidate:boolean
 exportable:boolean
 epcisType:'ObjectEvent'|'TransformationEvent'|null
 cte:'receiving'|'transformation'|'shipping'|null
 missing:string[]
 reason:string
}

type QuantityElement={epcClass:string;quantity:number;uom:'KGM'}
type EpcisObjectEvent={
 type:'ObjectEvent'
 eventTime:string
 eventTimeZoneOffset:string
 action:'OBSERVE'
 bizStep:string
 readPoint:{id:string}
 bizLocation:{id:string}
 quantityList:QuantityElement[]
 sourceList?:Array<{type:string;source:string}>
 destinationList?:Array<{type:string;destination:string}>
}
type EpcisTransformationEvent={
 type:'TransformationEvent'
 eventTime:string
 eventTimeZoneOffset:string
 bizStep:string
 transformationID:string
 readPoint:{id:string}
 bizLocation:{id:string}
 inputQuantityList:QuantityElement[]
 outputQuantityList:QuantityElement[]
}
export type EpcisEvent=EpcisObjectEvent|EpcisTransformationEvent

function finite(value:unknown){const n=Number(value);return Number.isFinite(n)&&n>0?n:null}
function timezoneOffset(iso:string){const match=iso.match(/([+-]\d{2}:\d{2}|Z)$/);return match?.[1]==='Z'?'+00:00':match?.[1]??'+00:00'}
function bizStep(step:'receiving'|'commissioning'|'shipping'){return `https://ref.gs1.org/cbv/BizStep-${step}`}
function sourceType(){return 'https://ref.gs1.org/cbv/SDT-owning_party'}
function destinationType(){return 'https://ref.gs1.org/cbv/SDT-owning_party'}
function text(value:unknown){return typeof value==='string'&&value.trim()?value.trim():null}

export function serializeSeafoodEventsToEpcis2(
 events:readonly SeafoodEvent[],
 resolveIdentity:(event:SeafoodEvent)=>EpcisIdentityContext,
){
 const eventList:EpcisEvent[]=[]
 const diagnostics:EpcisSerializationDiagnostic[]=[]
 for(const event of events){
  const mapping=gdst2EventMappings.find(item=>item.seafoodEventType===event.type)
  if(!mapping||mapping.state!=='candidate'||!mapping.epcisType||!mapping.cte||!mapping.bizStep){
   diagnostics.push({eventId:event.id,seafoodEventType:event.type,candidate:false,exportable:false,epcisType:mapping?.epcisType??null,cte:mapping?.cte??null,missing:[],reason:mapping?.condition??'Este evento no tiene mapping EPCIS exportable.'})
   continue
  }
  const identity=resolveIdentity(event),missing:string[]=[]
  const eventTime=text(event.occurredAt),bizLocation=text(identity.bizLocationUri),readPoint=text(identity.readPointUri)
  if(!eventTime)missing.push('eventTime')
  if(!bizLocation)missing.push('bizLocation GS1')
  if(!readPoint)missing.push('readPoint GS1')

  if(mapping.epcisType==='ObjectEvent'){
   const product=text(identity.productClassUri)
   const quantity=event.type==='reception'?finite(event.metrics.acceptedKg):event.type==='dispatch'?finite(event.metrics.dispatchedKg):null
   if(!product)missing.push('product class GS1')
   if(!quantity)missing.push('quantity kg')
   if(mapping.cte==='receiving'&&!text(identity.sourcePartyUri))missing.push('source party GS1')
   if(mapping.cte==='receiving'&&!text(identity.destinationPartyUri))missing.push('destination party GS1')
   if(mapping.cte==='shipping'&&!text(identity.sourcePartyUri))missing.push('source party GS1')
   if(mapping.cte==='shipping'&&!text(identity.destinationPartyUri))missing.push('destination party GS1')
   if(missing.length){diagnostics.push({eventId:event.id,seafoodEventType:event.type,candidate:true,exportable:false,epcisType:mapping.epcisType,cte:mapping.cte,missing,reason:'Faltan identidades o datos mínimos; no se genera un evento EPCIS parcial.'});continue}
   const epcisEvent:EpcisObjectEvent={type:'ObjectEvent',eventTime:eventTime!,eventTimeZoneOffset:timezoneOffset(eventTime!),action:'OBSERVE',bizStep:bizStep(mapping.bizStep),readPoint:{id:readPoint!},bizLocation:{id:bizLocation!},quantityList:[{epcClass:product!,quantity:quantity!,uom:'KGM'}]}
   if(identity.sourcePartyUri)epcisEvent.sourceList=[{type:sourceType(),source:identity.sourcePartyUri}]
   if(identity.destinationPartyUri)epcisEvent.destinationList=[{type:destinationType(),destination:identity.destinationPartyUri}]
   eventList.push(epcisEvent)
   diagnostics.push({eventId:event.id,seafoodEventType:event.type,candidate:true,exportable:true,epcisType:mapping.epcisType,cte:mapping.cte,missing:[],reason:'Evento serializado desde evidencia e identidades explícitas.'})
   continue
  }

  const inputProduct=text(identity.inputProductClassUri),outputProduct=text(identity.outputProductClassUri)
  const inputKg=finite(event.metrics.inputKg),outputKg=finite(event.metrics.outputKg)
  if(!inputProduct)missing.push('input product class GS1')
  if(!outputProduct)missing.push('output product class GS1')
  if(!inputKg)missing.push('input quantity kg')
  if(!outputKg)missing.push('output quantity kg')
  if(missing.length){diagnostics.push({eventId:event.id,seafoodEventType:event.type,candidate:true,exportable:false,epcisType:mapping.epcisType,cte:mapping.cte,missing,reason:'Faltan identidades o cantidades de transformación; no se genera un evento EPCIS parcial.'});continue}
  eventList.push({type:'TransformationEvent',eventTime:eventTime!,eventTimeZoneOffset:timezoneOffset(eventTime!),bizStep:bizStep(mapping.bizStep),transformationID:`urn:pescamar:seafood-event:${encodeURIComponent(event.id)}`,readPoint:{id:readPoint!},bizLocation:{id:bizLocation!},inputQuantityList:[{epcClass:inputProduct!,quantity:inputKg!,uom:'KGM'}],outputQuantityList:[{epcClass:outputProduct!,quantity:outputKg!,uom:'KGM'}]})
  diagnostics.push({eventId:event.id,seafoodEventType:event.type,candidate:true,exportable:true,epcisType:mapping.epcisType,cte:mapping.cte,missing:[],reason:'Transformación serializada desde identidades y mass balance explícitos.'})
 }
 const document=eventList.length?{'@context':GDST2_EPCIS_CONTEXT,type:'EPCISDocument',schemaVersion:EPCIS2_VERSION,creationDate:new Date().toISOString(),epcisBody:{eventList}}:null
 return {schemaVersion:EPCIS2_SERIALIZER_SCHEMA,epcisVersion:EPCIS2_VERSION,readOnly:true,externalWriteEnabled:false,document,events:eventList,diagnostics,summary:{inputEvents:events.length,candidates:diagnostics.filter(item=>item.candidate).length,exportable:eventList.length,blocked:diagnostics.filter(item=>item.candidate&&!item.exportable).length},boundary:{internalIdsAreNotGs1:false,partialEventsAllowed:false,claimGdstCapable:false}}
}

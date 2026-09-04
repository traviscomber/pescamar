import {activeOrganization} from './_organization.js'

export const SEAFOOD_EVENT_SCHEMA='seafood.event.v1' as const

export type SeafoodEventType=
  |'reception'
  |'evidence'
  |'quality'
  |'production'
  |'vision'
  |'note'
  |'inventory'
  |'commercial_commitment'
  |'dispatch'
  |'sale'

export type SeafoodEvent={
  id:string
  schemaVersion:typeof SEAFOOD_EVENT_SCHEMA
  organizationId:string
  siteId:string|null
  lotId:string
  type:SeafoodEventType
  occurredAt:string|null
  title:string
  detail:string|null
  actor:string|null
  metrics:Record<string,unknown>
  source:{system:string;entityType:string;entityId:string}
}

type SeafoodEventInput=Omit<SeafoodEvent,'schemaVersion'|'organizationId'|'source'> & {
  source:{entityType:string;entityId:string}
}

export function seafoodEvent(input:SeafoodEventInput):SeafoodEvent{
  return {
    ...input,
    schemaVersion:SEAFOOD_EVENT_SCHEMA,
    organizationId:activeOrganization.organizationId,
    source:{system:activeOrganization.sourceSystem,...input.source},
  }
}

export function sortSeafoodEvents(events:SeafoodEvent[]){
  return [...events].sort((a,b)=>{
    const left=a.occurredAt?Date.parse(a.occurredAt):Number.MAX_SAFE_INTEGER
    const right=b.occurredAt?Date.parse(b.occurredAt):Number.MAX_SAFE_INTEGER
    return left-right||a.id.localeCompare(b.id)
  })
}

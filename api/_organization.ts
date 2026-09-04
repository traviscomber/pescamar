export type OrganizationIsolationMode='single_organization_legacy'|'organization_scoped'

export type OrganizationContext={
  organizationId:string
  implementationId:string
  implementationName:string
  implementationLabel:string
  sourceSystem:string
  isolationMode:OrganizationIsolationMode
  portableCore:boolean
}

export const activeOrganization:OrganizationContext={
  organizationId:'pescamar',
  implementationId:'pescamar',
  implementationName:'Pescamar',
  implementationLabel:'Implementation 01',
  sourceSystem:'pescamar',
  isolationMode:'single_organization_legacy',
  portableCore:true,
}

export function requestedOrganization(headers:Record<string,string|string[]|undefined>|undefined,expectedOrganizationId=activeOrganization.organizationId){
  const entry=Object.entries(headers??{}).find(([key])=>key.toLowerCase()==='x-seafood-organization-id')?.[1]
  const raw=Array.isArray(entry)?entry[0]:entry
  return String(raw??expectedOrganizationId).trim().toLowerCase()
}

export function resolveRequestOrganization(headers:Record<string,string|string[]|undefined>|undefined,expectedOrganizationId=activeOrganization.organizationId){
  const expected=expectedOrganizationId.trim().toLowerCase()
  const requested=requestedOrganization(headers,expected)
  if(expected!==activeOrganization.organizationId)return null
  return requested===expected?activeOrganization:null
}

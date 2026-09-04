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

export function requestedOrganization(headers:Record<string,string|string[]|undefined>|undefined){
  const raw=headers?.['x-seafood-organization-id']
  return String(Array.isArray(raw)?raw[0]:raw??activeOrganization.organizationId).trim().toLowerCase()
}

export function resolveRequestOrganization(headers:Record<string,string|string[]|undefined>|undefined){
  const requested=requestedOrganization(headers)
  return requested===activeOrganization.organizationId?activeOrganization:null
}

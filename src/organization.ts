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

export const organizationContext:OrganizationContext={
  organizationId:'pescamar',
  implementationId:'pescamar',
  implementationName:'Pescamar',
  implementationLabel:'Implementation 01',
  sourceSystem:'pescamar',
  isolationMode:'single_organization_legacy',
  portableCore:true,
}

export const organizationIsolationLabel=organizationContext.isolationMode==='organization_scoped'
  ?'Aislamiento por organización activo'
  :'Implementación única: aislamiento organizacional pendiente'

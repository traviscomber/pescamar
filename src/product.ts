import {organizationContext} from './organization'

export type ProductImplementation={
  id:string
  name:string
  label:string
  description:string
}

export const seafoodProduct={
  name:'Seafood Intelligence OS',
  shortName:'Seafood OS',
  company:'N3uralia',
  promise:'Run seafood operations with fewer manual tasks and clearer decisions.',
  promiseEs:'Opera seafood con menos tareas manuales y decisiones más claras.',
  operatingPrinciple:'Capture once. Confirm the physical. Automate the repetitive. Escalate exceptions. Decide with evidence.',
  operatingPrincipleEs:'Capturar una vez. Confirmar lo físico. Automatizar lo repetitivo. Escalar excepciones. Decidir con evidencia.',
  implementation:{
    id:organizationContext.implementationId,
    name:organizationContext.implementationName,
    label:organizationContext.implementationLabel,
    description:'Primera implementación operacional de Seafood Intelligence OS.',
  } satisfies ProductImplementation,
} as const

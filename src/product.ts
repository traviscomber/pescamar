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
  promise:'Operational intelligence for seafood and aquaculture',
  implementation:{
    id:'pescamar',
    name:'Pescamar',
    label:'Implementation 01',
    description:'Primera implementación operacional y proving ground del core reusable de Seafood Intelligence OS.',
  } satisfies ProductImplementation,
} as const

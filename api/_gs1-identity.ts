export const GS1_IDENTITY_SCHEMA='seafood.gs1-identity.v1' as const
export const GS1_DIGITAL_LINK_VERSION='1.7.0' as const
export const GS1_DIGITAL_LINK_STANDARD='https://ref.gs1.org/standards/digital-link/uri-syntax/1.7.0/' as const

export type Gs1KeyType='gtin'|'gln_location'|'gln_party'|'sscc'
export type Gs1EntityType='packing_spec'|'plant'|'inventory_location'|'party'|'pallet'

export const gs1KeyRules={
  gtin:{ai:'01',digits:14,entities:['packing_spec'] as const,label:'GTIN'},
  gln_location:{ai:'414',digits:13,entities:['plant','inventory_location'] as const,label:'GLN · ubicación física'},
  gln_party:{ai:'417',digits:13,entities:['party'] as const,label:'GLN · parte'},
  sscc:{ai:'00',digits:18,entities:['pallet'] as const,label:'SSCC'},
} as const satisfies Record<Gs1KeyType,{ai:string;digits:number;entities:readonly Gs1EntityType[];label:string}>

export function hasValidGs1CheckDigit(value:string){
  if(!/^\d{2,}$/.test(value))return false
  const body=value.slice(0,-1)
  let sum=0,multiplier=3
  for(let index=body.length-1;index>=0;index--){sum+=Number(body[index])*multiplier;multiplier=multiplier===3?1:3}
  return (10-(sum%10))%10===Number(value.at(-1))
}

export function validateGs1Identity(keyType:Gs1KeyType,value:string,entityType:Gs1EntityType){
  const normalized=String(value??'').trim(),rule=gs1KeyRules[keyType]
  if(!rule)return {valid:false,normalized,reason:'unsupported_key_type',referenceUri:null as string|null}
  if(!/^\d+$/.test(normalized)||normalized.length!==rule.digits)return {valid:false,normalized,reason:`${keyType}_requires_${rule.digits}_digits`,referenceUri:null as string|null}
  if(!hasValidGs1CheckDigit(normalized))return {valid:false,normalized,reason:'invalid_gs1_check_digit',referenceUri:null as string|null}
  if(!(rule.entities as readonly string[]).includes(entityType))return {valid:false,normalized,reason:'entity_type_not_allowed_for_key',referenceUri:null as string|null}
  return {valid:true,normalized,reason:null,referenceUri:`https://id.gs1.org/${rule.ai}/${normalized}`}
}

export const gs1IdentityContract={
  schemaVersion:GS1_IDENTITY_SCHEMA,
  digitalLinkVersion:GS1_DIGITAL_LINK_VERSION,
  standard:GS1_DIGITAL_LINK_STANDARD,
  keyRules:gs1KeyRules,
  statusFlow:['candidate','confirmed','rejected'] as const,
  boundary:{
    automaticGeneration:false,
    writesEnabled:false,
    humanReviewRequired:true,
    externalResolverAvailable:false,
    rule:'Los IDs GS1 se vinculan sólo desde evidencia real. Nunca se derivan de IDs internos, nombres, lotes o secuencias Pescamar.',
  },
} as const

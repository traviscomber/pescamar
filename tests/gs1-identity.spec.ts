import {expect,test} from '@playwright/test'
import {validateGs1Identity} from '../api/_gs1-identity'

test('GS1 identity contract accepts official key shapes and Digital Link paths',()=>{
 expect(validateGs1Identity('gtin','09520123456788','packing_spec')).toMatchObject({valid:true,referenceUri:'https://id.gs1.org/01/09520123456788'})
 expect(validateGs1Identity('gln_location','9520123456788','plant')).toMatchObject({valid:true,referenceUri:'https://id.gs1.org/414/9520123456788'})
 expect(validateGs1Identity('gln_location','9520123456788','inventory_location').valid).toBe(true)
 expect(validateGs1Identity('gln_party','9520123456788','party')).toMatchObject({valid:true,referenceUri:'https://id.gs1.org/417/9520123456788'})
 expect(validateGs1Identity('sscc','195201234567891232','pallet')).toMatchObject({valid:true,referenceUri:'https://id.gs1.org/00/195201234567891232'})
})

test('GS1 identity contract rejects short, invalid checksum and semantically wrong keys',()=>{
 expect(validateGs1Identity('gtin','9520123456788','packing_spec')).toMatchObject({valid:false,reason:'gtin_requires_14_digits'})
 expect(validateGs1Identity('gtin','09520123456789','packing_spec')).toMatchObject({valid:false,reason:'invalid_gs1_check_digit'})
 expect(validateGs1Identity('sscc','195201234567891232','party')).toMatchObject({valid:false,reason:'entity_type_not_allowed_for_key'})
})

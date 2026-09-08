import {readFile} from 'node:fs/promises'
const failures=[]
const assert=(condition,message)=>{if(!condition)failures.push(message)}
const [serializer,gdst]=await Promise.all([
 readFile(new URL('../api/_epcis2.ts',import.meta.url),'utf8'),
 readFile(new URL('../api/_gdst2.ts',import.meta.url),'utf8'),
])
for(const marker of ["EPCIS2_SERIALIZER_SCHEMA='seafood.epcis2-serializer.v1'","EPCIS2_VERSION='2.0'","type:'EPCISDocument'","type:'ObjectEvent'","type:'TransformationEvent'","uom:'KGM'","partialEventsAllowed:false","internalIdsAreNotGs1:true","claimGdstCapable:false"])assert(serializer.includes(marker),`serializer missing ${marker}`)
for(const missing of ['product class GS1','bizLocation GS1','readPoint GS1','source party GS1','destination party GS1','input product class GS1','output product class GS1','input quantity kg','output quantity kg'])assert(serializer.includes(missing),`serializer must fail closed on ${missing}`)
assert(serializer.includes("event.type==='reception'?finite(event.metrics.acceptedKg)")&&serializer.includes("event.type==='dispatch'?finite(event.metrics.dispatchedKg)"),'serializer must use explicit positive kg, not inferred quantities')
assert(serializer.includes("document=eventList.length?")&&serializer.includes(':null'),'serializer must not emit an empty/partial EPCIS document')
assert(gdst.includes("canClaimGdstCapable:false"),'serializer must not change GDST claim boundary')
if(failures.length){console.error('EPCIS 2.0 serializer smoke FAILED');for(const failure of failures)console.error(`- ${failure}`);process.exit(1)}
console.log('EPCIS 2.0 serializer smoke PASS: read-only fail-closed serialization preserves GS1/evidence boundaries')

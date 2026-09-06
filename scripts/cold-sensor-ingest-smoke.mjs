import {readFile} from 'node:fs/promises'

const failures=[]
const assert=(condition,message)=>{if(!condition)failures.push(message)}
const [endpoint,statusEndpoint,integration,control,focus,model]=await Promise.all([
 readFile(new URL('../api/cold-sensor-ingest.ts',import.meta.url),'utf8'),
 readFile(new URL('../api/cold-sensor-status.ts',import.meta.url),'utf8'),
 readFile(new URL('../api/_integration.ts',import.meta.url),'utf8'),
 readFile(new URL('../src/pages/ColdChainControl.tsx',import.meta.url),'utf8'),
 readFile(new URL('../src/pages/ColdChainFocus.tsx',import.meta.url),'utf8'),
 readFile(new URL('../src/pages/OperatingModel.tsx',import.meta.url),'utf8'),
])

assert(endpoint.includes("COLD_SENSOR_INGEST_SECRET"),'sensor ingest must fail closed behind a dedicated secret')
assert(endpoint.includes("PLANT_EXECUTION_WRITES_ENABLED"),'sensor ingest must honor Plant Execution write gate')
assert(endpoint.includes("x-pescamar-sensor-key")&&endpoint.includes('timingSafeEqual'),'sensor ingest must authenticate machine writes without an operator session')
assert(endpoint.includes("source,device_id,observed_by_operator_id")&&endpoint.includes("'sensor'")&&endpoint.includes('::uuid,null'),'sensor telemetry must be stored as machine-originated evidence without a fake operator')
assert(endpoint.includes("run.status!=='open'")&&endpoint.includes("device.device_type!=='sensor'")&&endpoint.includes('device.plant_id!==run.plant_id'),'sensor ingest must fail closed on run and device scope')
assert(endpoint.includes('run.station_id&&device.station_id!==run.station_id'),'sensor ingest must bind telemetry to the cold asset station')
assert(endpoint.includes('idempotency_key')&&endpoint.includes('Idempotency key ya utilizada para otra lectura'),'sensor ingest must protect replay')
assert(statusEndpoint.includes("req.method!=='GET'")&&statusEndpoint.includes('requireOperator(req)'),'sensor activation status must remain authenticated and read-only')
assert(statusEndpoint.includes("sensorObservationCount>0?'observed':endpointConfigured&&activeSensors>0?'ready_for_test':'not_configured'"),'sensor activation state must require observed machine evidence before declaring telemetry active')
assert(statusEndpoint.includes("process.env.COLD_SENSOR_INGEST_SECRET")&&statusEndpoint.includes("PLANT_EXECUTION_WRITES_ENABLED"),'sensor readiness must derive from real configuration without exposing secret values')
assert(integration.includes("id:'pescamar-cold-sensor-rest'")&&integration.includes("status:'foundation'")&&integration.includes('No se declara sensor, gateway ni secreto operacional configurado.'),'integration registry must describe the sensor endpoint as foundation, not live hardware')
assert(integration.includes("id:'mqtt-edge'")&&integration.includes("status:'planned'")&&integration.includes('No se declara broker ni hardware operacional'),'integration registry must not pretend MQTT hardware is live')
assert(control.includes('Lectura manual auditada')&&control.includes("source:'manual'")&&control.includes('Registrar lectura manual'),'manual cold-chain evidence must remain the only operator-entered temperature path')
assert(!control.includes('Sensor de estación'),'operator UI must not simulate sensor telemetry through manual entry')
assert(control.includes('La telemetría automática no se digita aquí'),'UI must explain the machine-to-machine boundary')
assert(focus.includes("'not_configured'|'ready_for_test'|'observed'")&&focus.includes('Telemetría observada')&&focus.includes('Listo para prueba')&&focus.includes('No configurado'),'daily cold-chain UI must expose truthful activation states')
assert(focus.includes("fetch('/api/cold-sensor-status'"),'daily cold-chain UI must read server-observed sensor status')
assert(model.includes("stage:'Cadena de frío',state:'partial'")&&model.includes('verificar telemetría live antes de declarar automatización operacional'),'operating model must keep cold chain partial until live sensor evidence exists')
assert(model.includes("stage:'Comercial',state:'ready'"),'commercial workflow may be minimum-flow once remaining human actions are material commitments')

if(failures.length){
 console.error('Cold sensor ingest contract FAILED')
 for(const failure of failures)console.error(`- ${failure}`)
 process.exit(1)
}
console.log('Cold sensor ingest contract PASS: machine-only ingestion, authenticated activation state, manual fallback, station scope, replay protection and truthful live-status semantics verified')
import {readFile} from 'node:fs/promises'

const failures=[]
const assert=(condition,message)=>{if(!condition)failures.push(message)}

const [events,insights,beacon,access,vercel,app,migration,migration057]=await Promise.all([
 readFile(new URL('../api/pilot-events.ts',import.meta.url),'utf8'),
 readFile(new URL('../api/pilot-insights.ts',import.meta.url),'utf8'),
 readFile(new URL('../src/hooks/usePilotTelemetry.ts',import.meta.url),'utf8'),
 readFile(new URL('../src/access.ts',import.meta.url),'utf8'),
 readFile(new URL('../vercel.json',import.meta.url),'utf8'),
 readFile(new URL('../src/App.tsx',import.meta.url),'utf8'),
 readFile(new URL('../db/migrations/056_pilot_events.sql',import.meta.url),'utf8'),
 readFile(new URL('../db/migrations/057_pilot_heartbeat.sql',import.meta.url),'utf8'),
])

// Ingest endpoint: session-authenticated, session-stamped, rate-limited, minimal data.
assert(events.includes("from './_auth.js'")&&events.includes('requireOperator'),'pilot events must authenticate via requireOperator')
assert(events.includes("request.method!=='POST'")&&events.includes('405'),'pilot events endpoint must be POST-only')
assert(events.includes("response.status(401)")&&events.includes("response.status(429)"),'pilot events must reject unauthenticated and rate-limited traffic')
assert(events.includes("operator.role")&&!/body\.role|body\?\.role/.test(events),'pilot events role must come from the session, never the client')
assert(events.includes("path.includes('?')")&&events.includes("path.includes('#')"),'pilot events must reject query strings and fragments in paths')
assert(events.includes("'route_visited'"),'pilot events must whitelist the event kind')
assert(events.includes("'instrumentation_heartbeat'"),'pilot events must accept the instrumentation heartbeat')
assert(!/email|fullName|full_name|searchParams/.test(events),'pilot events must not read PII or query strings')

// Insights endpoint: admin-only read aggregate with zero writes.
assert(insights.includes("request.method!=='GET'")&&insights.includes('405'),'pilot insights endpoint must be GET-only')
assert(insights.includes("operator.role!=='admin'")&&insights.includes("response.status(403)"),'pilot insights must be admin-only')
assert(insights.includes('from pilot_events')&&insights.includes('from ml_feedback'),'pilot insights must aggregate pilot events and ML feedback')
assert(insights.includes(`'YYYY-MM-DD') "day"`),'pilot insights daily-active query must quote the day alias (reserved word in PostgreSQL)')
assert(!/\b(insert|update|delete)\s+(into|from|[a-z_]+\s+set)\b/i.test(insights),'pilot insights must not mutate data')

// Client beacon: invisible, batched, beacon-first, no-op without sendBeacon.
assert(beacon.includes('useLocation')&&beacon.includes('pathname'),'beacon must derive paths from react-router location')
assert(beacon.includes("typeof navigator.sendBeacon!=='function'"),'beacon must no-op when sendBeacon is unavailable')
assert(beacon.includes("sendBeacon('/api/pilot-events'")&&beacon.includes('keepalive:true'),'beacon must use sendBeacon with a fetch-keepalive fallback')
assert(beacon.includes("startsWith('/admin')"),'beacon must not instrument admin surfaces')
assert(beacon.includes('instrumentation_heartbeat'),'beacon must emit one instrumentation heartbeat per session')
assert(beacon.includes('pagehide'),'beacon must flush on pagehide so navigation is not lost')
assert(!/URLSearchParams|location\.search|window\.location\.search/.test(beacon),'beacon must never read query strings')
assert(app.includes('usePilotTelemetry(Boolean(operator))'),'beacon must be wired at the authenticated app level')

// Access surface: URL-only admin gate with SPA rewrite and canonical migration.
assert(access.includes('"/admin/pilotaje":["admin"]'),'access map must gate /admin/pilotaje to admin')
assert(vercel.includes('"/admin/pilotaje"')&&vercel.includes('"/index.html"'),'vercel.json must rewrite /admin/pilotaje to the SPA shell')
assert(app.includes('path="/admin/pilotaje"')&&app.includes('gate("/admin/pilotaje",<AdminPilotaje/>)'),'App.tsx must register the gated pilotaje route')
assert(migration.includes('create table if not exists pilot_events'),'migration 056 must create pilot_events')
assert(migration.includes("insert into schema_migrations")&&migration.includes("'056_pilot_events.sql'")&&migration.includes("'applied'"),'migration 056 must record the canonical applied attestation')
assert(migration057.includes('alter table pilot_events')&&migration057.includes("'instrumentation_heartbeat'"),'migration 057 must relax the pilot_events event check for the heartbeat')
assert(migration057.includes("insert into schema_migrations")&&migration057.includes("'057_pilot_heartbeat.sql'")&&migration057.includes("'applied'"),'migration 057 must record the canonical applied attestation')

if(failures.length){
 console.error('Pilot telemetry contract FAILED')
 for(const failure of failures)console.error(`- ${failure}`)
 process.exit(1)
}
console.log('Pilot telemetry contract PASS: beacon module, ingest endpoint, admin insights, access gate and migration 056 verified')

import {readFile} from 'node:fs/promises'
const [access,api,page,shell]=await Promise.all([
  readFile(new URL('../src/access.ts',import.meta.url),'utf8'),
  readFile(new URL('../api/audit.ts',import.meta.url),'utf8'),
  readFile(new URL('../src/pages/Audit.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/components/AppShell.tsx',import.meta.url),'utf8'),
])
const failures=[]
const check=(ok,msg)=>{if(!ok)failures.push(msg)}
check(access.includes('"/auditoria":["admin","operations"]'),'audit route must be restricted to Admin and Operations')
check(api.includes("const canAudit=(o:SessionOperator)=>['admin','operations'].includes(o.role)"),'audit API must enforce management roles')
check(api.includes("financial=operator.role==='admin'"),'financial audit events must remain Admin-only')
check(api.includes('a.plant_id=any(${plantIds}::text[])'),'audit API must scope Operations by plant')
check(api.includes('a.operator_id=${operatorId||null}::uuid'),'audit API must filter by stable operator identity')
check(page.includes('Auditoría operacional')&&page.includes('Identidad no enlazada'),'audit UI must expose operational traceability and legacy identity state honestly')
check(page.includes('data-label="Fecha"')&&page.includes('audit-table'),'audit UI must include mobile-readable table semantics')
check(shell.includes('{to:"/auditoria",label:"Auditoría operacional"'),'audit must be reachable from management navigation')
if(failures.length){console.error('Operational audit smoke FAILED');failures.forEach(f=>console.error(`- ${f}`));process.exit(1)}
console.log('Operational audit smoke PASS')

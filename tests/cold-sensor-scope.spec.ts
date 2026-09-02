import {readFile} from 'node:fs/promises'
import {expect,test} from '@playwright/test'

test('cold observations always inherit the run plant boundary in PostgreSQL',async()=>{
 const migration=(await readFile('db/migrations/040_cold_sensor_station_scope.sql','utf8')).toLowerCase()
 expect(migration).toContain('enforce_cold_observation_scope')
 expect(migration).toContain('new.plant_id<>run_plant')
 expect(migration).toContain('before insert or update on cold_observations')
})

test('sensor evidence is bound to an active sensor and the physical asset station',async()=>{
 const migration=(await readFile('db/migrations/040_cold_sensor_station_scope.sql','utf8')).toLowerCase()
 expect(migration).toContain("device_type<>'sensor'")
 expect(migration).toContain('not device_active')
 expect(migration).toContain('not device_station_active')
 expect(migration).toContain('asset_station is not null and device_station<>asset_station')
 expect(migration).toContain('sensor pertenece a otra estación de frío')
})

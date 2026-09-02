-- Sensor evidence must belong to the same plant as the cold run and, when the
-- cold asset is bound to a station, to that exact station. This is enforced in
-- PostgreSQL so alternate ingestion paths cannot attach another tunnel's sensor.

create or replace function enforce_cold_observation_scope() returns trigger
language plpgsql as $$
declare
  run_plant text;
  asset_station uuid;
  device_station uuid;
  device_plant text;
  device_type text;
  device_active boolean;
  device_station_active boolean;
begin
  select r.plant_id,a.station_id
    into run_plant,asset_station
  from cold_runs r
  join cold_assets a on a.id=r.asset_id
  where r.id=new.run_id;

  if run_plant is null or new.plant_id<>run_plant then
    raise exception 'Observación de frío fuera del alcance de planta del ciclo';
  end if;

  if new.source='sensor' then
    select d.station_id,s.plant_id,d.device_type,d.active,s.active
      into device_station,device_plant,device_type,device_active,device_station_active
    from plant_devices d
    join plant_stations s on s.id=d.station_id
    where d.id=new.device_id;

    if device_station is null
      or device_plant<>run_plant
      or device_type<>'sensor'
      or not device_active
      or not device_station_active then
      raise exception 'Sensor no disponible para este ciclo de frío';
    end if;

    if asset_station is not null and device_station<>asset_station then
      raise exception 'Sensor pertenece a otra estación de frío';
    end if;
  end if;

  return new;
end $$;

drop trigger if exists cold_observations_scope_guard on cold_observations;
create trigger cold_observations_scope_guard
before insert or update on cold_observations
for each row execute function enforce_cold_observation_scope();

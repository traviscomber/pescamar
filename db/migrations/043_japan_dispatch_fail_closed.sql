-- 043_japan_dispatch_fail_closed.sql
-- Defense in depth for Japan exports: a confirmed dispatch to Japan is rejected
-- at the database boundary unless every Japan Release gate is satisfied.

create or replace function japan_destination_matches(p_destination text) returns boolean
language sql immutable as $$
  select
    translate(lower(coalesce(p_destination,'')),'áéíóú','aeiou') ~ '(^|[^a-z])(japan|jp|tokyo|osaka|yokohama|kobe|nagoya|narita|haneda)([^a-z]|$)'
    or coalesce(p_destination,'') like '%日本%'
$$;

create or replace function japan_reception_is_released(p_reception_id uuid) returns boolean
language sql stable as $$
  with latest_process as (
    select u.status,u.grade,u.color_status,u.xray_status
    from sea_urchin_process_runs u
    where u.reception_id=p_reception_id
    order by u.updated_at desc
    limit 1
  ),
  latest_evidence as (
    select distinct on (e.gate_code)
      e.gate_code,e.status,e.valid_until,e.verified_at
    from japan_export_release_evidence e
    where e.reception_id=p_reception_id
    order by e.gate_code,e.verified_at desc
  )
  select
    exists(
      select 1 from latest_process p
      where p.status in ('ready_for_packing','closed')
        and nullif(trim(p.grade),'') is not null
        and p.color_status='accepted'
        and p.xray_status='passed'
    )
    and exists(select 1 from product_labels l where l.reception_id=p_reception_id)
    and not exists(
      select 1 from product_labels l
      where l.reception_id=p_reception_id
        and (
          l.status<>'validated'
          or (l.source_message_id is null and nullif(trim(l.source_document_url),'') is null)
        )
    )
    and not regulatory_reception_is_blocked(p_reception_id)
    and (
      select count(*)
      from latest_evidence e
      where e.status='approved'
        and (e.valid_until is null or e.valid_until>=current_date)
    )=10
$$;

create or replace function enforce_japan_dispatch_release() returns trigger
language plpgsql as $$
begin
  if new.status='confirmed'
     and japan_destination_matches(new.destination)
     and not japan_reception_is_released(new.reception_id) then
    raise exception 'Despacho bloqueado por Japan Release';
  end if;
  return new;
end $$;

drop trigger if exists lot_dispatches_japan_release_gate on lot_dispatches;
create trigger lot_dispatches_japan_release_gate
before insert or update of reception_id,destination,status on lot_dispatches
for each row execute function enforce_japan_dispatch_release();

create or replace function japan_reception_has_valid_cold_chain(p_reception_id uuid) returns boolean
language sql stable as $$
  select exists(
    select 1
    from cold_run_loads l
    join cold_runs r on r.id=l.run_id
    where l.reception_id=p_reception_id
      and l.removed_at is null
      and l.released_at is not null
      and r.status='completed'
      and r.completed_at is not null
      and r.observation_count>0
      and r.deviation_count=0
      and r.observed_min_c is not null
      and r.observed_max_c is not null
      and (r.min_allowed_c is null or r.observed_min_c>=r.min_allowed_c)
      and (r.max_allowed_c is null or r.observed_max_c<=r.max_allowed_c)
  )
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
    and japan_reception_has_valid_cold_chain(p_reception_id)
    and (
      select count(*)
      from latest_evidence e
      where e.status='approved'
        and (e.valid_until is null or e.valid_until>=current_date)
    )=10
$$;

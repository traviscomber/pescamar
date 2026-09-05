-- Fail-closed sequential control for sea urchin processing.
-- A later stage cannot be validated until every earlier stage is OK or not applicable.
-- Run release states also require the appropriate stage gates.

create or replace function enforce_sea_urchin_stage_sequence()
returns trigger
language plpgsql
as $$
declare
  blocking_stage text;
begin
  if new.status = 'pending' then
    return new;
  end if;

  select s.stage
    into blocking_stage
  from sea_urchin_stage_checks s
  where s.run_id = new.run_id
    and s.sequence_no < new.sequence_no
    and s.status not in ('ok','not_applicable')
  order by s.sequence_no
  limit 1;

  if blocking_stage is not null then
    raise exception 'SEA_URCHIN_SEQUENCE_BLOCKED: prior stage % is not validated', blocking_stage
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists sea_urchin_stage_sequence_guard on sea_urchin_stage_checks;
create trigger sea_urchin_stage_sequence_guard
before update of status on sea_urchin_stage_checks
for each row
when (new.status is distinct from old.status)
execute function enforce_sea_urchin_stage_sequence();

create or replace function enforce_sea_urchin_run_release_sequence()
returns trigger
language plpgsql
as $$
declare
  blocking_stage text;
  max_required_sequence integer;
begin
  if new.status not in ('ready_for_packing','released','closed') then
    return new;
  end if;

  max_required_sequence := case
    when new.status = 'ready_for_packing' then 100
    else 110
  end;

  select s.stage
    into blocking_stage
  from sea_urchin_stage_checks s
  where s.run_id = new.id
    and s.sequence_no <= max_required_sequence
    and s.status not in ('ok','not_applicable')
  order by s.sequence_no
  limit 1;

  if blocking_stage is not null then
    raise exception 'SEA_URCHIN_RELEASE_BLOCKED: stage % is not validated', blocking_stage
      using errcode = 'check_violation';
  end if;

  if new.status in ('ready_for_packing','released','closed')
     and (new.grade is null or new.color_status <> 'accepted' or new.xray_status <> 'passed') then
    raise exception 'SEA_URCHIN_RELEASE_BLOCKED: grade, color and xray must be approved'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists sea_urchin_run_release_sequence_guard on sea_urchin_process_runs;
create trigger sea_urchin_run_release_sequence_guard
before update of status, grade, color_status, xray_status on sea_urchin_process_runs
for each row
when (new.status in ('ready_for_packing','released','closed'))
execute function enforce_sea_urchin_run_release_sequence();

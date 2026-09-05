-- Fail-closed sequential control for sea urchin processing.
-- Declarative implementation: generated dependency keys + self-referential foreign keys.
-- No trigger or PL/pgSQL body is required.

alter table sea_urchin_stage_checks
  add column sequence_pass boolean generated always as (status in ('ok','not_applicable')) stored,
  add column required_previous_sequence_no integer generated always as (
    case
      when status='pending' or sequence_no<=10 then null
      else sequence_no-10
    end
  ) stored,
  add column required_previous_pass boolean generated always as (
    case
      when status='pending' or sequence_no<=10 then null
      else true
    end
  ) stored;

alter table sea_urchin_stage_checks
  add constraint sea_urchin_stage_sequence_mapping_check
  check (
    (stage='pinching' and sequence_no=10)
    or (stage='blanching' and sequence_no=20)
    or (stage='thermal_shock' and sequence_no=30)
    or (stage='sanitary_break' and sequence_no=40)
    or (stage='dripping' and sequence_no=50)
    or (stage='draining' and sequence_no=60)
    or (stage='molding' and sequence_no=70)
    or (stage='color' and sequence_no=80)
    or (stage='xray' and sequence_no=90)
    or (stage='freezing' and sequence_no=100)
    or (stage='packing' and sequence_no=110)
  );

alter table sea_urchin_stage_checks
  add constraint sea_urchin_stage_sequence_pass_unique
  unique (run_id,sequence_no,sequence_pass);

alter table sea_urchin_stage_checks
  add constraint sea_urchin_stage_previous_pass_fk
  foreign key (run_id,required_previous_sequence_no,required_previous_pass)
  references sea_urchin_stage_checks(run_id,sequence_no,sequence_pass)
  deferrable initially immediate;

alter table sea_urchin_process_runs
  add column required_terminal_sequence_no integer generated always as (
    case
      when status='ready_for_packing' then 100
      when status in ('released','closed') then 110
      else null
    end
  ) stored,
  add column required_terminal_pass boolean generated always as (
    case
      when status in ('ready_for_packing','released','closed') then true
      else null
    end
  ) stored;

alter table sea_urchin_process_runs
  add constraint sea_urchin_run_release_classification_check
  check (
    status not in ('ready_for_packing','released','closed')
    or (grade is not null and color_status='accepted' and xray_status='passed')
  );

alter table sea_urchin_process_runs
  add constraint sea_urchin_run_terminal_stage_fk
  foreign key (id,required_terminal_sequence_no,required_terminal_pass)
  references sea_urchin_stage_checks(run_id,sequence_no,sequence_pass)
  deferrable initially immediate;

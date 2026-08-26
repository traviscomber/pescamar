-- Transversal label release gates for Pescamar.
-- Legacy lots remain operational until label control starts for that reception.

alter table product_labels
  add constraint product_labels_validated_evidence_chk
  check (
    status <> 'validated'
    or source_message_id is not null
    or nullif(trim(source_document_url),'') is not null
  ) not valid;

alter table product_labels validate constraint product_labels_validated_evidence_chk;

create or replace function pescamar_label_release_state(p_reception_id uuid)
returns table(controlled boolean,releasable boolean,reasons text[])
language sql
stable
as $$
  with label_state as (
    select
      count(*)::int total,
      count(*) filter (where status='validated')::int validated,
      count(*) filter (where status in ('pending','mismatch','blocked'))::int blocked,
      count(*) filter (
        where status='validated'
          and source_message_id is null
          and nullif(trim(source_document_url),'') is null
      )::int missing_evidence
    from product_labels
    where reception_id=p_reception_id
  )
  select
    total>0 as controlled,
    case when total=0 then true else blocked=0 and validated>0 and missing_evidence=0 end as releasable,
    array_remove(array[
      case when total>0 and validated=0 then 'Sin etiquetas validadas' end,
      case when blocked>0 then 'Etiqueta pendiente, bloqueada o no coincide' end,
      case when missing_evidence>0 then 'Etiqueta validada sin evidencia' end
    ],null)::text[] as reasons
  from label_state;
$$;

create or replace function enforce_product_label_release()
returns trigger
language plpgsql
as $$
declare
  v_controlled boolean;
  v_releasable boolean;
  v_reasons text[];
begin
  select controlled,releasable,reasons
  into v_controlled,v_releasable,v_reasons
  from pescamar_label_release_state(new.reception_id);

  if v_controlled and not v_releasable then
    raise exception 'label_release_blocked:%', array_to_string(v_reasons,' · ');
  end if;
  return new;
end;
$$;

create or replace function enforce_inventory_label_release()
returns trigger
language plpgsql
as $$
declare
  v_kind text;
  v_controlled boolean;
  v_releasable boolean;
  v_reasons text[];
begin
  if new.to_location_id is null then
    return new;
  end if;

  select kind into v_kind from inventory_locations where id=new.to_location_id;
  if v_kind not in ('finished_goods','dispatch') then
    return new;
  end if;

  select controlled,releasable,reasons
  into v_controlled,v_releasable,v_reasons
  from pescamar_label_release_state(new.reception_id);

  if v_controlled and not v_releasable then
    raise exception 'label_release_blocked:%', array_to_string(v_reasons,' · ');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_label_gate_sales_order_allocations on sales_order_allocations;
create trigger trg_label_gate_sales_order_allocations
before insert or update on sales_order_allocations
for each row execute function enforce_product_label_release();

drop trigger if exists trg_label_gate_dispatches on lot_dispatches;
create trigger trg_label_gate_dispatches
before insert or update on lot_dispatches
for each row
when (new.status='confirmed')
execute function enforce_product_label_release();

drop trigger if exists trg_label_gate_inventory on inventory_movements;
create trigger trg_label_gate_inventory
before insert or update on inventory_movements
for each row execute function enforce_inventory_label_release();

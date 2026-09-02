-- Freeze physical pallet composition while a pallet-level regulatory hold is blocking.
-- This preserves the lineage used by regulatory_reception_is_blocked and prevents
-- removing a packing unit from becoming an unintended regulatory release.
-- Both hold creation and membership mutation lock the same pallet row so the rule
-- remains correct under concurrent transactions.

create or replace function lock_regulatory_hold_pallet_scope() returns trigger
language plpgsql as $$
begin
  if new.pallet_id is not null and new.status in ('open','rejected') then
    perform 1 from pallets where id=new.pallet_id for update;
  end if;
  return new;
end $$;

drop trigger if exists regulatory_holds_pallet_scope_lock on regulatory_holds;
create trigger regulatory_holds_pallet_scope_lock
before insert or update on regulatory_holds
for each row execute function lock_regulatory_hold_pallet_scope();

create or replace function enforce_regulatory_pallet_membership_freeze() returns trigger
language plpgsql as $$
declare
  blocked boolean;
begin
  if tg_op='INSERT' then
    perform 1 from pallets where id=new.pallet_id for update;
    select exists(
      select 1 from regulatory_holds h
      where h.pallet_id=new.pallet_id and h.status in ('open','rejected')
    ) into blocked;
  elsif tg_op='DELETE' then
    perform 1 from pallets where id=old.pallet_id for update;
    select exists(
      select 1 from regulatory_holds h
      where h.pallet_id=old.pallet_id and h.status in ('open','rejected')
    ) into blocked;
  else
    perform 1
    from pallets
    where id in (old.pallet_id,new.pallet_id)
    order by id
    for update;
    select exists(
      select 1 from regulatory_holds h
      where h.status in ('open','rejected')
        and h.pallet_id in (old.pallet_id,new.pallet_id)
    ) into blocked;
  end if;

  if blocked then
    raise exception 'Pallet bloqueado por control regulatorio; su composición no puede cambiar';
  end if;

  if tg_op='DELETE' then return old; end if;
  return new;
end $$;

drop trigger if exists pallet_packing_units_regulatory_freeze on pallet_packing_units;
create trigger pallet_packing_units_regulatory_freeze
before insert or update or delete on pallet_packing_units
for each row execute function enforce_regulatory_pallet_membership_freeze();

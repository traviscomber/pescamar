-- Freeze physical pallet composition while a pallet-level regulatory hold is blocking.
-- This preserves the lineage used by regulatory_reception_is_blocked and prevents
-- removing a packing unit from becoming an unintended regulatory release.

create or replace function enforce_regulatory_pallet_membership_freeze() returns trigger
language plpgsql as $$
declare
  blocked boolean;
begin
  if tg_op='INSERT' then
    select exists(
      select 1 from regulatory_holds h
      where h.pallet_id=new.pallet_id and h.status in ('open','rejected')
    ) into blocked;
  elsif tg_op='DELETE' then
    select exists(
      select 1 from regulatory_holds h
      where h.pallet_id=old.pallet_id and h.status in ('open','rejected')
    ) into blocked;
  else
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

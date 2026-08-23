-- 013_fix_create_lot_sale.sql
-- Corrige la ambigüedad entre la variable PL/pgSQL sold_kg y la columna lot_sales.sold_kg.
-- Validado en branch Neon aislada mediante flujo E2E recepción -> producción -> inventario -> costo -> despacho -> venta -> liquidación -> cierre.

create or replace function public.create_lot_sale(
  p_reception_id uuid,
  p_dispatch_id uuid,
  p_customer_id uuid,
  p_kg numeric,
  p_price_per_kg_clp bigint,
  p_invoice_ref text,
  p_sold_at timestamptz,
  p_created_by text
) returns lot_sales language plpgsql as $$
declare
  r receptions%rowtype;
  base_kg numeric;
  v_sold_kg numeric;
  dispatch_available numeric;
  result lot_sales;
begin
  select * into r from receptions where id=p_reception_id for update;
  if not found then raise exception 'Lote no disponible'; end if;

  select coalesce(
    (select (le.metrics->>'outputKg')::numeric
      from lot_events le
      where le.reception_id=p_reception_id
        and le.event_type='production'
        and le.metrics ? 'outputKg'
      order by le.occurred_at desc
      limit 1),
    r.accepted_kg,
    greatest(0,r.gross_kg-r.tare_kg)
  ) into base_kg;

  select coalesce(sum(ls.sold_kg),0)
    into v_sold_kg
    from lot_sales ls
    where ls.reception_id=p_reception_id
      and ls.status='confirmed';

  if p_kg<=0 or p_price_per_kg_clp<=0 or p_kg>base_kg-v_sold_kg+0.0001 then
    raise exception 'Venta supera kilos físicos del lote';
  end if;

  if p_dispatch_id is not null then
    select d.dispatched_kg-coalesce((
      select sum(ls.sold_kg)
      from lot_sales ls
      where ls.dispatch_id=d.id and ls.status='confirmed'
    ),0)
    into dispatch_available
    from lot_dispatches d
    where d.id=p_dispatch_id
      and d.reception_id=p_reception_id
      and d.status='confirmed'
    for update;

    if dispatch_available is null or p_kg>dispatch_available+0.0001 then
      raise exception 'Venta supera el despacho seleccionado';
    end if;
  end if;

  insert into lot_sales(
    reception_id,dispatch_id,customer_id,sold_kg,price_per_kg_clp,invoice_ref,sold_at,created_by
  ) values(
    p_reception_id,p_dispatch_id,p_customer_id,p_kg,p_price_per_kg_clp,p_invoice_ref,p_sold_at,p_created_by
  ) returning * into result;

  return result;
end $$;

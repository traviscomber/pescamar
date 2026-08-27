create table if not exists business_partner_profiles (
  party_id uuid primary key references parties(id) on delete cascade,
  contact_name text,
  email text,
  address text,
  city text,
  country text,
  payment_terms text,
  notes text,
  tags jsonb not null default '[]'::jsonb,
  source_file_hash text references canonical_source_files(file_hash),
  updated_at timestamptz not null default now(),
  updated_by_operator_id uuid references operators(id)
);

create table if not exists purchase_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null,
  supplier_id uuid not null references parties(id),
  plant_id text,
  issue_date date not null,
  currency text not null default 'CLP',
  net_amount numeric not null default 0,
  tax_amount numeric not null default 0,
  total_amount numeric not null default 0,
  status text not null default 'confirmed',
  source_file_hash text references canonical_source_files(file_hash),
  notes text,
  created_at timestamptz not null default now(),
  unique(order_number,supplier_id)
);

create table if not exists purchase_order_lines (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references purchase_orders(id) on delete cascade,
  reception_id uuid references receptions(id),
  item_type text not null default 'service',
  description text not null,
  quantity numeric,
  unit text,
  unit_price numeric,
  line_total numeric not null default 0
);

create table if not exists export_invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  customer_id uuid references parties(id),
  issue_date date not null,
  plant_id text,
  destination text,
  incoterm text,
  currency text not null default 'USD',
  net_weight_kg numeric,
  gross_weight_kg numeric,
  goods_amount numeric not null default 0,
  freight_amount numeric not null default 0,
  total_amount numeric not null default 0,
  status text not null default 'confirmed',
  source_file_hash text references canonical_source_files(file_hash),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists export_invoice_lines (
  id uuid primary key default gen_random_uuid(),
  export_invoice_id uuid not null references export_invoices(id) on delete cascade,
  reception_id uuid references receptions(id),
  description text not null,
  quantity numeric,
  unit text,
  cases numeric,
  unit_price numeric,
  line_total numeric not null default 0
);

create table if not exists inventory_items (
  id uuid primary key default gen_random_uuid(),
  sku text unique,
  name text not null,
  category text not null check(category in ('raw_material','ingredient','packaging','consumable','spare_part','other')),
  unit text not null,
  preferred_supplier_id uuid references parties(id),
  minimum_stock numeric not null default 0,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists inventory_item_movements (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references inventory_items(id),
  plant_id text not null,
  location_id uuid references inventory_locations(id),
  supplier_id uuid references parties(id),
  movement_type text not null check(movement_type in ('receipt','consume','transfer_in','transfer_out','adjustment_in','adjustment_out')),
  quantity numeric not null check(quantity > 0),
  unit_cost_clp numeric,
  document_ref text,
  occurred_at timestamptz not null default now(),
  created_by text not null,
  created_by_operator_id uuid references operators(id),
  created_at timestamptz not null default now()
);

create index if not exists inventory_item_movements_item_plant_idx on inventory_item_movements(item_id,plant_id,occurred_at desc);
create index if not exists purchase_orders_supplier_date_idx on purchase_orders(supplier_id,issue_date desc);
create index if not exists export_invoices_customer_date_idx on export_invoices(customer_id,issue_date desc);

create or replace view supplier_profitability as
with sales as (
  select r.supplier_id,sum(s.sold_kg) sold_kg,sum(s.sold_kg*s.price_per_kg_clp) revenue_clp
  from receptions r join lot_sales s on s.reception_id=r.id and s.status='confirmed' group by r.supplier_id
), purchases as (
  select r.supplier_id,sum(coalesce(st.gross_amount_clp,0)) purchase_cost_clp
  from receptions r left join lateral (select gross_amount_clp from settlements x where x.reception_id=r.id and x.status in ('approved','pending','draft') order by x.created_at desc limit 1) st on true group by r.supplier_id
), transforms as (
  select r.supplier_id,sum(tc.amount_clp) transformation_cost_clp from receptions r join transformation_costs tc on tc.reception_id=r.id group by r.supplier_id
), receipts as (
  select supplier_id,count(*) receptions,sum(coalesce(accepted_kg,greatest(0,gross_kg-tare_kg))) received_kg from receptions group by supplier_id
)
select p.id supplier_id,p.legal_name supplier,coalesce(r.receptions,0) receptions,coalesce(r.received_kg,0) received_kg,coalesce(s.sold_kg,0) sold_kg,coalesce(s.revenue_clp,0) revenue_clp,coalesce(pc.purchase_cost_clp,0) purchase_cost_clp,coalesce(t.transformation_cost_clp,0) transformation_cost_clp,coalesce(s.revenue_clp,0)-coalesce(pc.purchase_cost_clp,0)-coalesce(t.transformation_cost_clp,0) contribution_clp
from parties p left join receipts r on r.supplier_id=p.id left join sales s on s.supplier_id=p.id left join purchases pc on pc.supplier_id=p.id left join transforms t on t.supplier_id=p.id where p.kind='supplier'::party_kind;

create or replace view plant_profitability as
with base as (
 select r.plant_id,r.id,coalesce((select sum(s.sold_kg*s.price_per_kg_clp) from lot_sales s where s.reception_id=r.id and s.status='confirmed'),0) revenue_clp,
 coalesce((select st.gross_amount_clp from settlements st where st.reception_id=r.id and st.status in ('approved','pending','draft') order by st.created_at desc limit 1),0) purchase_cost_clp,
 coalesce((select sum(tc.amount_clp) from transformation_costs tc where tc.reception_id=r.id),0) transformation_cost_clp
 from receptions r
)
select plant_id,count(*) lots,sum(revenue_clp) revenue_clp,sum(purchase_cost_clp) purchase_cost_clp,sum(transformation_cost_clp) transformation_cost_clp,sum(revenue_clp-purchase_cost_clp-transformation_cost_clp) contribution_clp,
case when sum(revenue_clp)>0 then 100*sum(revenue_clp-purchase_cost_clp-transformation_cost_clp)/sum(revenue_clp) else null end contribution_pct
from base group by plant_id;

create or replace view customer_profitability as
select p.id customer_id,p.legal_name customer,count(distinct s.id) sales,count(distinct s.reception_id) lots,sum(s.sold_kg) sold_kg,sum(s.sold_kg*s.price_per_kg_clp) revenue_clp
from parties p left join lot_sales s on s.customer_id=p.id and s.status='confirmed' where p.kind='customer'::party_kind group by p.id,p.legal_name;

insert into business_partner_profiles(party_id,contact_name,email,address,city,country,payment_terms,source_file_hash)
select id,'Jose Mayorga','jose.maroca@gmail.com','Pasaje Isla Chaulinec #180, Dalcahue','Chiloé','Chile','Crédito','42f157f3f8a24efdd0976b49593526c7cc74c55898cab51779473e45d0891ea3' from parties where kind='supplier'::party_kind and legal_name='Jose Mayorga'
on conflict(party_id) do update set contact_name=excluded.contact_name,email=excluded.email,address=excluded.address,city=excluded.city,country=excluded.country,payment_terms=excluded.payment_terms,source_file_hash=excluded.source_file_hash,updated_at=now();

insert into business_partner_profiles(party_id,email,address,city,country,payment_terms,source_file_hash)
select id,'jp@pacificlive.net','4500 9TH AVE NE','Seattle WA 98105','USA','Net 2 a 7 días','9199cfa80dea7d27acf1cb2a8635c64c7f02596ad64924e9eb87403cc0c1a157' from parties where kind='customer'::party_kind and legal_name='PACIFIC LIVE, LLC'
on conflict(party_id) do update set email=excluded.email,address=excluded.address,city=excluded.city,country=excluded.country,payment_terms=excluded.payment_terms,source_file_hash=excluded.source_file_hash,updated_at=now();

insert into purchase_orders(order_number,supplier_id,plant_id,issue_date,currency,net_amount,tax_amount,total_amount,source_file_hash,notes)
select '41/26',id,'ancud','2026-02-16','CLP',8400000,1596000,9996000,'42f157f3f8a24efdd0976b49593526c7cc74c55898cab51779473e45d0891ea3','OC entregada en Pescamar Ancud' from parties where kind='supplier'::party_kind and legal_name='Jose Mayorga'
on conflict(order_number,supplier_id) do nothing;
insert into purchase_order_lines(purchase_order_id,item_type,description,quantity,unit,unit_price,line_total)
select po.id,'service','Maquila erizo',12000,'unidad documento',700,8400000 from purchase_orders po join parties p on p.id=po.supplier_id where po.order_number='41/26' and p.legal_name='Jose Mayorga' and not exists(select 1 from purchase_order_lines l where l.purchase_order_id=po.id and l.description='Maquila erizo');

insert into export_invoices(invoice_number,customer_id,issue_date,destination,incoterm,currency,net_weight_kg,gross_weight_kg,goods_amount,freight_amount,total_amount,source_file_hash,notes)
select '2316',id,'2026-02-07','New York','CFR','USD',686.72,882.70,12565.7261696,2346.6115136,14912.3376832,'9199cfa80dea7d27acf1cb2a8635c64c7f02596ad64924e9eb87403cc0c1a157','35 cajas · salmón Chinook fresco entero' from parties where kind='customer'::party_kind and legal_name='PACIFIC LIVE, LLC'
on conflict(invoice_number) do nothing;
insert into export_invoice_lines(export_invoice_id,description,quantity,unit,cases,unit_price,line_total)
select i.id,'WHOLE FRESH KING SALMON CHINOOK',1513.942912,'lb',35,8.3,12565.7261696 from export_invoices i where i.invoice_number='2316' and not exists(select 1 from export_invoice_lines l where l.export_invoice_id=i.id);

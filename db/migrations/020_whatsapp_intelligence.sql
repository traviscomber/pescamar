-- 020_whatsapp_intelligence.sql
-- Ingesta WhatsApp RAW + catálogo de canales + insights revisables.

create table if not exists whatsapp_channels (
  id uuid primary key default gen_random_uuid(),
  external_chat_id text unique,
  name text not null unique,
  category text not null check (category in ('operacion','calidad','produccion','abastecimiento','comercial','logistica','finanzas','personas','otro')),
  plant_id text,
  counterparty text,
  active boolean not null default true,
  interpret boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists whatsapp_messages_raw (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'green-api',
  provider_message_id text not null unique,
  external_chat_id text,
  channel_id uuid references whatsapp_channels(id),
  sender_id text,
  sender_name text,
  direction text not null check (direction in ('incoming','outgoing')),
  message_type text not null,
  text_body text,
  media jsonb not null default '[]'::jsonb,
  quoted_message_id text,
  occurred_at timestamptz not null,
  raw_payload jsonb not null,
  ingested_at timestamptz not null default now()
);
create index if not exists whatsapp_messages_channel_time_idx on whatsapp_messages_raw(channel_id,occurred_at desc);
create index if not exists whatsapp_messages_chat_time_idx on whatsapp_messages_raw(external_chat_id,occurred_at desc);

create table if not exists communication_insights (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references whatsapp_messages_raw(id) on delete cascade,
  category text not null,
  plant_id text,
  entity_type text,
  entity_id uuid,
  species text,
  product text,
  supplier text,
  customer text,
  lot_reference text,
  kilograms numeric,
  price numeric,
  currency text,
  severity text not null default 'info' check (severity in ('info','warning','critical')),
  summary text not null,
  proposed_action text,
  confidence numeric not null default 0 check (confidence between 0 and 1),
  status text not null default 'pending' check (status in ('pending','confirmed','rejected')),
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(message_id)
);
create index if not exists communication_insights_status_idx on communication_insights(status,created_at desc);
create index if not exists communication_insights_plant_idx on communication_insights(plant_id,created_at desc) where plant_id is not null;

create table if not exists communication_links (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references whatsapp_messages_raw(id) on delete cascade,
  insight_id uuid references communication_insights(id) on delete set null,
  entity_type text not null,
  entity_id uuid not null,
  created_by text not null,
  created_at timestamptz not null default now(),
  unique(message_id,entity_type,entity_id)
);

insert into whatsapp_channels(name,category,plant_id,counterparty) values
('Supervisores Pescamar','operacion',null,null),
('Pescamar Ancud','operacion','ancud',null),
('despachos pescamar ancud','logistica','ancud',null),
('Calidad Erizo Pescamar','calidad',null,null),
('Leyla Moldeo pescamar','produccion',null,null),
('Temas contables PESCAMAR','finanzas',null,null),
('Embarques Com. Pescamar','logistica',null,null),
('Guafó/pescamar','abastecimiento',null,'Guafó'),
('Aqua austral/pescamar','abastecimiento','aqua-austral','Aqua Austral'),
('Pescamar & Fooden','comercial',null,'Fooden'),
('Hanwa/Pescamar','comercial',null,'Hanwa'),
('Megacarrier&Pescamar','comercial',null,'Megacarrier'),
('Pescamar - Central Valley','comercial',null,'Central Valley'),
('Pescamar & Kingsun foods','comercial',null,'Kingsun Foods'),
('Pescamar & Supreme Seafood','comercial',null,'Supreme Seafood'),
('Pescamar - Viking','comercial',null,'Viking'),
('Pescamar Mexico','comercial',null,'Pescamar Mexico'),
('Pescamar Octopus Business','comercial',null,null),
('Seafrigo / Pescamar','logistica',null,'Seafrigo'),
('Coordinación embarque Arrom/Pescamar','logistica',null,'Arrom')
on conflict(name) do update set category=excluded.category,plant_id=excluded.plant_id,counterparty=excluded.counterparty,updated_at=now();
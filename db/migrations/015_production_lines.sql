create table if not exists production_lines (
  id text primary key,
  name text not null,
  family text not null,
  formats text[] not null default '{}',
  route text[] not null default '{}',
  yield_target text not null,
  destination text not null,
  status text not null check(status in ('Activa','Configurar')),
  updated_at timestamptz not null default now()
);

insert into production_lines (id,name,family,formats,route,yield_target,destination,status) values
('LIN-ER','Erizo','Equinodermos',array['Gónada congelada','Fresco'],array['Recepción','Lavado','Apertura','Extracción','Clasificación IA','Congelado'],'9–12% gónada','Japón','Activa'),
('LIN-MO','Moluscos','Loco · Pulpo · bivalvos',array['Cocido congelado','Media concha','Entero'],array['Recepción','Depuración','Cocción','Desconche','Calibrado','Congelado'],'Por especie y calibre','Asia / nacional','Activa'),
('LIN-CR','Crustáceos','Jaiba · Centolla',array['Carne cocida','Secciones','Entero'],array['Recepción','Cocción','Enfriado','Extracción','Envasado','Congelado'],'Carne recuperada','Asia','Configurar'),
('LIN-PE','Pescados','Demersales y pelágicos',array['Filete','Porción','Entero HG'],array['Recepción','Lavado','Eviscerado','Fileteado','Calibrado','Congelado'],'Filete / materia prima','Exportación / nacional','Configurar'),
('LIN-AL','Algas','Luga y otras',array['Seca','Prensada','Materia prima'],array['Recepción','Selección','Lavado','Secado','Prensado','Despacho'],'Humedad y materia útil','Industrial','Configurar')
on conflict(id) do nothing;

-- Vinculos explicitos de propiedad y recepcion para archivos de evidencia.

alter table reception_evidence_files add column if not exists reception_id uuid;
alter table reception_evidence_files add column if not exists created_by_operator_id uuid;

update reception_evidence_files f
set reception_id = e.reception_id
from reception_evidence e
where f.reception_id is null
  and e.url like ('%id=' || f.id::text || '%');

update reception_evidence_files f
set created_by_operator_id = o.id
from operators o
where f.created_by_operator_id is null
  and lower(trim(o.full_name)) = lower(trim(f.created_by))
  and o.active = true;

alter table reception_evidence_files
  add constraint reception_evidence_files_reception_fk
  foreign key (reception_id) references receptions(id) on delete cascade not valid;

alter table reception_evidence_files
  add constraint reception_evidence_files_operator_fk
  foreign key (created_by_operator_id) references operators(id) on delete set null not valid;

alter table reception_evidence_files validate constraint reception_evidence_files_reception_fk;
alter table reception_evidence_files validate constraint reception_evidence_files_operator_fk;

create index if not exists reception_evidence_files_reception_idx
  on reception_evidence_files(reception_id,created_at desc);
create index if not exists reception_evidence_files_operator_idx
  on reception_evidence_files(created_by_operator_id,created_at desc);

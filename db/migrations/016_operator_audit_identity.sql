-- Stable operator identity for financial/audit records.
-- Text actor fields remain during the compatibility window; new writes also persist operator UUIDs.

alter table credit_requests add column if not exists requested_by_operator_id uuid;
alter table settlements add column if not exists created_by_operator_id uuid;
alter table settlements add column if not exists approved_by_operator_id uuid;
alter table approval_actions add column if not exists acted_by_operator_id uuid;
alter table credit_movements add column if not exists created_by_operator_id uuid;

alter table credit_requests drop constraint if exists credit_requests_requested_by_operator_id_fkey;
alter table credit_requests add constraint credit_requests_requested_by_operator_id_fkey foreign key (requested_by_operator_id) references operators(id) not valid;
alter table settlements drop constraint if exists settlements_created_by_operator_id_fkey;
alter table settlements add constraint settlements_created_by_operator_id_fkey foreign key (created_by_operator_id) references operators(id) not valid;
alter table settlements drop constraint if exists settlements_approved_by_operator_id_fkey;
alter table settlements add constraint settlements_approved_by_operator_id_fkey foreign key (approved_by_operator_id) references operators(id) not valid;
alter table approval_actions drop constraint if exists approval_actions_acted_by_operator_id_fkey;
alter table approval_actions add constraint approval_actions_acted_by_operator_id_fkey foreign key (acted_by_operator_id) references operators(id) not valid;
alter table credit_movements drop constraint if exists credit_movements_created_by_operator_id_fkey;
alter table credit_movements add constraint credit_movements_created_by_operator_id_fkey foreign key (created_by_operator_id) references operators(id) not valid;

create index if not exists credit_requests_requested_by_operator_idx on credit_requests(requested_by_operator_id);
create index if not exists settlements_created_by_operator_idx on settlements(created_by_operator_id);
create index if not exists settlements_approved_by_operator_idx on settlements(approved_by_operator_id);
create index if not exists approval_actions_acted_by_operator_idx on approval_actions(acted_by_operator_id);
create index if not exists credit_movements_created_by_operator_idx on credit_movements(created_by_operator_id);

alter table credit_requests validate constraint credit_requests_requested_by_operator_id_fkey;
alter table settlements validate constraint settlements_created_by_operator_id_fkey;
alter table settlements validate constraint settlements_approved_by_operator_id_fkey;
alter table approval_actions validate constraint approval_actions_acted_by_operator_id_fkey;
alter table credit_movements validate constraint credit_movements_created_by_operator_id_fkey;

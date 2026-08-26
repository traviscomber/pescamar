-- Transversal label release integrity for Pescamar.
-- Operational release decisions are enforced in the API using product_labels.
-- Legacy lots remain operational until label control starts for that reception.

alter table product_labels
  drop constraint if exists product_labels_validated_evidence_chk;

alter table product_labels
  add constraint product_labels_validated_evidence_chk
  check (
    status <> 'validated'
    or source_message_id is not null
    or nullif(trim(source_document_url),'') is not null
  ) not valid;

alter table product_labels
  validate constraint product_labels_validated_evidence_chk;

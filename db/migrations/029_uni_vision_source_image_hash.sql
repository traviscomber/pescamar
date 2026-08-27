-- Pescamar Uni Vision Station
-- Preserve the original source image fingerprint independently from the stored evidence bytes.
-- This keeps seed-set provenance stable when the browser resizes or recompresses an uploaded photo.

alter table sea_urchin_color_captures
  add column if not exists source_image_sha256 text;

create unique index if not exists idx_urchin_color_capture_source_image
  on sea_urchin_color_captures(run_id,source_image_sha256)
  where source_image_sha256 is not null;

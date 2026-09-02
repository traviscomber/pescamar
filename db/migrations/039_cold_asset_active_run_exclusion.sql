-- One physical cold asset represents one simultaneous thermal session.
-- A run may contain multiple loads, but a tunnel/chamber/freezer/cold room cannot
-- own two independent open runs at the same time.

create unique index if not exists cold_runs_one_open_per_asset_unique
  on cold_runs(asset_id)
  where status='open';

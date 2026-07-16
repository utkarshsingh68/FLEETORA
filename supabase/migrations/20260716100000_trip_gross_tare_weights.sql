-- Weighbridge values are entered on a trip; net weight remains the value used
-- for freight calculations and party-ledger reporting.
alter table public.trips
  add column if not exists gross_weight numeric(12,2),
  add column if not exists tare_weight numeric(12,2);

alter table public.trips
  drop constraint if exists trips_tare_not_greater_than_gross;

alter table public.trips
  add constraint trips_tare_not_greater_than_gross
  check (gross_weight is null or tare_weight is null or tare_weight <= gross_weight);

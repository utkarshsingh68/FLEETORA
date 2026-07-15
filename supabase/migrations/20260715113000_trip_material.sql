alter table public.trips
  add column if not exists material_name text;

comment on column public.trips.material_name is
  'Material or commodity transported on the trip.';

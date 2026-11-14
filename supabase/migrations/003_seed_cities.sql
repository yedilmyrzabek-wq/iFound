-- Five MVP cities (TZ §5). Changing a city = editing one row here.
insert into cities (slug, name, timezone, center_lat, center_lng, default_zoom, sort_order) values
  ('austin',   'Austin, TX',   'America/Chicago',     30.2672,  -97.7431, 13, 1),
  ('new-york', 'New York, NY', 'America/New_York',    40.7128,  -74.0060, 13, 2),
  ('chicago',  'Chicago, IL',  'America/Chicago',     41.8781,  -87.6298, 13, 3),
  ('denver',   'Denver, CO',   'America/Denver',      39.7392, -104.9903, 13, 4),
  ('seattle',  'Seattle, WA',  'America/Los_Angeles', 47.6062, -122.3321, 13, 5)
on conflict (slug) do update set
  name = excluded.name, timezone = excluded.timezone,
  center_lat = excluded.center_lat, center_lng = excluded.center_lng,
  default_zoom = excluded.default_zoom, sort_order = excluded.sort_order;

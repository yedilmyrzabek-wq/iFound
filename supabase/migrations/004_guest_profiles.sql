-- Saved guest profile for one-tap joins from the swipe deck (TZ §8.12).
-- Not an account: no password, no login; bound to the browser's ifound_uid cookie.
create table guest_profiles (
  user_token    uuid primary key,
  display_name  text not null check (char_length(display_name) between 1 and 30),
  email         text not null,
  photo_path    text,
  updated_at    timestamptz not null default now()
);
alter table guest_profiles enable row level security;

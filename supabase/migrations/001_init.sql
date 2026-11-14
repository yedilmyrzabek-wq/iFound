create extension if not exists pgcrypto;

create type activity_type as enum ('board_games','coffee','run','soccer','movie','walk','other');
create type event_status  as enum ('filling','confirmed','cancelled','completed');

-- Города
create table cities (
  slug          text primary key,
  name          text not null,
  timezone      text not null,
  center_lat    double precision not null,
  center_lng    double precision not null,
  default_zoom  int  not null default 13,
  sort_order    int  not null default 0
);

-- Заведения
create table venues (
  id          uuid primary key default gen_random_uuid(),
  city_slug   text not null references cities(slug),
  name        text not null,
  address     text,
  category    text not null check (category in
                ('cafe','game_store','park','pitch','cinema','library','community_centre')),
  lat         double precision not null,
  lng         double precision not null,
  osm_ref     text unique,
  created_at  timestamptz not null default now()
);
create index venues_city_idx on venues(city_slug);

-- Заявки заведений
create table venue_claims (
  id           uuid primary key default gen_random_uuid(),
  venue_id     uuid not null references venues(id) on delete cascade,
  email        text not null,
  claim_token  uuid not null,
  verified_at  timestamptz,
  created_at   timestamptz not null default now()
);
create index venue_claims_venue_idx on venue_claims(venue_id);

-- Планы
create table events (
  id                 uuid primary key default gen_random_uuid(),
  code               text not null unique,
  city_slug          text not null references cities(slug),
  venue_id           uuid references venues(id),
  place_name         text,
  place_lat          double precision,
  place_lng          double precision,
  activity           activity_type not null,
  activity_other     text,
  title              text not null,
  description        text,
  starts_at          timestamptz not null,
  duration_minutes   int not null default 120 check (duration_minutes in (60,90,120,180)),
  min_people         int not null check (min_people between 3 and 12),
  max_people         int not null,
  status             event_status not null default 'filling',
  participant_count  int not null default 0 check (participant_count >= 0),
  confirmed_at       timestamptz,
  cancelled_at       timestamptz,
  cancel_reason      text check (cancel_reason in ('unfilled','host','moderation')),
  host_token         uuid not null,
  host_email         text not null,
  venue_claim_id     uuid references venue_claims(id),
  is_demo            boolean not null default false,
  hidden             boolean not null default false,
  created_ip         inet,
  created_at         timestamptz not null default now(),
  check (max_people between min_people and 20),
  check (venue_id is not null
         or (place_name is not null and place_lat is not null and place_lng is not null)),
  check ((activity = 'other') = (activity_other is not null))
);
create index events_city_start_idx   on events(city_slug, starts_at) where not hidden;
create index events_status_start_idx on events(status, starts_at);
create index events_host_idx         on events(host_token);

-- Участники
create table participants (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references events(id) on delete cascade,
  user_token    uuid not null,
  display_name  text not null check (char_length(display_name) between 1 and 30),
  email         text not null,
  photo_path    text,
  photo_hidden  boolean not null default false,
  is_host       boolean not null default false,
  joined_at     timestamptz not null default now(),
  left_at       timestamptz,
  created_ip    inet
);
create unique index participants_active_token on participants(event_id, user_token)   where left_at is null;
create unique index participants_active_email on participants(event_id, lower(email)) where left_at is null;
create index participants_token_idx on participants(user_token);

-- Подписки
create table subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  email                   text not null,
  stripe_customer_id      text unique,
  stripe_subscription_id  text unique,
  status                  text not null,
  current_period_end      timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create unique index subscriptions_email_idx on subscriptions(lower(email));

create table subscription_tokens (
  user_token       uuid primary key,
  subscription_id  uuid not null references subscriptions(id) on delete cascade,
  linked_at        timestamptz not null default now()
);

-- Жалобы
create table reports (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references events(id) on delete cascade,
  participant_id  uuid references participants(id) on delete cascade,
  reporter_token  uuid not null,
  reason          text not null check (reason in ('spam','inappropriate','unsafe','fake','other')),
  details         text check (char_length(details) <= 500),
  resolved_at     timestamptz,
  created_at      timestamptz not null default now()
);
create unique index reports_once_event  on reports(event_id, reporter_token)       where participant_id is null;
create unique index reports_once_person on reports(participant_id, reporter_token) where participant_id is not null;

-- Журнал писем: идемпотентность
create table email_log (
  id           uuid primary key default gen_random_uuid(),
  dedupe_key   text not null unique,   -- например 'confirmed:<event_id>:<participant_id>'
  to_email     text not null,
  status       text not null default 'pending',  -- pending | sent | failed
  provider_id  text,
  created_at   timestamptz not null default now()
);

-- Лимиты
create table rate_hits (
  id      bigserial primary key,
  bucket  text not null,   -- 'create:token:<uuid>', 'join:ip:<ip>' и т.д.
  at      timestamptz not null default now()
);
create index rate_hits_bucket_at on rate_hits(bucket, at);

-- Лист ожидания
create table waitlist (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  city        text not null,
  created_at  timestamptz not null default now()
);
create unique index waitlist_once on waitlist(lower(email), lower(city));

-- Страховка: RLS включён, публичных политик нет — доступ только через service_role
alter table cities              enable row level security;
alter table venues              enable row level security;
alter table venue_claims        enable row level security;
alter table events              enable row level security;
alter table participants        enable row level security;
alter table subscriptions       enable row level security;
alter table subscription_tokens enable row level security;
alter table reports             enable row level security;
alter table email_log           enable row level security;
alter table rate_hits           enable row level security;
alter table waitlist            enable row level security;

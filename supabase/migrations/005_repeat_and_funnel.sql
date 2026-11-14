-- Weekly repeat ("Run it again next week"), funnel analytics, and day-before reminders.

-- A plan can be repeated once; the copy points back to its source.
alter table events add column repeat_of uuid references events(id) on delete set null;
create unique index events_repeat_of_once on events(repeat_of) where repeat_of is not null;

-- Repeats a confirmed/completed plan at the same LOCAL time one week later (DST-safe: computed in the city's
-- zone), moving further by whole weeks if needed so it starts at least 3 h from now. Locks the source row,
-- reuses create_event, so all the usual checks and the "host is the first participant" rule apply.
create or replace function repeat_event(p_event_id uuid, p_code text, p_ip inet)
returns uuid
language plpgsql as $$
declare
  v_ev     events%rowtype;
  v_tz     text;
  v_host   participants%rowtype;
  v_start  timestamptz;
  v_id     uuid;
begin
  select * into v_ev from events where id = p_event_id for update;
  if not found then raise exception 'not_found'; end if;
  if v_ev.status not in ('confirmed', 'completed') then raise exception 'not_repeatable'; end if;
  if exists (select 1 from events where repeat_of = p_event_id) then raise exception 'already_repeated'; end if;

  select timezone into v_tz from cities where slug = v_ev.city_slug;
  v_start := ((v_ev.starts_at at time zone v_tz) + interval '7 days') at time zone v_tz;
  while v_start < now() + interval '3 hours' loop
    v_start := ((v_start at time zone v_tz) + interval '7 days') at time zone v_tz;
  end loop;

  select * into v_host from participants where event_id = p_event_id and is_host order by joined_at limit 1;

  v_id := create_event(
    p_code, v_ev.city_slug, v_ev.venue_id, v_ev.place_name, v_ev.place_lat, v_ev.place_lng,
    v_ev.activity, v_ev.activity_other, v_ev.title, v_ev.description,
    v_start, v_ev.duration_minutes, v_ev.min_people, v_ev.max_people,
    v_ev.host_token, coalesce(v_host.display_name, 'Host'), v_ev.host_email, v_host.photo_path,
    v_ev.venue_claim_id, v_ev.is_demo, p_ip
  );
  update events set repeat_of = p_event_id where id = v_id;
  return v_id;
end $$;

-- Confirmed plans starting in 20–26 h: due for the "See you tomorrow" reminder (deduped per participant in email_log).
create or replace function due_reminders()
returns table (r_event_id uuid)
language sql stable as $$
  select id from events
   where status = 'confirmed' and not hidden
     and starts_at between now() + interval '20 hours' and now() + interval '26 hours'
$$;

-- Funnel (TZ §18). Facts (join, confirm, create, paywall, checkout, waitlist, repeat) are written by the server;
-- views, clicks and swipes come through /api/track. Demo plans are never counted.
create table analytics_events (
  id          bigserial primary key,
  name        text not null check (name ~ '^[a-z_]{3,40}$'),
  event_id    uuid references events(id) on delete set null,
  city_slug   text,
  user_token  uuid,
  created_at  timestamptz not null default now()
);
create index analytics_events_name_at on analytics_events(name, created_at);
alter table analytics_events enable row level security;

create or replace function funnel_counts()
returns table (r_name text, r_total bigint, r_people bigint, r_last_24h bigint)
language sql stable as $$
  select name, count(*), count(distinct user_token), count(*) filter (where created_at > now() - interval '24 hours')
    from analytics_events
   group by name
$$;

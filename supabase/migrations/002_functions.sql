-- Создание плана. Хозяин-человек сразу становится первым участником.
create or replace function create_event(
  p_code text, p_city text, p_venue_id uuid,
  p_place_name text, p_place_lat double precision, p_place_lng double precision,
  p_activity activity_type, p_activity_other text,
  p_title text, p_description text,
  p_starts_at timestamptz, p_duration int, p_min int, p_max int,
  p_host_token uuid, p_host_name text, p_host_email text, p_host_photo text,
  p_venue_claim_id uuid, p_is_demo boolean, p_ip inet
) returns uuid
language plpgsql as $$
declare
  v_id uuid;
begin
  if p_starts_at < now() + interval '3 hours'
     or p_starts_at > now() + interval '30 days' then
    raise exception 'starts_at_out_of_range';
  end if;

  insert into events (code, city_slug, venue_id, place_name, place_lat, place_lng,
                      activity, activity_other, title, description,
                      starts_at, duration_minutes, min_people, max_people,
                      host_token, host_email, venue_claim_id, is_demo, created_ip,
                      participant_count)
  values (p_code, p_city, p_venue_id, p_place_name, p_place_lat, p_place_lng,
          p_activity, p_activity_other, p_title, p_description,
          p_starts_at, p_duration, p_min, p_max,
          p_host_token, p_host_email, p_venue_claim_id, p_is_demo, p_ip,
          case when p_venue_claim_id is null then 1 else 0 end)
  returning id into v_id;

  if p_venue_claim_id is null then
    insert into participants (event_id, user_token, display_name, email, photo_path, is_host, created_ip)
    values (v_id, p_host_token, p_host_name, p_host_email, p_host_photo, true, p_ip);
  end if;

  return v_id;
end $$;


-- Присоединение. Атомарно подтверждает план при наборе порога.
create or replace function join_event(
  p_event_id uuid, p_user_token uuid, p_name text, p_email text, p_photo_path text, p_ip inet
) returns table (r_result text, r_status event_status, r_count int,
                 r_participant_id uuid, r_just_confirmed boolean)
language plpgsql as $$
declare
  v_ev          events%rowtype;
  v_pid         uuid;
  v_new_count   int;
  v_new_status  event_status;
begin
  select * into v_ev from events where id = p_event_id for update;

  if not found or v_ev.hidden then
    return query select 'not_found'::text, null::event_status, 0, null::uuid, false;
    return;
  end if;

  if v_ev.status in ('cancelled','completed')
     or now() >= v_ev.starts_at
     or (v_ev.status = 'filling' and now() >= v_ev.starts_at - interval '2 hours') then
    return query select 'closed'::text, v_ev.status, v_ev.participant_count, null::uuid, false;
    return;
  end if;

  if exists (select 1 from participants p
             where p.event_id = p_event_id and p.left_at is null
               and (p.user_token = p_user_token or lower(p.email) = lower(p_email))) then
    return query select 'already_joined'::text, v_ev.status, v_ev.participant_count, null::uuid, false;
    return;
  end if;

  if v_ev.participant_count >= v_ev.max_people then
    return query select 'full'::text, v_ev.status, v_ev.participant_count, null::uuid, false;
    return;
  end if;

  insert into participants (event_id, user_token, display_name, email, photo_path, created_ip)
  values (p_event_id, p_user_token, p_name, p_email, p_photo_path, p_ip)
  returning id into v_pid;

  v_new_count  := v_ev.participant_count + 1;
  v_new_status := case
                    when v_ev.status = 'filling' and v_new_count >= v_ev.min_people
                      then 'confirmed'::event_status
                    else v_ev.status
                  end;

  update events
     set participant_count = v_new_count,
         status            = v_new_status,
         confirmed_at      = case
                               when v_ev.status = 'filling' and v_new_status = 'confirmed' then now()
                               else confirmed_at
                             end
   where id = p_event_id;

  return query select 'joined'::text, v_new_status, v_new_count, v_pid,
                      (v_ev.status = 'filling' and v_new_status = 'confirmed');
end $$;


-- Выход. Статус подтверждённого плана не откатывается.
-- Порядок блокировок: сначала план, потом участник — как в join_event.
create or replace function leave_event(p_participant_id uuid)
returns table (r_result text, r_status event_status, r_count int)
language plpgsql as $$
declare
  v_event_id  uuid;
  v_ev        events%rowtype;
  v_p         participants%rowtype;
begin
  select event_id into v_event_id from participants where id = p_participant_id;
  if not found then
    return query select 'not_joined'::text, null::event_status, 0;
    return;
  end if;

  select * into v_ev from events       where id = v_event_id       for update;
  select * into v_p  from participants where id = p_participant_id for update;

  if v_p.left_at is not null then
    return query select 'not_joined'::text, v_ev.status, v_ev.participant_count;
    return;
  end if;

  if v_p.is_host then
    return query select 'host_must_cancel'::text, v_ev.status, v_ev.participant_count;
    return;
  end if;

  if v_ev.status in ('cancelled','completed') or now() >= v_ev.starts_at then
    return query select 'closed'::text, v_ev.status, v_ev.participant_count;
    return;
  end if;

  update participants set left_at = now() where id = p_participant_id;
  update events set participant_count = participant_count - 1 where id = v_event_id;

  return query select 'left'::text, v_ev.status, v_ev.participant_count - 1;
end $$;


-- Отмена хозяином, заведением или модерацией. Авторизация — в API.
create or replace function cancel_event(p_event_id uuid, p_reason text)
returns text
language plpgsql as $$
declare
  v_ev events%rowtype;
begin
  select * into v_ev from events where id = p_event_id for update;
  if not found then return 'not_found'; end if;
  if v_ev.status in ('cancelled','completed') then return 'closed'; end if;

  update events
     set status = 'cancelled', cancelled_at = now(), cancel_reason = p_reason
   where id = p_event_id;
  return 'cancelled';
end $$;


-- Плановая уборка: автоотмена ненабранных и завершение прошедших.
create or replace function sweep_events()
returns table (r_event_id uuid, r_action text)
language plpgsql as $$
begin
  return query
  with c as (
    update events
       set status = 'cancelled', cancelled_at = now(), cancel_reason = 'unfilled'
     where status = 'filling' and now() >= starts_at - interval '2 hours'
    returning id
  )
  select id, 'cancelled_unfilled'::text from c;

  return query
  with d as (
    update events
       set status = 'completed'
     where status = 'confirmed'
       and now() >= starts_at + make_interval(mins => duration_minutes)
    returning id
  )
  select id, 'completed'::text from d;

  delete from rate_hits where at < now() - interval '2 days';
end $$;

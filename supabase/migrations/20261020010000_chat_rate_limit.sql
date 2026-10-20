create table if not exists public.chat_rate_limits (
  user_id uuid primary key references auth.users (id) on delete cascade,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count between 1 and 21)
);

alter table public.chat_rate_limits enable row level security;
revoke all on table public.chat_rate_limits from anon, authenticated;

create or replace function public.consume_chat_rate_limit()
returns table (allowed boolean, retry_after integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_window_start timestamptz;
  v_request_total integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  insert into public.chat_rate_limits (user_id, window_started_at, request_count)
  values (v_user_id, v_now, 1)
  on conflict (user_id) do update
    set window_started_at = case
      when public.chat_rate_limits.window_started_at <= v_now - interval '1 minute'
        then v_now
      else public.chat_rate_limits.window_started_at
    end,
    request_count = case
      when public.chat_rate_limits.window_started_at <= v_now - interval '1 minute'
        then 1
      else least(public.chat_rate_limits.request_count + 1, 21)
    end
  returning chat_rate_limits.window_started_at, chat_rate_limits.request_count
  into v_window_start, v_request_total;

  return query
    select
      v_request_total <= 20,
      greatest(
        0,
        ceil(extract(epoch from (v_window_start + interval '1 minute' - v_now)))::integer
      );
end;
$$;

revoke all on function public.consume_chat_rate_limit() from public, anon;
grant execute on function public.consume_chat_rate_limit() to authenticated;

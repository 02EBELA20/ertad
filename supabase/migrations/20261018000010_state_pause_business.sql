-- Stage 12: US state, "online" flag, post pause/resume, optional business info.

-- ---------- A. state + online ----------
alter table public.profiles  add column state text not null default 'NY' check (state ~ '^[A-Z]{2}$');
alter table public.providers add column state text not null default 'NY' check (state ~ '^[A-Z]{2}$');
alter table public.providers add column online boolean not null default false;
alter table public.posts     add column state text not null default 'NY' check (state ~ '^[A-Z]{2}$');
alter table public.posts     add column online boolean not null default false;

create index providers_state_idx on public.providers (state);
create index posts_state_idx on public.posts (state);

grant insert (state) on public.profiles to authenticated;
grant update (state) on public.profiles to authenticated;
grant insert (state, online) on public.providers to authenticated;
grant update (state, online) on public.providers to authenticated;
grant insert (state, online) on public.posts to authenticated;

-- ---------- C. optional business info (public business address, never a home address) ----------
alter table public.providers add column is_business boolean not null default false;
alter table public.providers add column business_name text check (business_name is null or char_length(business_name) <= 80);
alter table public.providers add column business_address text check (business_address is null or char_length(business_address) <= 160);
alter table public.providers add column business_website text
  check (business_website is null or (char_length(business_website) <= 200 and business_website ~* '^https?://'));
alter table public.providers add column business_hours text check (business_hours is null or char_length(business_hours) <= 120);

grant insert (is_business, business_name, business_address, business_website, business_hours) on public.providers to authenticated;
grant update (is_business, business_name, business_address, business_website, business_hours) on public.providers to authenticated;

-- ---------- B. pause / resume / close posts ----------
alter table public.posts drop constraint posts_status_check;
alter table public.posts add constraint posts_status_check check (status in ('open', 'paused', 'closed'));
alter table public.posts add column paused_at timestamptz;

-- Status changes only through the function below (closed is final; resuming extends the 14 days by the pause).
revoke update (status) on public.posts from authenticated;

create function public.set_post_status(pid uuid, new_status text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  po public.posts%rowtype;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select * into po from public.posts where id = pid and author_id = auth.uid();
  if not found then raise exception 'not_found'; end if;
  if po.status = 'closed' then raise exception 'closed_is_final'; end if;
  if new_status = 'paused' and po.status = 'open' then
    update public.posts set status = 'paused', paused_at = now() where id = pid;
  elsif new_status = 'open' and po.status = 'paused' then
    update public.posts
      set status = 'open',
          expires_at = expires_at + (now() - coalesce(paused_at, now())),
          paused_at = null
      where id = pid;
  elsif new_status = 'closed' then
    update public.posts set status = 'closed', paused_at = null where id = pid;
  else
    raise exception 'invalid_status';
  end if;
end; $$;
revoke execute on function public.set_post_status(uuid, text) from public, anon;
grant execute on function public.set_post_status(uuid, text) to authenticated;

-- ---------- board list filtered by state (online posts are shown everywhere) ----------
create or replace function public.board_posts(cat_ids uuid[] default null, st text default null)
returns table (
  id uuid, author_id uuid, category_id uuid, city text, body text, budget_note text,
  created_at timestamptz, author_name text, author_photo text
) language sql stable security definer set search_path = '' as $$
  select
    po.id, po.author_id, po.category_id, po.city, po.body, po.budget_note, po.created_at,
    coalesce(pr.display_name, pf.display_name),
    pr.photo_path
  from public.posts po
  join public.profiles pf on pf.id = po.author_id
  left join public.providers pr on pr.user_id = po.author_id
  where po.status = 'open'
    and po.expires_at > now()
    and not public.is_blocked_between(auth.uid(), po.author_id)
    and (cat_ids is null or po.category_id = any(cat_ids))
    and (st is null or po.state = st or po.online)
  order by po.created_at desc
  limit 50;
$$;
revoke execute on function public.board_posts(uuid[]) from authenticated;
revoke execute on function public.board_posts(uuid[], text) from public, anon;
grant execute on function public.board_posts(uuid[], text) to authenticated;

-- ---------- home feed: own city AND own state ----------
create or replace function public.home_feed(lim int default 6)
returns table (
  kind text, ref_id uuid, title text, category_id uuid, city text,
  photo text, snippet text, is_demo boolean
) language plpgsql volatile security definer set search_path = '' as $$
#variable_conflict use_column
declare
  me uuid := auth.uid();
  my_city text;
  my_state text;
  min_profiles int;
  eligible int;
begin
  if me is null then return; end if;
  select lower(btrim(pf.city)), pf.state into my_city, my_state from public.profiles pf where pf.id = me;
  if my_city is null then return; end if;

  select coalesce((select s.value::int from public.app_settings s where s.key = 'feed_min_profiles'), 50)
    into min_profiles;
  select count(*) into eligible from public.providers p
    where p.visible and p.allow_feed and lower(btrim(p.city)) = my_city and p.state = my_state;
  if eligible < min_profiles then return; end if;

  return query
  with cand as (
    select 'offer'::text as kind, p.user_id as ref_id,
           coalesce(p.display_name, pf.display_name) as title,
           (select pc.category_id from public.provider_categories pc
              where pc.user_id = p.user_id order by random() limit 1) as category_id,
           p.city as city, p.photo_path as photo, left(p.bio, 90) as snippet,
           p.is_demo as is_demo, p.last_shown_at as last_shown_at
    from public.providers p
    join public.profiles pf on pf.id = p.user_id
    where p.visible and p.allow_feed and p.user_id <> me
      and lower(btrim(p.city)) = my_city and p.state = my_state
      and not public.is_blocked_between(me, p.user_id)
    union all
    select 'seek'::text, po.id,
           coalesce(pr.display_name, pf.display_name),
           po.category_id, po.city, pr.photo_path, left(po.body, 90),
           coalesce(pr.is_demo, false), po.last_shown_at
    from public.posts po
    join public.profiles pf on pf.id = po.author_id
    left join public.providers pr on pr.user_id = po.author_id
    where po.status = 'open' and po.expires_at > now() and po.author_id <> me
      and lower(btrim(po.city)) = my_city and po.state = my_state
      and not public.is_blocked_between(me, po.author_id)
  ),
  chosen as (
    select * from cand order by cand.last_shown_at asc nulls first, random() limit lim
  ),
  upd_offers as (
    update public.providers set last_shown_at = now()
    where user_id in (select ref_id from chosen where kind = 'offer') returning 1
  ),
  upd_posts as (
    update public.posts set last_shown_at = now()
    where id in (select ref_id from chosen where kind = 'seek') returning 1
  )
  select c.kind, c.ref_id, c.title, c.category_id, c.city, c.photo, c.snippet, c.is_demo
  from chosen c order by random();
end; $$;

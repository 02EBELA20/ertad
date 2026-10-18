-- Stage 10: random, fair home feed.
-- Rules: only members who opted in (providers.allow_feed) and open posts, own city only,
-- least-recently-shown first (last_shown_at), no phone numbers, enabled only when the city has
-- at least `feed_min_profiles` opted-in profiles (app_settings).

alter table public.providers add column is_demo boolean not null default false;
alter table public.posts add column last_shown_at timestamptz;

create table public.app_settings (
  key text primary key,
  value text not null
);
alter table public.app_settings enable row level security;
revoke all on public.app_settings from anon, public, authenticated;
-- Development value; raise to 50-100 before launch:
--   update public.app_settings set value = '50' where key = 'feed_min_profiles';
insert into public.app_settings (key, value) values ('feed_min_profiles', '5');

create function public.home_feed(lim int default 6)
returns table (
  kind text, ref_id uuid, title text, category_id uuid, city text,
  photo text, snippet text, is_demo boolean
) language plpgsql volatile security definer set search_path = '' as $$
#variable_conflict use_column
declare
  me uuid := auth.uid();
  my_city text;
  min_profiles int;
  eligible int;
begin
  if me is null then return; end if;
  select lower(btrim(pf.city)) into my_city from public.profiles pf where pf.id = me;
  if my_city is null then return; end if;

  select coalesce((select s.value::int from public.app_settings s where s.key = 'feed_min_profiles'), 50)
    into min_profiles;
  select count(*) into eligible from public.providers p
    where p.visible and p.allow_feed and lower(btrim(p.city)) = my_city;
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
      and lower(btrim(p.city)) = my_city
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
      and lower(btrim(po.city)) = my_city
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

revoke execute on function public.home_feed(int) from public, anon;
grant execute on function public.home_feed(int) to authenticated;

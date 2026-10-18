-- Stage 5: "I need" board (posts), plus chat limits.

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null references public.categories(id),
  city text not null check (char_length(city) between 2 and 80),
  body text not null check (char_length(btrim(body)) between 10 and 600),
  budget_note text check (budget_note is null or char_length(budget_note) <= 60),
  contact_phone text check (contact_phone is null or contact_phone ~ '^\+[0-9]{8,15}$'),
  status text not null default 'open' check (status in ('open', 'closed')),
  expires_at timestamptz not null default now() + interval '14 days',
  created_at timestamptz not null default now()
);
create index posts_board_idx on public.posts (status, created_at desc);
create index posts_category_idx on public.posts (category_id);
create index posts_author_idx on public.posts (author_id, created_at desc);

alter table public.posts enable row level security;

-- Others read posts only through board_posts()/board_post() (no phone in lists, blocks respected).
create policy posts_select_own on public.posts
  for select to authenticated using (author_id = (select auth.uid()));
create policy posts_insert_own on public.posts
  for insert to authenticated with check (author_id = (select auth.uid()));
create policy posts_update_own on public.posts
  for update to authenticated
  using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy posts_delete_own on public.posts
  for delete to authenticated using (author_id = (select auth.uid()));

revoke all on public.posts from anon, public;
grant select, delete on public.posts to authenticated;
grant insert (author_id, category_id, city, body, budget_note, contact_phone) on public.posts to authenticated;
grant update (status) on public.posts to authenticated;

-- At most 3 posts per author per day.
create function public.posts_before_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.posts
      where author_id = new.author_id and created_at > now() - interval '1 day') >= 3 then
    raise exception 'daily_limit';
  end if;
  return new;
end; $$;
revoke execute on function public.posts_before_insert() from public, anon, authenticated;
create trigger posts_daily_limit
  before insert on public.posts
  for each row execute function public.posts_before_insert();

-- Board list: open, not expired, not blocked either way; newest first; no phone.
create function public.board_posts(cat_ids uuid[] default null)
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
  order by po.created_at desc
  limit 50;
$$;

-- One post with the contact phone (for signed-in users; the author also sees closed ones).
create function public.board_post(pid uuid)
returns table (
  id uuid, author_id uuid, category_id uuid, city text, body text, budget_note text,
  contact_phone text, status text, expires_at timestamptz, created_at timestamptz,
  author_name text, author_photo text
) language sql stable security definer set search_path = '' as $$
  select
    po.id, po.author_id, po.category_id, po.city, po.body, po.budget_note,
    po.contact_phone, po.status, po.expires_at, po.created_at,
    coalesce(pr.display_name, pf.display_name),
    pr.photo_path
  from public.posts po
  join public.profiles pf on pf.id = po.author_id
  left join public.providers pr on pr.user_id = po.author_id
  where po.id = pid
    and (po.author_id = auth.uid()
         or (po.status = 'open' and po.expires_at > now()
             and not public.is_blocked_between(auth.uid(), po.author_id)));
$$;

revoke execute on function public.board_posts(uuid[]), public.board_post(uuid) from public, anon;
grant execute on function public.board_posts(uuid[]), public.board_post(uuid) to authenticated;

-- Reports can point at a post.
alter table public.reports add column post_id uuid references public.posts(id) on delete set null;
grant insert (post_id) on public.reports to authenticated;

-- Chat limits: 300 messages per day, 15 brand-new conversations per day.
alter table public.conversations add column created_by uuid references public.profiles(id) on delete set null;

create or replace function public.messages_before_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.messages
      where sender_id = new.sender_id and created_at > now() - interval '1 minute') >= 20 then
    raise exception 'rate_limited';
  end if;
  if (select count(*) from public.messages
      where sender_id = new.sender_id and created_at > now() - interval '1 day') >= 300 then
    raise exception 'daily_limit';
  end if;
  return new;
end; $$;

create or replace function public.start_conversation(other uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  a uuid;
  b uuid;
  cid uuid;
begin
  if me is null then raise exception 'not_authenticated'; end if;
  if other is null or other = me then raise exception 'invalid_user'; end if;
  if not exists (select 1 from public.profiles where id = other) then raise exception 'invalid_user'; end if;
  if public.is_blocked_between(me, other) then raise exception 'blocked'; end if;
  a := least(me, other);
  b := greatest(me, other);
  select id into cid from public.conversations where user_a = a and user_b = b;
  if cid is not null then return cid; end if;
  if (select count(*) from public.conversations
      where created_by = me and created_at > now() - interval '1 day') >= 15 then
    raise exception 'daily_limit';
  end if;
  insert into public.conversations (user_a, user_b, created_by) values (a, b, me)
    on conflict (user_a, user_b) do nothing;
  select id into cid from public.conversations where user_a = a and user_b = b;
  return cid;
end; $$;

-- Stage 8a: blocks and reports.

create table public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_blocked_idx on public.blocks (blocked_id);

alter table public.blocks enable row level security;
create policy blocks_select_own on public.blocks
  for select to authenticated using (blocker_id = (select auth.uid()));
create policy blocks_insert_own on public.blocks
  for insert to authenticated with check (blocker_id = (select auth.uid()));
create policy blocks_delete_own on public.blocks
  for delete to authenticated using (blocker_id = (select auth.uid()));
revoke all on public.blocks from anon, public;
grant select, delete on public.blocks to authenticated;
grant insert (blocker_id, blocked_id) on public.blocks to authenticated;

-- True if either user has blocked the other (works regardless of who is asking).
create function public.is_blocked_between(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;

-- May the current user write in this conversation? (participant and no block)
create function public.can_send_message(conv uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.conversations c
    where c.id = conv
      and auth.uid() in (c.user_a, c.user_b)
      and not exists (
        select 1 from public.blocks b
        where (b.blocker_id = c.user_a and b.blocked_id = c.user_b)
           or (b.blocker_id = c.user_b and b.blocked_id = c.user_a)
      )
  );
$$;

revoke execute on function public.is_blocked_between(uuid, uuid), public.can_send_message(uuid) from public, anon;
grant execute on function public.is_blocked_between(uuid, uuid), public.can_send_message(uuid) to authenticated;

-- Writing is impossible while a block exists in either direction.
alter policy messages_insert_own on public.messages
  with check (
    sender_id = (select auth.uid())
    and public.can_send_message(conversation_id)
  );

-- Blocked people disappear from each other's catalog.
alter policy providers_select on public.providers
  using (
    (visible or user_id = (select auth.uid()))
    and not public.is_blocked_between((select auth.uid()), user_id)
  );

-- Opening a new conversation with someone blocked is refused.
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
  insert into public.conversations (user_a, user_b) values (a, b) on conflict (user_a, user_b) do nothing;
  select id into cid from public.conversations where user_a = a and user_b = b;
  return cid;
end; $$;

-- Conversation list: hides chats where the other side blocked me; flags chats I blocked.
create function public.my_chats()
returns table (
  id uuid, other_id uuid, other_name text, other_photo text,
  last_body text, last_at timestamptz, unread integer, i_blocked boolean
) language sql stable security definer set search_path = '' as $$
  select
    c.id,
    o.id,
    coalesce(p.display_name, o.display_name),
    p.photo_path,
    (select m.body from public.messages m where m.conversation_id = c.id order by m.created_at desc limit 1),
    c.last_message_at,
    (select count(*)::int from public.messages m
       where m.conversation_id = c.id and m.sender_id <> auth.uid() and m.read_at is null),
    exists (select 1 from public.blocks b where b.blocker_id = auth.uid() and b.blocked_id = o.id)
  from public.conversations c
  join public.profiles o on o.id = case when c.user_a = auth.uid() then c.user_b else c.user_a end
  left join public.providers p on p.user_id = o.id
  where auth.uid() in (c.user_a, c.user_b)
    and c.last_message_at is not null
    and not exists (select 1 from public.blocks b where b.blocker_id = o.id and b.blocked_id = auth.uid())
  order by c.last_message_at desc;
$$;

create function public.chat_peer(conv uuid)
returns table (other_id uuid, other_name text, other_photo text, i_blocked boolean)
language sql stable security definer set search_path = '' as $$
  select o.id, coalesce(p.display_name, o.display_name), p.photo_path,
    exists (select 1 from public.blocks b where b.blocker_id = auth.uid() and b.blocked_id = o.id)
  from public.conversations c
  join public.profiles o on o.id = case when c.user_a = auth.uid() then c.user_b else c.user_a end
  left join public.providers p on p.user_id = o.id
  where c.id = conv and auth.uid() in (c.user_a, c.user_b)
    and not exists (select 1 from public.blocks b where b.blocker_id = o.id and b.blocked_id = auth.uid());
$$;

revoke execute on function public.my_chats(), public.chat_peer(uuid) from public, anon;
grant execute on function public.my_chats(), public.chat_peer(uuid) to authenticated;
-- Old my_conversations()/conversation_peer() stay for now (superseded); drop them in a later cleanup.

-- Reports: the reporter can file and see their own; reading all is done by the owner in the dashboard.
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_user_id uuid references public.profiles(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete set null,
  reason text not null check (reason in ('spam', 'abuse', 'scam', 'fake', 'other')),
  details text check (details is null or char_length(details) <= 500),
  status text not null default 'new' check (status in ('new', 'reviewed', 'actioned', 'dismissed')),
  created_at timestamptz not null default now(),
  check (target_user_id is null or target_user_id <> reporter_id)
);
create index reports_status_created_idx on public.reports (status, created_at desc);
create index reports_reporter_idx on public.reports (reporter_id, created_at);

alter table public.reports enable row level security;
create policy reports_insert_own on public.reports
  for insert to authenticated with check (reporter_id = (select auth.uid()));
create policy reports_select_own on public.reports
  for select to authenticated using (reporter_id = (select auth.uid()));
revoke all on public.reports from anon, public;
grant select on public.reports to authenticated;
grant insert (reporter_id, target_user_id, conversation_id, reason, details) on public.reports to authenticated;

-- At most 10 reports per user per day.
create function public.reports_before_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.reports
      where reporter_id = new.reporter_id and created_at > now() - interval '1 day') >= 10 then
    raise exception 'rate_limited';
  end if;
  return new;
end; $$;
revoke execute on function public.reports_before_insert() from public, anon, authenticated;
create trigger reports_rate_limit
  before insert on public.reports
  for each row execute function public.reports_before_insert();

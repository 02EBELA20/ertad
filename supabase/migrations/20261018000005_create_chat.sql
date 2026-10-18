-- Stage 7: one-to-one chat (conversations + messages), Realtime, RPC helpers.

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  check (user_a < user_b),
  unique (user_a, user_b)
);
create index conversations_user_b_idx on public.conversations (user_b);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index messages_conv_created_idx on public.messages (conversation_id, created_at);
create index messages_sender_idx on public.messages (sender_id, created_at);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create policy conversations_select_participant on public.conversations
  for select to authenticated
  using ((select auth.uid()) in (user_a, user_b));

create policy messages_select_participant on public.messages
  for select to authenticated
  using (exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
      and (select auth.uid()) in (c.user_a, c.user_b)
  ));

create policy messages_insert_own on public.messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (select auth.uid()) in (c.user_a, c.user_b)
    )
  );

revoke all on public.conversations, public.messages from anon, public;
grant select on public.conversations to authenticated;
grant select on public.messages to authenticated;
grant insert (conversation_id, sender_id, body) on public.messages to authenticated;

-- Basic anti-spam: at most 20 messages per minute per sender; keeps last_message_at fresh.
create function public.messages_before_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.messages
      where sender_id = new.sender_id and created_at > now() - interval '1 minute') >= 20 then
    raise exception 'rate_limited';
  end if;
  return new;
end; $$;

create trigger messages_rate_limit
  before insert on public.messages
  for each row execute function public.messages_before_insert();

create function public.messages_after_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end; $$;

create trigger messages_touch_conversation
  after insert on public.messages
  for each row execute function public.messages_after_insert();

-- Open (or reuse) a conversation with another user.
create function public.start_conversation(other uuid)
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
  a := least(me, other);
  b := greatest(me, other);
  insert into public.conversations (user_a, user_b) values (a, b) on conflict (user_a, user_b) do nothing;
  select id into cid from public.conversations where user_a = a and user_b = b;
  return cid;
end; $$;

-- Conversation list: peer name/photo, last message, unread count.
create function public.my_conversations()
returns table (
  id uuid, other_id uuid, other_name text, other_photo text,
  last_body text, last_at timestamptz, unread integer
) language sql stable security definer set search_path = '' as $$
  select
    c.id,
    o.id,
    coalesce(p.display_name, o.display_name),
    p.photo_path,
    (select m.body from public.messages m where m.conversation_id = c.id order by m.created_at desc limit 1),
    c.last_message_at,
    (select count(*)::int from public.messages m
       where m.conversation_id = c.id and m.sender_id <> auth.uid() and m.read_at is null)
  from public.conversations c
  join public.profiles o on o.id = case when c.user_a = auth.uid() then c.user_b else c.user_a end
  left join public.providers p on p.user_id = o.id
  where auth.uid() in (c.user_a, c.user_b) and c.last_message_at is not null
  order by c.last_message_at desc;
$$;

-- Header info for one conversation (even before the first message).
create function public.conversation_peer(conv uuid)
returns table (other_id uuid, other_name text, other_photo text)
language sql stable security definer set search_path = '' as $$
  select o.id, coalesce(p.display_name, o.display_name), p.photo_path
  from public.conversations c
  join public.profiles o on o.id = case when c.user_a = auth.uid() then c.user_b else c.user_a end
  left join public.providers p on p.user_id = o.id
  where c.id = conv and auth.uid() in (c.user_a, c.user_b);
$$;

create function public.mark_conversation_read(conv uuid)
returns void language sql security definer set search_path = '' as $$
  update public.messages m set read_at = now()
  where m.conversation_id = conv and m.sender_id <> auth.uid() and m.read_at is null
    and exists (select 1 from public.conversations c
                where c.id = conv and auth.uid() in (c.user_a, c.user_b));
$$;

create function public.unread_count()
returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.messages m
  join public.conversations c on c.id = m.conversation_id
  where auth.uid() in (c.user_a, c.user_b) and m.sender_id <> auth.uid() and m.read_at is null;
$$;

revoke execute on function
  public.start_conversation(uuid), public.my_conversations(), public.conversation_peer(uuid),
  public.mark_conversation_read(uuid), public.unread_count(),
  public.messages_before_insert(), public.messages_after_insert()
  from public, anon;
grant execute on function
  public.start_conversation(uuid), public.my_conversations(), public.conversation_peer(uuid),
  public.mark_conversation_read(uuid), public.unread_count()
  to authenticated;

alter publication supabase_realtime add table public.messages;

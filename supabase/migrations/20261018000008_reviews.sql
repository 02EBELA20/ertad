-- Stage 8b: two-way reviews after a real two-sided conversation.

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  reviewee_id uuid not null references public.profiles(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 300),
  created_at timestamptz not null default now(),
  unique (conversation_id, reviewer_id),
  check (reviewer_id <> reviewee_id)
);
create index reviews_reviewee_idx on public.reviews (reviewee_id, created_at desc);

-- No direct access: everything goes through the functions below.
alter table public.reviews enable row level security;
revoke all on public.reviews from anon, public, authenticated;

-- May I review in this conversation, and did I already?
create function public.review_state(conv uuid)
returns table (eligible boolean, reviewed boolean)
language sql stable security definer set search_path = '' as $$
  select
    (not public.is_blocked_between(c.user_a, c.user_b)
      and exists (select 1 from public.messages m where m.conversation_id = c.id and m.sender_id = c.user_a)
      and exists (select 1 from public.messages m where m.conversation_id = c.id and m.sender_id = c.user_b)),
    exists (select 1 from public.reviews r where r.conversation_id = c.id and r.reviewer_id = auth.uid())
  from public.conversations c
  where c.id = conv and auth.uid() in (c.user_a, c.user_b);
$$;

create function public.submit_review(conv uuid, stars int, note text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  c record;
  other uuid;
begin
  if me is null then raise exception 'not_authenticated'; end if;
  select * into c from public.conversations where id = conv and me in (user_a, user_b);
  if not found then raise exception 'not_found'; end if;
  other := case when c.user_a = me then c.user_b else c.user_a end;
  if public.is_blocked_between(me, other) then raise exception 'blocked'; end if;
  if not (exists (select 1 from public.messages where conversation_id = conv and sender_id = c.user_a)
      and exists (select 1 from public.messages where conversation_id = conv and sender_id = c.user_b)) then
    raise exception 'not_eligible';
  end if;
  if stars < 1 or stars > 5 then raise exception 'bad_rating'; end if;
  insert into public.reviews (conversation_id, reviewer_id, reviewee_id, rating, comment)
  values (conv, me, other, stars, nullif(btrim(coalesce(note, '')), ''));
exception when unique_violation then
  raise exception 'already_reviewed';
end; $$;

create function public.provider_review_summary(uid uuid)
returns table (avg numeric, cnt int)
language sql stable security definer set search_path = '' as $$
  select round(avg(rating)::numeric, 1), count(*)::int from public.reviews where reviewee_id = uid;
$$;

create function public.provider_reviews(uid uuid)
returns table (rating int, comment text, created_at timestamptz, reviewer_name text)
language sql stable security definer set search_path = '' as $$
  select r.rating, r.comment, r.created_at, coalesce(pr.display_name, pf.display_name)
  from public.reviews r
  join public.profiles pf on pf.id = r.reviewer_id
  left join public.providers pr on pr.user_id = r.reviewer_id
  where r.reviewee_id = uid
    and not public.is_blocked_between(auth.uid(), r.reviewer_id)
  order by r.created_at desc
  limit 20;
$$;

create function public.review_summaries(ids uuid[])
returns table (user_id uuid, avg numeric, cnt int)
language sql stable security definer set search_path = '' as $$
  select reviewee_id, round(avg(rating)::numeric, 1), count(*)::int
  from public.reviews where reviewee_id = any(ids) group by reviewee_id;
$$;

revoke execute on function
  public.review_state(uuid), public.submit_review(uuid, int, text),
  public.provider_review_summary(uuid), public.provider_reviews(uuid), public.review_summaries(uuid[])
  from public, anon;
grant execute on function
  public.review_state(uuid), public.submit_review(uuid, int, text),
  public.provider_review_summary(uuid), public.provider_reviews(uuid), public.review_summaries(uuid[])
  to authenticated;

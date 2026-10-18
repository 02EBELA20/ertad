-- Stage 4: specialist (provider) profiles, their categories, and the avatars bucket.

create table public.providers (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  city text not null check (char_length(city) between 2 and 80),
  bio text not null check (char_length(bio) between 10 and 600),
  price_note text check (price_note is null or char_length(price_note) <= 60),
  contact_phone text not null check (contact_phone ~ '^\+[0-9]{8,15}$'),
  license_number text check (license_number is null or char_length(license_number) <= 60),
  photo_path text check (photo_path is null or photo_path like user_id::text || '/%'),
  visible boolean not null default true,
  allow_feed boolean not null default false,
  last_shown_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index providers_city_idx on public.providers (city);

create trigger providers_set_updated_at
  before update on public.providers
  for each row execute function public.set_updated_at();

create table public.provider_categories (
  user_id uuid not null references public.providers(user_id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  primary key (user_id, category_id)
);

create index provider_categories_category_idx on public.provider_categories (category_id);

create function public.limit_provider_categories()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select count(*) from public.provider_categories where user_id = new.user_id) >= 3 then
    raise exception 'max 3 categories per provider';
  end if;
  return new;
end; $$;

create trigger provider_categories_limit
  before insert on public.provider_categories
  for each row execute function public.limit_provider_categories();

alter table public.providers enable row level security;
alter table public.provider_categories enable row level security;

create policy providers_select on public.providers
  for select to authenticated
  using (visible or user_id = (select auth.uid()));
create policy providers_insert_own on public.providers
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy providers_update_own on public.providers
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy providers_delete_own on public.providers
  for delete to authenticated
  using (user_id = (select auth.uid()));

create policy provider_categories_select on public.provider_categories
  for select to authenticated
  using (exists (
    select 1 from public.providers p
    where p.user_id = provider_categories.user_id
      and (p.visible or p.user_id = (select auth.uid()))
  ));
create policy provider_categories_insert_own on public.provider_categories
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy provider_categories_delete_own on public.provider_categories
  for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.providers, public.provider_categories from anon, public;
grant select, delete on public.providers to authenticated;
grant insert (user_id, city, bio, price_note, contact_phone, license_number, photo_path, visible, allow_feed)
  on public.providers to authenticated;
grant update (city, bio, price_note, contact_phone, license_number, photo_path, visible, allow_feed)
  on public.providers to authenticated;
grant select, insert, delete on public.provider_categories to authenticated;

-- Avatars: public read by URL, each user writes only inside their own folder (<uid>/...).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy avatars_select_own on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatars_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatars_update_own on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatars_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

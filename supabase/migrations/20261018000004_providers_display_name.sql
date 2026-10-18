-- Stage 6: public display name on provider cards (profiles stay private to their owner).
alter table public.providers
  add column display_name text not null default '' check (char_length(display_name) <= 60);

update public.providers p
  set display_name = left(pr.display_name, 60)
  from public.profiles pr
  where pr.id = p.user_id;

grant insert (display_name) on public.providers to authenticated;
grant update (display_name) on public.providers to authenticated;

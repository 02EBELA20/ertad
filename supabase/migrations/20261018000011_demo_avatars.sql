-- Demo members use bundled illustrated avatars (photo_path = 'demo/<key>'), not Storage files.
alter table public.providers drop constraint providers_check;
alter table public.providers add constraint providers_photo_path_check
  check (photo_path is null or photo_path like user_id::text || '/%' or (is_demo and photo_path like 'demo/%'));

update public.providers set photo_path = 'demo/' || case display_name
  when 'ნინო მ.' then 'nino' when 'გიგა ბ.' then 'giga' when 'თამარ კ.' then 'tamar'
  when 'ლაშა დ.' then 'lasha' when 'მარიამ წ.' then 'mariam' when 'ზურა ს.' then 'zura'
  when 'ეკა ჯ.' then 'eka' when 'სოფო ა.' then 'sopo' when 'ნიკა ტ.' then 'nika'
  when 'დათო რ.' then 'dato' end
where is_demo and display_name in ('ნინო მ.','გიგა ბ.','თამარ კ.','ლაშა დ.','მარიამ წ.','ზურა ს.','ეკა ჯ.','სოფო ა.','ნიკა ტ.','დათო რ.');

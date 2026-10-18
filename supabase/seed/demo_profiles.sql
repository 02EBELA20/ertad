-- DEMO DATA for testing the home feed. Every row is marked providers.is_demo = true
-- (the app shows a "დემო" tag). Phone numbers are fake 555-01xx numbers, no photos.
-- Remove everything with supabase/seed/remove_demo_profiles.sql before launch.
do $$
declare
  r record;
  uid uuid;
begin
  for r in select * from (values
    ('ნინო მ.',   'care--nanny',               'ძიძა ვარ, მიყვარს ბავშვები. ვმუშაობ ქართულად და ინგლისურად, მოქნილი გრაფიკით.', 'შეთანხმებით', '+15550100001'),
    ('გიგა ბ.',   'auto--general-mechanic',    'მანქანების ზოგადი შეკეთება და დიაგნოსტიკა. შემიძლია სახლთან მოვიდე.',            '$60-დან',      '+15550100002'),
    ('თამარ კ.',  'cleaning--home-cleaning',   'სახლებისა და ბინების დასუფთავება. ვმუშაობ ზუსტად და მიმაქვს საკუთარი საშუალებები.', '$30 საათში',  '+15550100003'),
    ('ლაშა დ.',   'driver--airport',           'აეროპორტში გადაყვანა-გადმოყვანა, JFK, LGA, EWR. სუფთა მანქანა, დროული ჩამოსვლა.', 'შეთანხმებით', '+15550100004'),
    ('მარიამ წ.', 'beauty--hair',              'თმის შეჭრა და შეღებვა, სახლში ან ჩემთან. ქართულად და რუსულად ვსაუბრობ.',        '$50-დან',      '+15550100005'),
    ('ზურა ს.',   'repair--tile',              'კაფელის დაგება აბაზანასა და სამზარეულოში. ვმუშაობ ზუსტად და სუფთად.',            'შეთანხმებით', '+15550100006'),
    ('ეკა ჯ.',    'translation--ka-en',        'ქართულ-ინგლისური თარგმანი და თარჯიმნობა დოკუმენტებისა და შეხვედრებისთვის.',       '$25 საათში',  '+15550100007'),
    ('სოფო ა.',   'events-food--cakes',        'სახლის ტორტები და ტკბილეული დაბადების დღეებისა და ზეიმებისთვის.',                'შეკვეთით',    '+15550100008'),
    ('ნიკა ტ.',   'teaching--english',         'ინგლისურის გაკვეთილები ბავშვებისა და ზრდასრულებისთვის, ონლაინ ან პირისპირ.',     '$40 საათში',  '+15550100009'),
    ('დათო რ.',   'moving--home-moving',       'ბინის გადასვლა და ავეჯის გადატანა, ფურგონით და დამხმარით.',                      'შეთანხმებით', '+15550100010')
  ) as t(name, slug, bio, price, phone)
  loop
    uid := gen_random_uuid();
    insert into auth.users (id, aud, role, is_anonymous) values (uid, 'authenticated', 'authenticated', true);
    insert into public.profiles (id, display_name, city, adult_confirmed_at) values (uid, r.name, 'ბრუკლინი', now());
    insert into public.providers (user_id, display_name, city, bio, price_note, contact_phone, visible, allow_feed, is_demo)
      values (uid, r.name, 'ბრუკლინი', r.bio, r.price, r.phone, true, true, true);
    insert into public.provider_categories (user_id, category_id)
      select uid, c.id from public.categories c where c.slug = r.slug;
  end loop;

  -- three demo "I need" posts, written by the first three demo members
  insert into public.posts (author_id, category_id, city, body, budget_note)
  select p.user_id, c.id, 'ბრუკლინი', t.body, t.budget
  from (values
    ('ნინო მ.',  'driver--airport',     'ვეძებ მძღოლს, რომელიც შაბათს დილით JFK-ზე წამიყვანს.',                '$60-მდე'),
    ('გიგა ბ.',  'translation--ka-en',  'მჭირდება დოკუმენტის თარგმანი ქართულიდან ინგლისურად, 2 გვერდი.',          'შეთანხმებით'),
    ('თამარ კ.', 'repair--tile',        'მჭირდება აბაზანის კაფელის შეკეთება, პატარა ფართობია.',                    null)
  ) as t(name, slug, body, budget)
  join public.providers p on p.display_name = t.name and p.is_demo
  join public.categories c on c.slug = t.slug;
end $$;

-- Illustrated avatars bundled in the app (see src/lib/demoAvatars.ts)
update public.providers set photo_path = 'demo/' || case display_name
  when 'ნინო მ.' then 'nino' when 'გიგა ბ.' then 'giga' when 'თამარ კ.' then 'tamar'
  when 'ლაშა დ.' then 'lasha' when 'მარიამ წ.' then 'mariam' when 'ზურა ს.' then 'zura'
  when 'ეკა ჯ.' then 'eka' when 'სოფო ა.' then 'sopo' when 'ნიკა ტ.' then 'nika'
  when 'დათო რ.' then 'dato' end
where is_demo and photo_path is null;
